import type { CharacteristicValue, Service } from 'homebridge';
import type { HTPlatformAccessory, HyundaiHTPlatform } from '../platform.js';

type LightPower = 'on' | 'off';

interface LightStatus {
  command: 'power',
  value: LightPower
}

interface LightDetail {
  id: string,
  deviceType: 'light',
  statusList: LightStatus[],
}

export class LightAccessory {
  private readonly deviceId: string;
  private readonly service: Service;

  constructor(
    private readonly platform: HyundaiHTPlatform,
    private readonly accessory: HTPlatformAccessory,
    private readonly stateRefreshInterval: number,
  ) {
    this.deviceId = this.accessory.context.device.id;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Hyundai HT')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.displayName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this));

    setInterval(async () => {
      const isOn = await this.isLightTurnedOn();
      this.service.getCharacteristic(this.platform.Characteristic.On).updateValue(isOn);
      this.platform.log.debug(`Checked ${this.accessory.displayName} is ${isOn ? 'on' : 'off'}`);
    }, this.stateRefreshInterval * 1_000);
  }

  private async setOn(value: CharacteristicValue): Promise<void> {
    this.platform.log.debug('Set Characteristic On ->', value);
    const power = value ? 'on' : 'off';
    await this.setLightPower(power);
  }

  private async getLightDetail(): Promise<LightDetail> {
    const res = await this.platform.ht.client.get(`proxy/ctoc/lights/${this.deviceId}`).json<{ data: LightDetail }>();
    return res.data;
  }

  private async isLightTurnedOn(): Promise<boolean> {
    const detail = await this.getLightDetail();
    // TODO: Assert that detail.statusList.length === 1
    return detail.statusList[0].value === 'on';
  }

  private async setLightPower(state: LightPower): Promise<void> {
    await this.platform.ht.client.put(`proxy/ctoc/lights/${this.deviceId}`, {
      json: {
        commandList: [
          { command: 'power', value: state },
        ],
      },
    });
  }
}
