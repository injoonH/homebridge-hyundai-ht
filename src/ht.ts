import { Logging } from 'homebridge'
import ky, { type KyInstance, type KyRequest, type KyResponse, type NormalizedOptions } from 'ky'
import AES from 'crypto-js/aes.js'
import { Err, None, Ok, type Option, type Result, Some } from './lib/rust.js'

export interface HTConfig {
  id: string
  password: string
  deviceStateRefreshInterval: number
}

export type DeviceType =
  | 'fan'
  | 'induction'
  | 'multi_switch'
  | 'wallsocket'
  | 'light'
  | 'gas'
  | 'aircon'
  | 'heating'
  | 'cooktop'
  | 'curtain'
  | 'switch'

export interface Device {
  id: string
  displayName: string
  deviceType: DeviceType
  deviceLocation: string
}

interface HouseholdInfo {
  siteId: string
  dong: string
  ho: string
}

interface Danji {
  siteId: string
  siteName: string
  siteAddress: string
  dong: string
  ho: string
  isApproved: boolean
  homepageDomain: string
}

interface GetHouseholdResponse {
  resultData: {
    danjiList: Danji[]
  }
}

interface DiscoverDevicesResponse {
  data: {
    deviceList: {
      id: string
      deviceType: DeviceType
      deviceLocation: string
    }[]
  }
}

interface LoginError {
  errorCode: number
  errorMessage: string
  resultData?: {
    loginFailCount: number
  }
}

export class HT {
  private accessToken: Option<string>
  public client: KyInstance

  constructor(
    private readonly logger: Logging,
    private readonly config: HTConfig,
  ) {
    this.accessToken = None()

    this.client = ky.create({
      prefixUrl: 'https://www2.hthomeservice.com',
      hooks: {
        beforeRequest: [
          async (request) => {
            request.headers.set('Cookie', this.accessToken.unwrapOr(''))
          },
        ],
        afterResponse: [
          async (request, options, response) => {
            if (response.ok) {
              return response
            }
            if (response.status === 401) {
              return this.retryUnauthenticatedRequest(request, options, response)
            }
            return response
          },
        ],
      },
      throwHttpErrors: false,
    })
  }

  private encryptCredential(credential: string): string {
    return AES.encrypt(credential, 'hTsEcret').toString()
  }

  private extractTokenFromHeader(header: Headers): Option<string> {
    const firstCookie = header.getSetCookie()[0]
    if (firstCookie) {
      return Some(firstCookie.split(';')[0]!) // The result cannot be an empty array
    }
    return None()
  }

  private async getAccessToken(): Promise<Result<string, Error>> {
    this.logger.info('Logging in to get access token')
    const res = await this.client.post('login', {
      json: {
        id: this.encryptCredential(this.config.id),
        password: this.encryptCredential(this.config.password),
        rememberMe: false,
      },
    })
    if (res.ok) {
      const token = this.extractTokenFromHeader(res.headers)
      return token.okOr(new Error('There is no access token in the response header'))
    }
    const loginError = await res.json<LoginError>()
    return this.handleLoginFailure(loginError)
  }

  private handleLoginFailure({ errorCode, resultData }: LoginError): Result<never, Error> {
    let message = 'Failed to login due to an unexpected error.'
    switch (errorCode) {
      case 104:
        message = 'Incorrect ID or password.'
        if (resultData) {
          message += ` Login will be temporarily locked for 5 minutes after 5 failed attempts. (${resultData.loginFailCount}/5)`
        }
        break
      case 107:
        message = 'Access denied. You are not authorized to log in with these credentials.'
        break
      case 108:
        message = 'Unusual login activity detected. Please wait 5 minutes before trying again.'
    }
    return Err(new Error(message))
  }

  private async getPermissionForDanji({ siteId, dong, ho }: HouseholdInfo): Promise<Result<null, Error>> {
    const res = await this.client.post('getctoctoken', {
      json: { siteId, dong, ho, clientId: 'HT-WEB' },
    })
    return res.ok ? Ok(null) : Err(new Error('Failed to update access token'))
  }

  private async getHouseholdDanji(): Promise<Result<Danji, Error>> {
    const res = await this.client.get<GetHouseholdResponse>('proxy/bearer/api/v1/user/danji/household')
    if (!res.ok) {
      return Err(new Error(`Failed to fetch household information: ${res.status} ${res.statusText}.`))
    }
    const { resultData } = await res.json()
    const danji = resultData.danjiList.find((it) => it.isApproved)
    return danji ? Ok(danji) : Err(new Error('No approved household found'))
  }

  private accessTokenRefreshFailure(cause: Error): Error {
    return new Error(`Failed to refresh access token: ${cause.message}`, { cause })
  }

  private async refreshAccessToken(): Promise<Result<null, Error>> {
    const accessToken = await this.getAccessToken()
    if (accessToken.isErr()) {
      return Err(this.accessTokenRefreshFailure(accessToken.unwrapErr()))
    }
    this.accessToken = accessToken.ok()

    const danji = await this.getHouseholdDanji()
    if (danji.isErr()) {
      return Err(this.accessTokenRefreshFailure(danji.unwrapErr()))
    }

    const { siteId, dong, ho } = danji.unwrap()
    const promotion = await this.getPermissionForDanji({ siteId, dong, ho })
    if (promotion.isErr()) {
      return Err(this.accessTokenRefreshFailure(promotion.unwrapErr()))
    }

    return Ok(null)
  }

  private async retryUnauthenticatedRequest(
    request: KyRequest,
    options: NormalizedOptions,
    response: KyResponse,
  ): Promise<KyResponse> {
    this.logger.info('Access token expired, refreshing...')
    const refreshRes = await this.refreshAccessToken()
    if (refreshRes.isErr()) {
      this.logger.error(refreshRes.unwrapErr().message)
      return response
    }
    this.logger.info('Finished refreshing access token successfully')
    return ky(request, {
      ...options,
      headers: {
        ...options.headers,
        Cookie: this.accessToken.unwrapOr(''),
      },
    })
  }

  async getDevices(): Promise<Result<Device[], Error>> {
    const res = await this.client.get<DiscoverDevicesResponse>('proxy/ctoc/devices')
    if (!res.ok) {
      return Err(new Error(`Failed to fetch devices: ${res.status} ${res.statusText}.`))
    }
    const { data } = await res.json()
    return Ok(
      data.deviceList.map((device) => ({
        ...device,
        displayName: `${device.deviceLocation} ${device.deviceType}`,
      })),
    )
  }
}
