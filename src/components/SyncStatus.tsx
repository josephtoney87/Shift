import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Wifi, WifiOff, RefreshCw, Check, AlertTriangle, Database } from 'lucide-react';
import { useShopStore } from '../store/useShopStore';
import { hasValidCredentials } from '../services/supabase';
import { persistenceService } from '../services/persistenceService';

const SyncStatus: React.FC = () => {
  const { 
    lastSyncTime, 
    syncData, 
    loadCloudData,
    isInitialized
  } = useShopStore();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(null);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count periodically
    const interval = setInterval(() => {
      setPendingCount(persistenceService.getPendingOperationsCount());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || !hasValidCredentials()) return;
    
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
    if (!isOnline || !hasValidCredentials()) return;
    
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
    if (!hasValidCredentials()) return 'text-warning-600';
    if (pendingCount > 0) return 'text-warning-600';
    if (syncError) return 'text-error-600';
    return 'text-success-600';
  };

  const getStatusText = () => {
    if (!hasValidCredentials()) return 'Local Only';
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncError) return 'Sync Error';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Synced';
  };

  const getStatusIcon = () => {
    if (!hasValidCredentials()) return <Database className="h-4 w-4" />;
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncError) return <AlertTriangle className="h-4 w-4" />;
    if (pendingCount > 0) return <Cloud className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin text-primary-500" />
        <span className="text-primary-600">Initializing...</span>
      </div>
    );
  }

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
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {/* Action Buttons */}
      {hasValidCredentials() && isOnline && (
        <>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50"
            title="Sync now"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLoadCloud}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50"
            title="Load latest from cloud"
          >
            <CloudOff className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && hasValidCredentials() && (
        <span className="text-xs text-neutral-500">
          {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
      
      {/* Status Messages */}
      {syncError && (
        <div className="text-xs text-error-600 bg-error-50 px-2 py-1 rounded">
          {syncError}
        </div>
      )}

      {!hasValidCredentials() && (
        <div className="text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded">
          Local storage only
        </div>
      )}

      {hasValidCredentials() && !isOnline && (
        <div className="text-xs text-error-600 bg-error-50 px-2 py-1 rounded">
          Changes saved locally
        </div>
      )}
    </div>
  );
};

export default SyncStatus;