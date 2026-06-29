// GNU General Public License
// Copyright (c) 2026 Razla
//
// This file is part of Cockpit Battery Monitor.
//
// Cockpit Battery Monitor is free: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Cockpit Battery Monitor is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with Cockpit Battery Monitor. If not, see https://www.gnu.org/licenses/.
//
// Cockpit Battery Monitor incorporates work covered by the following copyright and
// permission notice:
//
//     MIT License
//     Copyright (c) 2025 Rishu Patel
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy
//     of this software and associated documentation files (the "Software"), to deal
//     in the Software without restriction, including without limitation the rights
//     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//     copies of the Software, and to permit persons to whom the Software is
//     furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
//     copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//     SOFTWARE.


// Battery data history
let batteryHistory = {
  entries: [],
  maxEntries: 30
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  updateBatteryMonitor();
  setInterval(updateBatteryMonitor, 30000);
});

// Function to read battery files
function readBatteryFile(path) {
  return cockpit.spawn(["cat", path])
  .then(output => {
    // Handle success
    return output.trim();
  })
  .catch(error => {
    // Properly handle error - prevents zombie
    console.warn("Error:", error);
    return null;
  })
  .finally(() => {
    // Cleanup if needed
  })
}

// Function to format time
function formatTime(seconds) {
  if (!seconds || seconds < 0) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return hours + "h " + minutes + "m";
  }
  return minutes + "m";
}

// Function to get health status
function getHealthStatus(health) {
  if (health >= 95) return "Excellent";
  if (health >= 80) return "Good";
  if (health >= 60) return "Fair";
  return "Poor";
}

// Function to create circular progress
function createCircularProgress(capacity) {
  const percent = parseInt(capacity);
  let cssClass = 'high';

  if (percent < 20) cssClass = 'low';
  else if (percent < 50) cssClass = 'medium';

  return `
  <div class="circular-progress ${cssClass}">
  <div class="circular-progress-inner">
  <div>${percent}%</div>
  </div>
  </div>
  `;
}

// Function to get status badge
function getStatusBadge(status) {
  let badgeClass = 'status-full';
  let icon = '';

  if (status === 'Charging') {
    badgeClass = 'status-charging';
    icon = '⬆️ ';
  } else if (status === 'Discharging') {
    badgeClass = 'status-discharging';
    icon = '⬇️ ';
  }

  return `<span class="status-badge ${badgeClass}">${icon}${status}</span>`;
}

