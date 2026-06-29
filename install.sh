#!/bin/bash

#############################################################################
# GNU General Public License
# Copyright (c) 2026 Razla
#
# This file is part of Cockpit Battery Monitor.
#
# Cockpit Battery Monitor is free: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
#
# Cockpit Battery Monitor is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with Cockpit Battery Monitor. If not, see https://www.gnu.org/licenses/.
#
# Cockpit Battery Monitor incorporates work covered by the following copyright and
# permission notice:
#
#     MIT License
#     Copyright (c) 2025 Rishu Patel
#
#     Permission is hereby granted, free of charge, to any person obtaining a copy
#     of this software and associated documentation files (the "Software"), to deal
#     in the Software without restriction, including without limitation the rights
#     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
#     copies of the Software, and to permit persons to whom the Software is
#     furnished to do so, subject to the following conditions:
#
#     The above copyright notice and this permission notice shall be included in all
#     copies or substantial portions of the Software.
#
#     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
#     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
#     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
#     SOFTWARE.
#
#
#############################################################################
# Cockpit Battery Monitor - Installation Script
#
# This script automates the installation of the Cockpit Battery Monitor
# module for Ubuntu Server and other Linux distributions with Cockpit.
#
# Usage: sudo bash install.sh
#############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Module information
MODULE_NAME="battery-monitor"
MODULE_DIR="/usr/share/cockpit/battery-monitor"
REQUIRED_FILES=("manifest.json" "index.html" "battery.js" "battery-style.css")
VERSION="2.0.0"

# Installer info
INSTALLED=false

#############################################################################
# Functions
#############################################################################

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check if Cockpit is installed
check_cockpit() {
    print_info "Checking if Cockpit is installed..."
    
    if ! command -v cockpit-bridge &> /dev/null; then
        print_error "Cockpit is not installed"
        echo ""
        echo "To install Cockpit, run:"
        echo "  sudo apt-get update && sudo apt-get install cockpit"
        exit 1
    fi
    
    print_success "Cockpit is installed"
}

# Check if Cockpit service is running
check_cockpit_running() {
    print_info "Checking if Cockpit service is running..."
    
    if ! systemctl is-active --quiet cockpit.service; then
        print_warning "Cockpit service is not running"
        print_info "Starting Cockpit service..."
        systemctl start cockpit.service
        print_success "Cockpit service started"
    else
        print_success "Cockpit service is running"
    fi
}

# Verify required files exist
verify_files() {
    print_info "Verifying required files..."
    
    local missing_files=0
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Missing file: $file"
            missing_files=$((missing_files + 1))
        else
            print_success "Found: $file"
        fi
    done
    
    if [[ $missing_files -gt 0 ]]; then
        print_error "Some required files are missing"
        echo ""
        echo "Make sure you're in the cockpit-battery-monitor directory"
        echo "and all required files are present."
        exit 1
    fi
}

# Create module directory
create_module_directory() {
    print_info "Creating module directory..."
    
    if [[ -d "$MODULE_DIR" ]]; then
        print_warning "Module directory already exists: $MODULE_DIR"
        INSTALLED=true
        print_info "Updating..."
    fi
    
    mkdir -p "$MODULE_DIR"
    print_success "Module directory created: $MODULE_DIR"
}

# Copy files
copy_files() {
    print_info "Copying files to module directory..."
    
    for file in "${REQUIRED_FILES[@]}"; do
        if ! cp "$file" "$MODULE_DIR/"; then
            print_error "Failed to copy $file"
            exit 1
        fi
        print_success "Copied: $file"
    done
}

