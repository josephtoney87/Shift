import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Cloud, CloudOff, Sync, Check, 
  AlertTriangle, Clock, Database, Users 
} from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { hasValidCredentials } from '../services/supabase';
import Tooltip from './Tooltip';

const SyncStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState(syncManager.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(syncManager.getStatus());
    }, 1000);

    // Listen for data changes
    const handleDataChange = (event: CustomEvent) => {
      setStatus(syncManager.getStatus());
    };

    window.addEventListener('dataChange', handleDataChange as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dataChange', handleDataChange as EventListener);
    };
  }, []);

  const getStatusColor = () => {
    if (!hasValidCredentials()) return 'text-warning-600';
    if (!status.isOnline) return 'text-error-600';
    if (status.syncInProgress) return 'text-blue-600';
    if (status.queuedOperations > 0) return 'text-warning-600';
    return 'text-success-600';
  };

  const getStatusIcon = () => {
    if (!hasValidCredentials()) return <Database className="h-4 w-4" />;
    if (!status.isOnline) return <WifiOff className="h-4 w-4" />;
    if (status.syncInProgress) return <Sync className="h-4 w-4 animate-spin" />;
    if (status.queuedOperations > 0) return <Clock className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!hasValidCredentials()) return 'Local Only';
    if (!status.isOnline) return 'Offline';
    if (status.syncInProgress) return 'Syncing...';
    if (status.queuedOperations > 0) return `${status.queuedOperations} Pending`;
    return 'All Synced';
  };

  const getTooltipContent = () => {
    if (!hasValidCredentials()) {
      return 'Running in local mode. Configure Supabase to enable multi-device sync.';
    }
    
    if (!status.isOnline) {
      return `Offline mode. ${status.queuedOperations} changes will sync when connection is restored.`;
    }
    
    if (status.syncInProgress) {
      return 'Synchronizing changes across all devices...';
    }
    
    if (status.queuedOperations > 0) {
      return `${status.queuedOperations} changes waiting to sync to cloud.`;
    }
    
    return 'All changes synchronized across devices. Real-time updates active.';
  };

  const handleForceSync = async () => {
    try {
      await syncManager.forceSyncAll();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Tooltip content={getTooltipContent()} position="bottom">
        <div 
          className={`flex items-center space-x-2 cursor-pointer ${getStatusColor()}`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center space-x-1">
            {getStatusIcon()}
            <span className="text-xs font-medium">{getStatusText()}</span>
          </div>
          
          {hasValidCredentials() && status.isOnline && (
            <div className="flex items-center space-x-1">
              <Cloud className="h-3 w-3 text-success-500" />
              <Users className="h-3 w-3 text-primary-500" />
            </div>
          )}
        </div>
      </Tooltip>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 min-w-64 z-50">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-medium text-neutral-800">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Connection:</span>
                <span className={status.isOnline ? 'text-success-600' : 'text-error-600'}>
                  {status.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Cloud Database:</span>
                <span className={hasValidCredentials() ? 'text-success-600' : 'text-warning-600'}>
                  {hasValidCredentials() ? 'Connected' : 'Local Only'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Pending Changes:</span>
                <span className={status.queuedOperations > 0 ? 'text-warning-600' : 'text-success-600'}>
                  {status.queuedOperations}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Device ID:</span>
                <span className="text-neutral-600 text-xs">
                  {status.deviceId.slice(-8)}
                </span>
              </div>
              
              {status.lastHeartbeat && (
                <div className="flex justify-between">
                  <span>Last Heartbeat:</span>
                  <span className="text-neutral-600 text-xs">
                    {new Date(status.lastHeartbeat).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            
            {hasValidCredentials() && status.isOnline && (
              <div className="pt-2 border-t">
                <button
                  onClick={handleForceSync}
                  disabled={status.syncInProgress}
                  className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm"
                >
                  {status.syncInProgress ? 'Syncing...' : 'Force Sync All'}
                </button>
              </div>
            )}
            
            <div className="pt-2 border-t text-xs text-neutral-500">
              {hasValidCredentials() ? (
                <>
                  <div className="flex items-center mb-1">
                    <Check className="h-3 w-3 text-success-500 mr-1" />
                    Multi-device sync enabled
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3 w-3 text-primary-500 mr-1" />
                    Real-time collaboration active
                  </div>
                </>
              ) : (
                <div className="flex items-center">
                  <AlertTriangle className="h-3 w-3 text-warning-500 mr-1" />
                  Local storage only
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;