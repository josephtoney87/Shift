import React from 'react';
import { WifiOff, AlertTriangle, Database, Cloud, Upload, CheckCircle } from 'lucide-react';
import { hasValidCredentials } from '../services/supabase';
import { persistenceService } from '../services/persistenceService';

interface OfflineNoticeProps {
  pendingChanges: number;
}

const OfflineNotice: React.FC<OfflineNoticeProps> = ({ pendingChanges }) => {
  const isOnline = navigator.onLine;
  const hasCredentials = hasValidCredentials();
  const connectionStatus = persistenceService.getConnectionStatus();
  const pendingCount = persistenceService.getPendingOperationsCount();

  // Show different notices based on state
  if (!hasCredentials) {
    return (
      <div className="bg-warning-50 border-l-4 border-warning-400 p-4 mb-4">
        <div className="flex items-center">
          <Database className="h-5 w-5 text-warning-400 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-warning-800">
              Running in Local Mode
            </h3>
            <p className="text-sm text-warning-700 mt-1">
              No cloud database configured. All data is stored locally on this device only. 
              To enable real-time synchronization across devices, configure your Supabase connection in the .env file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOnline && hasCredentials) {
    return (
      <div className="bg-error-50 border-l-4 border-error-400 p-4 mb-4">
        <div className="flex items-center">
          <WifiOff className="h-5 w-5 text-error-400 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-error-800">
              You're currently offline
            </h3>
            <p className="text-sm text-error-700 mt-1">
              Your changes are being saved locally and will sync automatically when you're back online.
              {pendingCount > 0 && (
                <span className="font-medium">
                  {' '}{pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync.
                </span>
              )}
            </p>
          </div>
          {pendingCount > 0 && (
            <AlertTriangle className="h-5 w-5 text-error-500" />
          )}
        </div>
      </div>
    );
  }

  if (isOnline && hasCredentials && connectionStatus === 'syncing' && pendingCount > 0) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex items-center">
          <Upload className="h-5 w-5 text-blue-400 mr-2 animate-pulse" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Syncing changes to cloud
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {pendingCount} change{pendingCount !== 1 ? 's' : ''} being synchronized with the cloud database.
              All users will see your updates in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isOnline && hasCredentials && connectionStatus === 'connected' && pendingCount === 0) {
    return (
      <div className="bg-success-50 border-l-4 border-success-400 p-4 mb-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-success-400 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-success-800">
              All data synced to cloud
            </h3>
            <p className="text-sm text-success-700 mt-1">
              Your changes are automatically saved to the cloud database. 
              All team members can access the latest data from any device.
            </p>
          </div>
          <Cloud className="h-5 w-5 text-success-500" />
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineNotice;