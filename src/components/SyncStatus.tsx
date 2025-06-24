import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Wifi, WifiOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';

const SyncStatus: React.FC = () => {
  const { 
    lastSyncTime, 
    pendingChanges, 
    syncData, 
    loadCloudData 
  } = useShopStore();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await syncData();
    } catch (error) {
      setSyncError('Sync failed. Please try again.');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadCloud = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await loadCloudData();
    } catch (error) {
      setSyncError('Failed to load cloud data.');
      console.error('Load cloud data error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-error-600';
    if (pendingChanges.length > 0) return 'text-warning-600';
    if (syncError) return 'text-error-600';
    return 'text-success-600';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncError) return 'Sync Error';
    if (pendingChanges.length > 0) return `${pendingChanges.length} pending`;
    return 'Synced';
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {/* Network Status */}
      <div className="flex items-center">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-success-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-error-500" />
        )}
      </div>

      {/* Sync Status */}
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : syncError ? (
          <AlertTriangle className="h-4 w-4" />
        ) : pendingChanges.length > 0 ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        <span>{getStatusText()}</span>
      </div>

      {/* Manual Sync Button */}
      {isOnline && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50"
          title="Sync now"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}

      {/* Load Cloud Data Button */}
      {isOnline && (
        <button
          onClick={handleLoadCloud}
          disabled={isSyncing}
          className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50"
          title="Load latest from cloud"
        >
          <CloudOff className="h-4 w-4" />
        </button>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && (
        <span className="text-xs text-neutral-500">
          {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
      
      {/* Error Message */}
      {syncError && (
        <div className="text-xs text-error-600 bg-error-50 px-2 py-1 rounded">
          {syncError}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;