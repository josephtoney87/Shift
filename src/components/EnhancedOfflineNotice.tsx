import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, Database, Cloud, Upload, CheckCircle, FolderSync as Sync, Users, Globe, Smartphone } from 'lucide-react';
import { hasValidCredentials } from '../services/supabase';
import { syncManager } from '../services/syncManager';
import Tooltip from './Tooltip';

const EnhancedOfflineNotice: React.FC = () => {
  const [status, setStatus] = useState(syncManager.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(syncManager.getStatus());
    }, 1000);

    const handleDataChange = () => {
      setStatus(syncManager.getStatus());
    };

    window.addEventListener('dataChange', handleDataChange);
    window.addEventListener('online', handleDataChange);
    window.addEventListener('offline', handleDataChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dataChange', handleDataChange);
      window.removeEventListener('online', handleDataChange);
      window.removeEventListener('offline', handleDataChange);
    };
  }, []);

  const hasCredentials = hasValidCredentials();
  const isOnline = navigator.onLine;

  // Don't show notice if everything is working perfectly
  if (hasCredentials && isOnline && status.queuedOperations === 0) {
    return null;
  }

  const getNoticeType = () => {
    if (!hasCredentials) return 'local';
    if (!isOnline) return 'offline';
    if (status.syncInProgress) return 'syncing';
    if (status.queuedOperations > 0) return 'pending';
    return 'connected';
  };

  const noticeType = getNoticeType();

  const getNoticeConfig = () => {
    switch (noticeType) {
      case 'local':
        return {
          icon: <Database className="h-5 w-5 text-warning-400" />,
          title: 'Local Mode Active',
          description: 'Running in device-only storage mode. All data is saved locally.',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-400',
          textColor: 'text-warning-800',
          actionText: 'Configure Cloud Sync',
          actionIcon: <Cloud className="h-4 w-4" />
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-5 w-5 text-error-400" />,
          title: 'Working Offline',
          description: `You're currently offline. ${status.queuedOperations} changes are saved locally and will sync automatically when online.`,
          bgColor: 'bg-error-50',
          borderColor: 'border-error-400',
          textColor: 'text-error-800',
          actionText: 'View Queue',
          actionIcon: <Upload className="h-4 w-4" />
        };
      case 'syncing':
        return {
          icon: <Sync className="h-5 w-5 text-blue-400 animate-spin" />,
          title: 'Syncing Changes',
          description: `Synchronizing ${status.queuedOperations} changes across all devices. Updates will appear for all users in real-time.`,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-800',
          actionText: 'View Progress',
          actionIcon: <Sync className="h-4 w-4" />
        };
      case 'pending':
        return {
          icon: <Upload className="h-5 w-5 text-warning-400" />,
          title: 'Changes Pending Sync',
          description: `${status.queuedOperations} changes are queued for synchronization. They will be synced automatically.`,
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-400',
          textColor: 'text-warning-800',
          actionText: 'Sync Now',
          actionIcon: <Upload className="h-4 w-4" />
        };
      default:
        return null;
    }
  };

  const config = getNoticeConfig();
  if (!config) return null;

  const handleAction = async () => {
    if (noticeType === 'local') {
      setShowDetails(true);
    } else if (noticeType === 'pending' || noticeType === 'syncing') {
      try {
        await syncManager.forceSyncAll();
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    } else {
      setShowDetails(!showDetails);
    }
  };

  return (
    <>
      <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 mb-4`}>
        <div className="flex items-start">
          {config.icon}
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} mt-1`}>
              {config.description}
            </p>
            
            {/* Real-time capabilities indicator */}
            {hasCredentials && isOnline && (
              <div className="mt-2 flex items-center space-x-4 text-xs">
                <div className="flex items-center text-success-600">
                  <Users className="h-3 w-3 mr-1" />
                  Multi-user collaboration
                </div>
                <div className="flex items-center text-primary-600">
                  <Globe className="h-3 w-3 mr-1" />
                  Real-time updates
                </div>
                <div className="flex items-center text-secondary-600">
                  <Smartphone className="h-3 w-3 mr-1" />
                  Cross-device sync
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleAction}
            className={`ml-4 px-3 py-1 text-xs rounded border transition-colors flex items-center space-x-1 ${config.textColor} hover:bg-white`}
          >
            {config.actionIcon}
            <span>{config.actionText}</span>
          </button>
        </div>

        {/* Progress bar for syncing */}
        {(noticeType === 'syncing' || noticeType === 'pending') && status.queuedOperations > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Sync Progress</span>
              <span>{status.queuedOperations} remaining</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  noticeType === 'syncing' ? 'bg-blue-500' : 'bg-warning-500'
                }`}
                style={{ width: '60%' }} // Placeholder progress
              />
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Sync Configuration</h2>
            
            {noticeType === 'local' ? (
              <div className="space-y-4">
                <p className="text-neutral-600">
                  To enable multi-device synchronization and real-time collaboration:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                    Create a Supabase project
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                    Configure environment variables
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                    Deploy database schema
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  <strong>Benefits:</strong> Real-time updates, multi-device access, 
                  automatic backups, and team collaboration.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Device ID:</span>
                    <span className="text-xs text-neutral-600">{status.deviceId.slice(-12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span className={isOnline ? 'text-success-600' : 'text-error-600'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queued Operations:</span>
                    <span>{status.queuedOperations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retry Attempts:</span>
                    <span>{status.connectionRetryAttempts}/10</span>
                  </div>
                </div>
                
                {isOnline && (
                  <button
                    onClick={async () => {
                      await syncManager.forceSyncAll();
                      setShowDetails(false);
                    }}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Force Sync All Data
                  </button>
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowDetails(false)}
              className="mt-4 w-full py-2 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedOfflineNotice;