import { syncManager } from './syncManager';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  lastSeen: number;
  isCurrentDevice: boolean;
}

class DeviceManager {
  private deviceInfo: DeviceInfo;
  private knownDevices: Map<string, DeviceInfo> = new Map();
  private heartbeatInterval: number | null = null;

  constructor() {
    this.deviceInfo = this.generateDeviceInfo();
    this.loadKnownDevices();
    this.startDeviceHeartbeat();
  }

  private generateDeviceInfo(): DeviceInfo {
    const deviceId = syncManager.getStatus().deviceId;
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?=.*Mobile)/i.test(navigator.userAgent);
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    // Generate friendly device name
    const browserName = this.getBrowserName();
    const platformName = this.getPlatformName();
    const deviceName = `${platformName} ${browserName} (${deviceType})`;

    return {
      id: deviceId,
      name: deviceName,
      type: deviceType,
      browser: browserName,
      lastSeen: Date.now(),
      isCurrentDevice: true
    };
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getPlatformName(): string {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (platform.includes('iphone') || platform.includes('ipad')) return 'iOS';
    if (platform.includes('android')) return 'Android';
    return 'Unknown';
  }

  private loadKnownDevices() {
    try {
      const stored = localStorage.getItem('known_devices');
      if (stored) {
        const devices = JSON.parse(stored);
        this.knownDevices = new Map(devices);
      }
    } catch (error) {
      console.error('Failed to load known devices:', error);
    }
  }

  private saveKnownDevices() {
    try {
      const devices = Array.from(this.knownDevices.entries());
      localStorage.setItem('known_devices', JSON.stringify(devices));
    } catch (error) {
      console.error('Failed to save known devices:', error);
    }
  }

  private startDeviceHeartbeat() {
    // Update device heartbeat every 30 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.updateDeviceHeartbeat();
    }, 30000);

    // Initial heartbeat
    this.updateDeviceHeartbeat();
  }

  private updateDeviceHeartbeat() {
    this.deviceInfo.lastSeen = Date.now();
    this.knownDevices.set(this.deviceInfo.id, { ...this.deviceInfo });
    this.saveKnownDevices();

    // Clean up old devices (not seen for 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const [deviceId, device] of this.knownDevices) {
      if (device.lastSeen < sevenDaysAgo && !device.isCurrentDevice) {
        this.knownDevices.delete(deviceId);
      }
    }
  }

  registerDevice(deviceInfo: Partial<DeviceInfo>) {
    const device: DeviceInfo = {
      ...this.deviceInfo,
      ...deviceInfo,
      lastSeen: Date.now(),
      isCurrentDevice: false
    };

    this.knownDevices.set(device.id, device);
    this.saveKnownDevices();
  }

  getCurrentDevice(): DeviceInfo {
    return this.deviceInfo;
  }

  getKnownDevices(): DeviceInfo[] {
    return Array.from(this.knownDevices.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getActiveDevices(): DeviceInfo[] {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return this.getKnownDevices()
      .filter(device => device.lastSeen > fiveMinutesAgo);
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

export const deviceManager = new DeviceManager();