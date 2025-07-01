import React, { useState, useEffect } from 'react';
import { Cloud, Database, Globe, RefreshCw, AlertCircle, CheckCircle, Wifi, WifiOff, Upload } from 'lucide-react';
import { hasValidCredentials, initializeSupabase } from '../services/supabase';
import { useShopStore } from '../store/useShopStore';
import { persistenceService } from '../services/persistenceService';

const ConnectionStatus: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'local' | 'syncing'>('checking');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isInitialized, loadCloudData, syncData } = useShopStore();

  useEffect(() => {
    console.log('🔄 ConnectionStatus component mounted, checking connection...');
    checkConnection();
    
    // Update status when network changes
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync status changes
    const unsubscribe = persistenceService.onSyncStatusChange(() => {
      setPendingCount(persistenceService.getPendingOperationsCount());
      updateConnectionStatus();
    });

    // Update pending count periodically
    const interval = setInterval(() => {
      setPendingCount(persistenceService.getPendingOperationsCount());
      updateConnectionStatus();
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, [isInitialized]);

  const updateConnectionStatus = () => {
    const status = persistenceService.getConnectionStatus();
    setConnectionStatus(status);
  };

  const checkConnection = async () => {
    console.log('🔍 Checking connection status...');
    setConnectionStatus('checking');
    
    if (!hasValidCredentials()) {
      console.log('📱 No valid credentials found, using local mode');
      setConnectionStatus('local');
      return;
    }

    if (!isOnline) {
      console.log('📶 Device is offline');
      setConnectionStatus('disconnected');
      return;
    }

    try {
      console.log('☁️ Attempting to connect to Supabase...');
      const supabase = await initializeSupabase();
      if (supabase) {
        console.log('✅ Supabase connection successful');
        updateConnectionStatus();
        // Load latest data when connected
        loadCloudData();
      } else {
        console.log('❌ Supabase connection failed');
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleForceSync = async () => {
    if (!hasValidCredentials() || !isOnline) return;
    
    setConnectionStatus('syncing');
    try {
      await syncData();
      await loadCloudData();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
    updateConnectionStatus();
  };

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'checking':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
          text: 'Checking connection...',
          description: 'Verifying database connection',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4 text-success-500" />,
          text: 'Connected to Cloud',
          description: 'Real-time sync enabled • All data synced',
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200'
        };
      case 'syncing':
        return {
          icon: <Upload className="h-4 w-4 animate-pulse text-warning-500" />,
          text: 'Syncing to Cloud',
          description: `${pendingCount} item${pendingCount !== 1 ? 's' : ''} being synchronized`,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200'
        };
      case 'disconnected':
        return {
          icon: <AlertCircle className="h-4 w-4 text-error-500" />,
          text: 'Connection Failed',
          description: `Using local storage • ${pendingCount} change${pendingCount !== 1 ? 's' : ''} queued`,
          color: 'text-error-600',
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200'
        };
      case 'local':
        return {
          icon: <Database className="h-4 w-4 text-warning-500" />,
          text: 'Local Mode',
          description: 'No cloud database configured • Device-only storage',
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`rounded-lg border p-3 ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-success-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-error-500" />
          )}
          {statusInfo.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
          <div className="text-xs text-neutral-600 mt-0.5">
            {statusInfo.description}
          </div>
        </div>
        
        {pendingCount > 0 && (
          <div className="flex items-center space-x-1">
            <div className="bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded-full font-medium">
              {pendingCount}
            </div>
          </div>
        )}
        
        {connectionStatus !== 'checking' && hasValidCredentials() && isOnline && (
          <button
            onClick={handleForceSync}
            disabled={connectionStatus === 'syncing'}
            className="text-sm px-3 py-1 rounded border hover:bg-white transition-colors disabled:opacity-50"
            title="Force sync all data"
          >
            Sync
          </button>
        )}
      </div>

      {connectionStatus === 'connected' && (
        <div className="mt-2 text-xs text-success-700">
          <div className="flex items-center space-x-2">
            <Globe className="h-3 w-3" />
            <span>Live collaboration enabled • Auto-sync active</span>
          </div>
        </div>
      )}
      
      {connectionStatus === 'local' && (
        <div className="mt-2 text-xs text-warning-700">
          <div className="flex items-center space-x-2">
            <Database className="h-3 w-3" />
            <span>Configure Supabase to enable cloud sync</span>
          </div>
        </div>
      )}

      {connectionStatus === 'disconnected' && pendingCount > 0 && (
        <div className="mt-2 text-xs text-error-700">
          <div className="flex items-center space-x-2">
            <Upload className="h-3 w-3" />
            <span>Changes will sync automatically when connection is restored</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;