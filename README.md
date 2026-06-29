# Cockpit Battery Monitor

A Cockpit module that displays comprehensive battery statistics.

## Compatibility

- Any Linux distribution with Cockpit and a battery. (I'm pretty sure)

## Features

**Real-time Battery Monitoring**
- Live battery percentage with color-coded indicators
- Current charge status (Charging/Discharging/Full)
- Voltage and power usage monitoring

**Battery Health Analysis**
- Overall battery health percentage
- Design vs. current capacity comparison
- Health degradation warnings
- Battery wear assessment

**Battery History**
- Track last 30 battery readings
- Timestamp for each reading

**Device Information**
- Manufacturer and model details
- Serial number
- Battery technology type (Li-ion, etc.)
- Charge cycle count

## Screenshots

### Battery Status Card

Displays important information at a glance:

![Battery Status Card](screenshots/battery-status.png)

Key elements visible:
- **Battery Percentage**: Large circular indicator showing current charge percentage
- **Status Badge**: Shows current status (Full, Charging, Discharging)
- **Quick Stats**: Current charge, capacity, voltage, and power usage

### Battery Health Information

![Battery Health](screenshots/battery-health.png)

Details displayed:
- Battery health percentage
- Design vs. current capacity comparison
- Health degradation indicators
- Design capacity
- Current capacity
- Battery wear assessment

- ### Device Information

![Device Information](screenshots/device-info.png)

Details displayed:
- Manufacturer: Hewlett-Packard
- Model: PABAS0241231
- Serial Number: 41167
- Battery Technology: Li-ion
- Charge Cycles: 0
- Battery Device: BAT1

## Installation

### Quick Install

```bash
# Clone the repository
git clone https://github.com/terazik-mubaloo/cockpit-battery-monitor.git

# Install
cd cockpit-battery-monitor
sudo bash install.sh
```

### Manual Install

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Usage

1. Open Cockpit in your web browser (usually `https://localhost:9090`)
2. Log in with your credentials
3. In the sidebar under "Tools", click **"Battery Monitor"**

The dashboard updates automatically every 30 seconds.

## Troubleshooting

### Blank Page

If you see a blank page:

1. **Check browser console** (F12) for errors
2. **Verify file permissions:**
   ```bash
   ls -la /usr/share/cockpit/battery-monitor/
   ```
3. **Check Cockpit logs:**
   ```bash
   sudo journalctl -u cockpit -f
   ```
4. **Restart Cockpit:**
   ```bash
   sudo systemctl restart cockpit
   ```

### Battery Device Not Found

If battery information is not showing:

1. **Check available battery devices:**
   ```bash
   ls /sys/class/power_supply/
   ```
2. **Verify battery access:**
   ```bash
   cat /sys/class/power_supply/BAT0/capacity
   ```
3. **Update `battery.js`** with the correct battery device name

### Module Not Appearing in Sidebar

1. **Verify installation location:**
   ```bash
   ls /usr/share/cockpit/battery-monitor/
   ```
2. **Check manifest.json** is properly formatted
3. **Restart Cockpit** and refresh browser

## Known Limitations

- Requires `/sys/class/power_supply/` to be accessible (standard on most Linux systems)
- Some laptops may not provide all battery metrics (time estimates may show as "N/A")
- Battery device naming varies by manufacturer (auto-detection handles most cases)

## Contributing

For issues, or suggestions, please open an issue on GitHub.
If you want to make your own plugin for Cockpit, go [here!](https://cockpit-project.org/blog/creating-plugins-for-the-cockpit-user-interface.html)

## License

This project is licensed under the GPL v.3.0 license, but includes files also licensed under the MIT license - see the [LICENSE](LICENSE) file for details.

`SPDX-License-Identifier: MIT AND GPL-3.0-or-later`

**Note:** This is a community project and is not officially affiliated with the Cockpit project.
