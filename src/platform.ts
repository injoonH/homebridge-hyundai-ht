import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge'
import { LightAccessory } from './accessories/light.js'
import { type Device, HT, type HTConfig } from './ht.js'
import { None, type Option, Some } from './lib/rust.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

interface HTAccessoryContext {
  device: Device
}
export type HTPlatformAccessory = PlatformAccessory<HTAccessoryContext>

export class HyundaiHTPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic

  public readonly accessories: Map<string, HTPlatformAccessory> = new Map()
  public readonly discoveredCacheUUIDs: Set<string> = new Set()

  private readonly config: Option<HTConfig>
  public readonly ht: Option<HT>

  constructor(
    public readonly log: Logging,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic

    this.config = this.configureHTConfig(config)
    this.ht = this.config.map((cfg) => new HT(this.log, cfg))

    this.log.debug('Finished initializing platform:', config.name)

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback')
      await this.discoverDevices()
    })
  }

  configureHTConfig(config: PlatformConfig): Option<HTConfig> {
    const { id, password, deviceStateRefreshInterval } = config
    if (!id || !password || !deviceStateRefreshInterval) {
      return None()
    }
    return Some({ id, password, deviceStateRefreshInterval })
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)
    this.accessories.set(accessory.UUID, accessory as HTPlatformAccessory) // FIXME: Do not use `as` here
  }

  async discoverDevices(): Promise<void> {
    if (this.ht.isNone()) {
      this.log.error('Cannot discover devices: The plugin is not configured properly.')
      return
    }
    const devices = await this.ht.unwrap().getDevices()
    if (devices.isErr()) {
      this.log.error(devices.unwrapErr().message)
      return
    }

    for (const device of devices.unwrap()) {
      // TODO: Support more device types
      if (device.deviceType !== 'light') {
        continue
      }

      const uuid = this.api.hap.uuid.generate(device.id)
      const existingAccessory = this.accessories.get(uuid)

      if (existingAccessory) {
        this.restoreAccessary(existingAccessory)
      } else {
        this.registerAccessary(device, uuid)
      }

      this.discoveredCacheUUIDs.add(uuid)
    }

    this.removeUnpresentAccessaries()
  }

  private createAccessary(device: Device, uuid: string): PlatformAccessory<HTAccessoryContext> {
    const accessory = new this.api.platformAccessory<HTAccessoryContext>(device.displayName, uuid)
    accessory.context.device = device
    return accessory
  }

  private registerAccessary(device: Device, uuid: string): void {
    this.log.info('Registering accessory for device:', device.displayName)
    const accessory = this.createAccessary(device, uuid)
    new LightAccessory(this, this.ht.unwrap(), accessory, this.config.unwrap().deviceStateRefreshInterval)
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
  }

  private restoreAccessary(accessary: HTPlatformAccessory): void {
    this.log.info('Restoring existing accessory from cache:', accessary.displayName)
    new LightAccessory(this, this.ht.unwrap(), accessary, this.config.unwrap().deviceStateRefreshInterval)
  }

  private removeUnpresentAccessaries(): void {
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.has(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName)
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
      }
    }
  }
}
