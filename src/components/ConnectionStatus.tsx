import React, { useState, useEffect } from 'react';
import { Cloud, Database, Globe, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { hasValidCredentials, initializeSupabase } from '../services/supabase';
import { useShopStore } from '../store/useShopStore';

const ConnectionStatus: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'local'>('checking');
  const { isInitialized, loadCloudData } = useShopStore();

  useEffect(() => {
    checkConnection();
  }, [isInitialized]);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    
    if (!hasValidCredentials()) {
      setConnectionStatus('local');
      return;
    }

    try {
      const supabase = await initializeSupabase();
      if (supabase) {
        setConnectionStatus('connected');
        // Load latest data when connected
        loadCloudData();
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
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
          description: 'Real-time sync enabled • All users see live data',
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200'
        };
      case 'disconnected':
        return {
          icon: <AlertCircle className="h-4 w-4 text-error-500" />,
          text: 'Connection Failed',
          description: 'Using local storage • Changes saved locally',
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
        {statusInfo.icon}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
          <div className="text-xs text-neutral-600 mt-0.5">
            {statusInfo.description}
          </div>
        </div>
        
        {connectionStatus !== 'checking' && connectionStatus !== 'connected' && (
          <button
            onClick={checkConnection}
            className="text-sm px-3 py-1 rounded border hover:bg-white transition-colors"
            disabled={connectionStatus === 'checking'}
          >
            Retry
          </button>
        )}
      </div>

      {connectionStatus === 'connected' && (
        <div className="mt-2 text-xs text-success-700">
          <div className="flex items-center space-x-2">
            <Globe className="h-3 w-3" />
            <span>Live collaboration enabled</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;