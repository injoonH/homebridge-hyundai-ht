import type { CharacteristicValue, Service } from 'homebridge'
import type { HTPlatformAccessory, HyundaiHTPlatform } from '../platform.js'
import type { HT } from '../ht.js'
import { Err, Ok, type Result } from '../lib/rust.js'

type LightPower = 'on' | 'off'

interface LightStatus {
  command: 'power'
  value: LightPower
}

interface LightDetail {
  id: string
  deviceType: 'light'
  statusList: LightStatus[]
}

export class LightAccessory {
  private readonly deviceId: string
  private readonly service: Service

  constructor(
    private readonly platform: HyundaiHTPlatform,
    private readonly ht: HT,
    private readonly accessory: HTPlatformAccessory,
    private readonly stateRefreshInterval: number,
  ) {
    this.deviceId = this.accessory.context.device.id

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Hyundai HT')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.displayName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId)

    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb)

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName)

    this.service.getCharacteristic(this.platform.Characteristic.On).onSet(this.setOn.bind(this))

    setInterval(async () => {
      const isOn = await this.isLightTurnedOn()
      if (isOn.isErr()) {
        this.platform.log.error(isOn.unwrapErr().message)
        return
      }
      isOn.inspect((it) => {
        this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(it)
        this.platform.log.debug(`Checked ${this.accessory.displayName} is ${it ? 'on' : 'off'}`)
      })
    }, this.stateRefreshInterval * 1_000)
  }

  private async setOn(value: CharacteristicValue): Promise<void> {
    this.platform.log.debug('Set Characteristic On ->', value)
    const power = value ? 'on' : 'off'
    await this.setLightPower(power)
  }

  private async getLightDetail(): Promise<Result<LightDetail, Error>> {
    const res = await this.ht.client.get<{ data: LightDetail }>(`proxy/ctoc/lights/${this.deviceId}`)
    if (res.ok) {
      const { data } = await res.json()
      return Ok(data)
    }
    return Err(new Error(`Failed to fetch light detail: ${res.status} ${res.statusText}.`))
  }

  private async isLightTurnedOn(): Promise<Result<boolean, Error>> {
    const detail = await this.getLightDetail()
    return detail.map((it) => {
      const status = it.statusList[0]! // There must be at least one status
      return status.value === 'on'
    })
  }

  private async setLightPower(state: LightPower): Promise<void> {
    await this.ht.client.put(`proxy/ctoc/lights/${this.deviceId}`, {
      json: {
        commandList: [{ command: 'power', value: state }],
      },
    })
  }
}
