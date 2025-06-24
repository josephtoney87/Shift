import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

interface OfflineNoticeProps {
  pendingChanges: number;
}

const OfflineNotice: React.FC<OfflineNoticeProps> = ({ pendingChanges }) => {
  if (navigator.onLine) return null;

  return (
    <div className="bg-warning-50 border-l-4 border-warning-400 p-4 mb-4">
      <div className="flex items-center">
        <WifiOff className="h-5 w-5 text-warning-400 mr-2" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-warning-800">
            You're currently offline
          </h3>
          <p className="text-sm text-warning-700 mt-1">
            Your changes are being saved locally and will sync when you're back online.
            {pendingChanges > 0 && (
              <span className="font-medium">
                {' '}{pendingChanges} change{pendingChanges !== 1 ? 's' : ''} pending sync.
              </span>
            )}
          </p>
        </div>
        {pendingChanges > 0 && (
          <AlertTriangle className="h-5 w-5 text-warning-500" />
        )}
      </div>
    </div>
  );
};

export default OfflineNotice;