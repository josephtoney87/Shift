import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, Clock, Users } from 'lucide-react';
import { deviceManager } from '../services/deviceManager';
import Tooltip from './Tooltip';

const DeviceIndicator: React.FC = () => {
  const [devices, setDevices] = useState(deviceManager.getKnownDevices());
  const [showDevices, setShowDevices] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(deviceManager.getKnownDevices());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const currentDevice = deviceManager.getCurrentDevice();
  const activeDevices = deviceManager.getActiveDevices();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="relative">
      <Tooltip 
        content={`${activeDevices.length} active devices accessing this data`} 
        position="bottom"
      >
        <button
          onClick={() => setShowDevices(!showDevices)}
          className="flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 transition-colors"
        >
          <div className="flex items-center space-x-1">
            {getDeviceIcon(currentDevice.type)}
            <span className="text-sm font-medium text-neutral-700">
              {activeDevices.length}
            </span>
          </div>
          {activeDevices.length > 1 && (
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          )}
        </button>
      </Tooltip>

      {showDevices && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 min-w-80 z-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-neutral-800 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Connected Devices
            </h3>
            <button
              onClick={() => setShowDevices(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  device.isCurrentDevice 
                    ? 'bg-primary-50 border-primary-200' 
                    : activeDevices.includes(device)
                    ? 'bg-success-50 border-success-200'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${
                    device.isCurrentDevice 
                      ? 'text-primary-600' 
                      : activeDevices.includes(device)
                      ? 'text-success-600'
                      : 'text-neutral-400'
                  }`}>
                    {getDeviceIcon(device.type)}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-neutral-900">
                      {device.name}
                      {device.isCurrentDevice && (
                        <span className="ml-2 text-xs text-primary-600 font-normal">
                          (This device)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {device.browser} • {device.type}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center text-xs text-neutral-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatLastSeen(device.lastSeen)}
                  </div>
                  {activeDevices.includes(device) && (
                    <div className="text-xs text-success-600 font-medium mt-1">
                      Active
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200 text-xs text-neutral-500">
            <div className="flex items-center justify-between">
              <span>Total devices: {devices.length}</span>
              <span>Active now: {activeDevices.length}</span>
            </div>
            <div className="mt-1 text-center">
              All changes sync automatically across devices
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceIndicator;