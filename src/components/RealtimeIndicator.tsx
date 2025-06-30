import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Users, Bell, BellOff } from 'lucide-react';
import { realtimeService } from '../services/realtimeService';
import { persistenceService } from '../services/persistenceService';
import { hasValidCredentials } from '../services/supabase';
import Tooltip from './Tooltip';

const RealtimeIndicator: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState(realtimeService.getConnectionStatus());
  const [syncStats, setSyncStats] = useState(persistenceService.getSyncStats());
  const [showNotifications, setShowNotifications] = useState(true);
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);

  useEffect(() => {
    const updateStatus = () => {
      setConnectionStatus(realtimeService.getConnectionStatus());
      setSyncStats(persistenceService.getSyncStats());
    };

    // Update status every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    // Listen for real-time updates
    const handleRealtimeUpdate = (event: CustomEvent) => {
      const { table, operation, newData } = event.detail;
      
      if (showNotifications) {
        const updateMessage = `${operation} in ${table}`;
        setRecentUpdates(prev => {
          const updated = [updateMessage, ...prev.slice(0, 4)];
          return updated;
        });
        
        // Clear the update after 5 seconds
        setTimeout(() => {
          setRecentUpdates(prev => prev.filter(msg => msg !== updateMessage));
        }, 5000);
      }
    };

    window.addEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('realtimeUpdate', handleRealtimeUpdate as EventListener);
    };
  }, [showNotifications]);

  const getStatusColor = () => {
    if (!hasValidCredentials()) return 'text-warning-600';
    if (!navigator.onLine) return 'text-error-600';
    if (!connectionStatus.isInitialized) return 'text-warning-600';
    if (syncStats.syncInProgress) return 'text-blue-600';
    if (syncStats.pendingOperations > 0) return 'text-warning-600';
    return 'text-success-600';
  };

  const getStatusIcon = () => {
    if (!navigator.onLine) return <WifiOff className="h-4 w-4" />;
    if (!connectionStatus.isInitialized) return <WifiOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getTooltipContent = () => {
    if (!hasValidCredentials()) {
      return 'Running in local mode - Configure Supabase for real-time collaboration';
    }
    
    if (!navigator.onLine) {
      return `Offline - ${syncStats.pendingOperations} changes queued for sync`;
    }
    
    if (!connectionStatus.isInitialized) {
      return 'Connecting to real-time services...';
    }
    
    if (syncStats.syncInProgress) {
      return `Syncing ${syncStats.pendingOperations} changes to cloud...`;
    }
    
    if (syncStats.pendingOperations > 0) {
      return `${syncStats.pendingOperations} changes pending sync`;
    }
    
    return `Live collaboration active • ${connectionStatus.subscriptionCount} subscriptions`;
  };

  const handleForceReconnect = () => {
    realtimeService.forceReconnect();
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Real-time Status */}
      <Tooltip content={getTooltipContent()} position="bottom">
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-xs font-medium">
            {!hasValidCredentials() ? 'Local' :
             !navigator.onLine ? 'Offline' :
             !connectionStatus.isInitialized ? 'Connecting...' :
             syncStats.syncInProgress ? 'Syncing' :
             syncStats.pendingOperations > 0 ? `${syncStats.pendingOperations} pending` :
             'Live'}
          </span>
        </div>
      </Tooltip>

      {/* Users Indicator */}
      {hasValidCredentials() && connectionStatus.isInitialized && (
        <Tooltip content="Real-time collaboration is active - changes are shared instantly" position="bottom">
          <div className="flex items-center text-success-600">
            <Users className="h-4 w-4" />
          </div>
        </Tooltip>
      )}

      {/* Notifications Toggle */}
      <Tooltip content={showNotifications ? 'Disable update notifications' : 'Enable update notifications'} position="bottom">
        <button
          onClick={toggleNotifications}
          className={`p-1 rounded ${showNotifications ? 'text-blue-600' : 'text-neutral-400'}`}
        >
          {showNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </Tooltip>

      {/* Reconnect Button */}
      {hasValidCredentials() && !connectionStatus.isInitialized && (
        <Tooltip content="Force reconnect to real-time services" position="bottom">
          <button
            onClick={handleForceReconnect}
            className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
          >
            Reconnect
          </button>
        </Tooltip>
      )}

      {/* Recent Updates Indicator */}
      {recentUpdates.length > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-blue-600">
            {recentUpdates.length} recent update{recentUpdates.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default RealtimeIndicator;