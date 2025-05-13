import { Logging } from 'homebridge';
import ky, { type KyInstance } from 'ky';
import AES from 'crypto-js/aes.js';

export interface HTConfig {
  id: string;
  password: string;
  deviceStateRefreshInterval: number;
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
  id: string,
  displayName: string,
  deviceType: DeviceType,
  deviceLocation: string,
}

interface GetC2CTokenResponse {
  siteId: string
  dong: string
  ho: string
  clientId: string
  accessToken: string
  refreshToken: string
  siteName: string
  preGarbageToken: string
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
  danjiList: Danji[]
}

interface DiscoverDevicesResponse {
  data: {
    deviceList: {
      id: string,
      deviceType: DeviceType,
      deviceLocation: string,
    }[],
  }
}

export class HT {
  private accessToken: string;
  public client: KyInstance;

  constructor(
    private readonly logger: Logging,
    private readonly config: HTConfig,
  ) {
    this.accessToken = '';

    this.client = ky.create({
      prefixUrl: 'https://www2.hthomeservice.com',
      retry: {
        statusCodes: [401, 408, 413, 429, 500, 502, 503, 504],
      },
      hooks: {
        beforeRequest: [
          async (request) => {
            if (request.url !== 'https://www2.hthomeservice.com/login') {
              request.headers.set('Cookie', this.accessToken);
            }
          },
        ],
        beforeRetry: [
          async ({ request }) => {
            if (request.url !== 'https://www2.hthomeservice.com/login') {
              await this.refreshAccessToken();
              request.headers.set('Cookie', this.accessToken);
            }
          },
        ],
      },
    });
  }

  private encryptCredential(credential: string): string {
    return AES.encrypt(credential, 'hTsEcret').toString();
  }

  private extractTokenFromHeader(header: Headers): string {
    return header.getSetCookie()[0].split(';')[0];
  }

  private async getAccessToken(): Promise<string> {
    this.logger.info('Logging in to get access token');

    const res = await this.client.post('login', {
      json: {
        id: this.encryptCredential(this.config.id),
        password: this.encryptCredential(this.config.password),
        rememberMe: false,
      },
    });
    return this.extractTokenFromHeader(res.headers);
  }

  private async getC2CToken(householdInfo: { siteId: string, dong: string, ho: string }): Promise<{
    token: string,
    data: GetC2CTokenResponse
  }> {
    const res = await this.client.post('getctoctoken', {
      json: {
        clientId: 'HT-WEB',
        siteId: householdInfo.siteId,
        dong: householdInfo.dong,
        ho: householdInfo.ho,
      },
    });
    const token = this.extractTokenFromHeader(res.headers);
    const { resultData } = await res.json<{ resultData: GetC2CTokenResponse }>();
    return { token, data: resultData };
  }

  private async getHousehold(): Promise<GetHouseholdResponse> {
    const res = await this.client.get('proxy/bearer/api/v1/user/danji/household').json<{resultData: GetHouseholdResponse}>();
    return res.resultData;
  }

  private async refreshAccessToken(): Promise<void> {
    this.logger.info('Refreshing access token');

    this.accessToken = await this.getAccessToken();

    const { danjiList } = await this.getHousehold();
    if (danjiList.length === 0) {
      throw new Error('No household found');
    }
    const { siteId, dong, ho } = danjiList[0];

    await this.getC2CToken({ siteId, dong, ho });
    this.logger.info('Finished refreshing access token successfully');
  }

  async getDevices(): Promise<Device[]> {
    const res = await this.client.get('proxy/ctoc/devices').json<DiscoverDevicesResponse>();
    return res.data.deviceList.map((device) => ({
      ...device,
      displayName: `${device.deviceLocation} ${device.deviceType}`,
    }));
  }
}
