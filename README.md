<div align="center">
  <a href="https://hyundaiht.co.kr">
    <img alt="Hyundai HT Brand Mark" src="https://hyundaiht.co.kr/kr/images/content/brand_logo_pink.png" height="64">
  </a>
  <h1>Homebridge Hyundai HT</h1>

  <a href="https://www.npmjs.com/package/homebridge-hyundai-ht">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/homebridge-hyundai-ht?style=for-the-badge&labelColor=000">
  </a>
  <a href="https://github.com/injoonH/homebridge-hyundai-ht/blob/latest/LICENSE">
    <img alt="Apache 2.0 License" src="https://img.shields.io/npm/l/homebridge-hyundai-ht?style=for-the-badge&labelColor=000">
  </a>
  <a href="https://github.com/injoonH/homebridge-hyundai-ht/actions">
    <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/injoonH/homebridge-hyundai-ht/build.yaml?style=for-the-badge&labelColor=000">
  </a>
</div>

## Getting Started

This is a [Homebridge](https://homebridge.io) plugin that allows you to control Hyundai HT Smart Home services.

### Usage

1. Sign up for a Hyundai HT account from the [Hyundai HT Home Service website](https://www2.hthomeservice.com).
2. Install the plugin using `hb-service` command:

   ```sh
   hb-service add homebridge-hyundai-ht
   ```

3. Open the Homebridge UI and configure the plugin:

    - **ID**: Hyundai HT account id
    - **Password**: Hyundai HT account password
    - **Device State Refresh Interval**: Interval in seconds to refresh device state

4. Restart Homebridge.
5. Now you can control your Hyundai HT devices from HomeKit.

## Supported Devices

As my apartment only includes a few Hyundai HT devices, I've only been able to test the plugin with those.
If you have other supported devices, please open an issue or pull request.

### Legend

✅ Supported 🛠 Planned ❌ Not Planned

| Devices         | Status |
|-----------------|--------|
| Light           | ✅      |
| Heater          | 🛠     |
| Ventilator      | 🛠     |
| Gas             | 🛠     |
| Fan             | ❌      |
| Induction       | ❌      |
| Multi Switch    | ❌      |
| Wall Socket     | ❌      |
| Air Conditioner | ❌      |
| Cooktop         | ❌      |
| Curtain         | ❌      |
| Switch          | ❌      |

## License

This project is licensed under the Apache 2.0 License — see the [LICENSE](LICENSE) file for details.