# Set permissions
set_permissions() {
    print_info "Setting file permissions..."
    
    chmod -R 755 "$MODULE_DIR"
    chmod 644 "$MODULE_DIR"/*
    
    print_success "Permissions set correctly"
}

# Verify battery device
verify_battery() {
    print_info "Verifying battery device..."
    
    if [[ ! -d "/sys/class/power_supply" ]]; then
        print_warning "Battery information not available on this system"
        echo "This might be a virtual machine or server without battery support"
        return
    fi
    
    local battery_found=0
    for device in /sys/class/power_supply/BAT*; do
        if [[ -d "$device" ]]; then
            local capacity_file="$device/capacity"
            if [[ -f "$capacity_file" ]]; then
                local device_name=$(basename "$device")
                print_success "Battery device found: $device_name"
                battery_found=1
                
                # Show battery info
                if [[ -f "$device/manufacturer" ]]; then
                    local manufacturer=$(cat "$device/manufacturer")
                    print_info "  Manufacturer: $manufacturer"
                fi
                if [[ -f "$device/model_name" ]]; then
                    local model=$(cat "$device/model_name")
                    print_info "  Model: $model"
                fi
            fi
        fi
    done
    
    if [[ $battery_found -eq 0 ]]; then
        print_warning "No battery device found"
        echo "This system might be a virtual machine or desktop without battery"
        echo "The module will still work but may show N/A for battery information"
    fi
}

# Restart Cockpit
restart_cockpit() {
    print_info "Restarting Cockpit service..."
    
    # Properly handle the service restart
    systemctl restart cockpit.service
    
    # Wait for service to stabilize
    sleep 2
    
    # Check if service is running
    if systemctl is-active --quiet cockpit.service; then
        print_success "Cockpit service restarted successfully"
    else
        print_error "Failed to restart Cockpit service"
        exit 1
    fi
}

# Cleanup function to prevent zombies
cleanup() {
    # Kill any remaining child processes
    jobs -p | xargs -r kill -9 2>/dev/null || true
    
    # Wait for all background jobs
    wait
}

# Call cleanup on exit
trap cleanup EXIT

# Show installation summary
show_summary_install() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Cockpit Battery Monitor Installation Complete!            ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Installation Summary:"
    echo "  Module Location: $MODULE_DIR"
    echo "  Module Name:     Battery Monitor"
    echo "  Version:         $VERSION"
    echo ""
    echo "Next Steps:"
    echo "  1. Open your browser and go to: https://localhost:9090"
    echo "  2. Log in with your credentials."
    echo "  3. Click on 'Battery Monitor' in the sidebar under 'Tools'."
    echo ""
    echo "Configuration:"
    echo "  The module automatically detects your battery device."
    echo "  If you need to change it, edit:"
    echo "    $MODULE_DIR/battery.js"
    echo "  And change the battery device path (line ~71)"
    echo ""
    echo "Troubleshooting:"
    echo "  If the module doesn't appear:"
    echo "    1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
    echo "    2. Check Cockpit logs: sudo journalctl -u cockpit -f"
    echo "    3. Verify battery: ls /sys/class/power_supply/"
    echo ""
    echo "Uninstall:"
    echo "  To remove the module, run:"
    echo "    sudo rm -rf $MODULE_DIR"
    echo "    sudo systemctl restart cockpit"
    echo ""
}

# Show update summary
show_summary_update() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Cockpit Battery Monitor Update Complete!                  ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Installation Summary:"
    echo "  Module Location: $MODULE_DIR"
    echo "  Module Name:     Battery Monitor"
    echo "  Version:         $VERSION"
    echo ""
    echo "Next Steps:"
    echo "  1. Open your browser and go to: https://localhost:9090"
    echo "  2. Log in with your credentials."
    echo "  3. Click on 'Battery Monitor' in the sidebar under 'Tools'."
    echo ""
    echo "Configuration:"
    echo "  The module automatically detects your battery device."
    echo "  If you need to change it, edit:"
    echo "    $MODULE_DIR/battery.js"
    echo "  And change the battery device path (line ~71)"
    echo ""
    echo "Troubleshooting:"
    echo "  If the module doesn't appear:"
    echo "    1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
    echo "    2. Check Cockpit logs: sudo journalctl -u cockpit -f"
    echo "    3. Verify battery: ls /sys/class/power_supply/"
    echo ""
    echo "Uninstall:"
    echo "  To remove the module, run:"
    echo "    sudo rm -rf $MODULE_DIR"
    echo "    sudo systemctl restart cockpit"
    echo ""
}

#############################################################################
# Main Installation Flow
#############################################################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Cockpit Battery Monitor Installation Script               ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Version: ${VERSION}                                            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Run checks and installation steps
    check_root
    check_cockpit
    check_cockpit_running
    verify_files
    create_module_directory
    copy_files
    set_permissions
    verify_battery
    restart_cockpit
    
    # Show summary
    if [ "$INSTALLED" = false ] ; then
        show_summary_install
    else
        show_summary_update
    fi


}

# Run main function
main