// Main function to update battery monitor
async function updateBatteryMonitor() {
  try {
    let batteryBasePath = "/sys/class/power_supply/BAT1";
    let batteryBaseName = "BAT1";

    // Check whether BAT1 exists. If not, switches to BAT0.
    if ( await readBatteryFile(batteryBasePath + "/status") == null ) {
      batteryBasePath = "/sys/class/power_supply/BAT0";
      batteryBaseName = "BAT0";
    }

    // Read all available battery information
    const capacity = await readBatteryFile(batteryBasePath + "/capacity");
    const status = await readBatteryFile(batteryBasePath + "/status");
    const chargeNow = await readBatteryFile(batteryBasePath + "/charge_now");
    const chargeFull = await readBatteryFile(batteryBasePath + "/charge_full");
    const chargeFullDesign = await readBatteryFile(batteryBasePath + "/charge_full_design");
    const voltageNow = await readBatteryFile(batteryBasePath + "/voltage_now");
    const currentNow = await readBatteryFile(batteryBasePath + "/current_now");
    const manufacturer = await readBatteryFile(batteryBasePath + "/manufacturer");
    const modelName = await readBatteryFile(batteryBasePath + "/model_name");
    const serialNumber = await readBatteryFile(batteryBasePath + "/serial_number");
    const technology = await readBatteryFile(batteryBasePath + "/technology");
    let cycleCount = await readBatteryFile(batteryBasePath + "/cycle_count");
    const timeToEmpty = await readBatteryFile(batteryBasePath + "/time_to_empty_now");
    const timeToFull = await readBatteryFile(batteryBasePath + "/time_to_full_now");
    const batteryName = await readBatteryFile(batteryBasePath + "hwmon*/name");

    // Check if cycleCount is 0. If so sets to N/A (Since for the vast majority of the time, the battery not having had a cycle means it just can't read it.)
    if (cycleCount==0){
      cycleCount='N/A'
    }

    // Update battery history
    if (capacity) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      batteryHistory.entries.unshift({
        time: timeStr,
        percent: parseInt(capacity)
      });

      if (batteryHistory.entries.length > batteryHistory.maxEntries) {
        batteryHistory.entries.pop();
      }
    }

    // Calculate health
    let health = 100;
    if (chargeFullDesign && chargeFull) {
      const cFullDesign = parseInt(chargeFullDesign);
      const cFull = parseInt(chargeFull);
      health = ((cFull / cFullDesign) * 100).toFixed(1);
    }

    // Calculate power
    let power = 0;
    if (currentNow && voltageNow) {
      const current = parseInt(currentNow);
      const voltage = parseInt(voltageNow);
      power = (current / 1000000) * (voltage / 1000000);
    }

    // Calculate time estimates
    let estimatedTimeToEmpty = "N/A";
    let estimatedTimeToFull = "N/A";

    if (status === "Discharging" && timeToEmpty) {
      estimatedTimeToEmpty = formatTime(parseInt(timeToEmpty));
    }
    if (status === "Charging" && timeToFull) {
      estimatedTimeToFull = formatTime(parseInt(timeToFull));
    }

    // Determine health status
    const healthStatus = getHealthStatus(health);

    // Build HTML
    let html = '';

    // Main Status Card
    html += `
    <div class="battery-card">
    <div class="card-title">Battery Status</div>
    <div class="battery-percentage-container">
    ${createCircularProgress(capacity)}
    <div class="battery-info-section">
    <div class="info-item">
    <span class="info-label">Status:</span>
    <span class="info-value">${getStatusBadge(status)}</span>
    </div>
    <div class="info-item">
    <span class="info-label">Current:</span>
    <span class="info-value">${chargeNow ? (parseInt(chargeNow) / 1000000).toFixed(2) : 'N/A'} Ah</span>
    </div>
    <div class="info-item">
    <span class="info-label">Capacity:</span>
    <span class="info-value">${chargeFull ? (parseInt(chargeFull) / 1000000).toFixed(2) : 'N/A'} Ah</span>
    </div>
    <div class="info-item">
    <span class="info-label">Voltage:</span>
    <span class="info-value">${voltageNow ? (parseInt(voltageNow) / 1000000).toFixed(2) : 'N/A'} V</span>
    </div>
    <div class="info-item">
    <span class="info-label">Power Usage:</span>
    <span class="info-value">${power.toFixed(2)} W</span>
    </div>
    </div>
    </div>

    ${estimatedTimeToEmpty !== "N/A" ? `
      <div class="time-estimate">
      ⏱️ Estimated time remaining: ${estimatedTimeToEmpty}
      </div>
      ` : ''}

      ${estimatedTimeToFull !== "N/A" ? `
        <div class="time-estimate">
        ⏱️ Estimated time to full: ${estimatedTimeToFull}
        </div>
        ` : ''}

        ${parseInt(capacity) < 20 ? `
          <div class="critical-box">
          ⚠️ Low battery! Please charge your device soon.
          </div>
          ` : parseInt(capacity) < 50 ? `
          <div class="warning-box">
          ℹ️ Battery is below 50%. Consider charging soon.
          </div>
          ` : `
          <div class="success-box">
          ✓ Battery is in good condition.
          </div>
          `}

          <div class="last-update">Last updated: ${new Date().toLocaleTimeString()}</div>
          </div>
          `;

          // Battery Health Card
          html += `
          <div class="battery-card">
          <div class="card-title">Battery Health</div>
          <div class="info-item">
          <span class="info-label">Health Status:</span>
          <span class="info-value">${health}% - ${healthStatus}</span>
          </div>
          <div class="health-bar">
          <div class="health-fill ${health < 60 ? 'critical' : health < 80 ? 'warning' : ''}" style="width: ${health}%"></div>
          </div>

          <div style="margin-top: 20px;">
          <div class="info-label">Design Capacity:</div>
          <span class="info-value">${chargeFullDesign ? (parseInt(chargeFullDesign) / 1000000).toFixed(2) : 'N/A'} Ah</span>
          </div>

          <div style="margin-top: 15px;">
          <div class="info-label">Current Capacity:</div>
          <span class="info-value">${chargeFull ? (parseInt(chargeFull) / 1000000).toFixed(2) : 'N/A'} Ah</span>
          </div>

          ${health < 80 ? `
            <div class="warning-box">
            ⚠️ Battery health is degrading. Consider battery replacement soon.
            </div>
            ` : health < 95 ? `
            <div class="warning-box">
            ℹ️ Battery has normal wear. Performance may decrease over time.
            </div>
            ` : `
            <div class="success-box">
            ✓ Battery health is excellent!
            </div>
            `}
            </div>
            `;

            // Battery Information Card
            html += `
            <div class="battery-card">
            <div class="card-title">Device Information</div>
            <div class="device-info-grid">
            <div class="device-info-item">
            <div class="device-info-label">Manufacturer</div>
            <div class="device-info-value">${manufacturer || 'N/A'}</div>
            </div>
            <div class="device-info-item">
            <div class="device-info-label">Model</div>
            <div class="device-info-value">${modelName || 'N/A'}</div>
            </div>
            <div class="device-info-item">
            <div class="device-info-label">Serial Number</div>
            <div class="device-info-value">${serialNumber || 'N/A'}</div>
            </div>
            <div class="device-info-item">
            <div class="device-info-label">Technology</div>
            <div class="device-info-value">${technology || 'N/A'}</div>
            </div>
            <div class="device-info-item">
            <div class="device-info-label">Charge Cycles</div>
            <div class="device-info-value">${cycleCount || 'N/A'}</div>
            </div>
            <div class="device-info-item">
            <div class="device-info-label">Battery Device</div>
            <div class="device-info-value">${batteryName || 'N/A'}</div>
            </div>
            </div>
            </div>
            `;

            // Battery History Card
            html += `
            <div class="battery-card">
            <div class="card-title">Battery History (Last 30 readings)</div>
            <div class="battery-history-container">
            ${batteryHistory.entries.map(entry => `
              <div class="history-entry">
              <span class="history-time">${entry.time}</span>
              <span class="history-percent">${entry.percent}%</span>
              </div>
              `).join('')}
              </div>
              </div>
              `;

              // Update the page
              const elem = document.getElementById("battery-info");
              if (elem) {
                elem.innerHTML = html;
                console.log("Battery info updated successfully at " + new Date().toLocaleTimeString());
              } else {
                console.error("Element 'battery-info' not found in DOM!");
              }

  } catch (error) {
    console.error("Error updating battery monitor:", error);
    const elem = document.getElementById("battery-info");
    if (elem) {
      elem.innerHTML = `
      <div class="battery-card">
      <p class="loading-text"><strong>Error:</strong> ${error.message}</p>
      </div>
      `;
    }
  }
}
