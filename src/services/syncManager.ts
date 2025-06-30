import { persistenceService } from './persistenceService';
import { realtimeService } from './realtimeService';
import { hasValidCredentials } from './supabase';
import { useShopStore } from '../store/useShopStore';

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  deviceId: string;
  userId?: string;
  retryCount: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

class SyncManager {
  private deviceId: string;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private heartbeatInterval: number | null = null;
  private syncQueue: SyncOperation[] = [];
  private conflictResolutionCallbacks: Set<(conflict: any) => void> = new Set();
  private lastHeartbeat = Date.now();
  private connectionRetryAttempts = 0;
  private maxRetryAttempts = 10;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.setupNetworkListeners();
    this.startHeartbeat();
    this.setupVisibilityListener();
    this.setupBeforeUnloadListener();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private setupNetworkListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.performFullSync();
      }
    });
  }

  private setupBeforeUnloadListener() {
    window.addEventListener('beforeunload', () => {
      if (this.syncQueue.length > 0) {
        this.emergencySync();
      }
    });
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds to detect connection issues
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isOnline && hasValidCredentials()) {
        this.sendHeartbeat();
      }
    }, 30000);
  }

  private async sendHeartbeat() {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/health`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        this.lastHeartbeat = Date.now();
        this.connectionRetryAttempts = 0;
        
        // If we have pending operations, try to sync
        if (this.syncQueue.length > 0) {
          this.processQueuedOperations();
        }
      } else {
        this.handleConnectionIssue();
      }
    } catch (error) {
      console.warn('Heartbeat failed:', error);
      this.handleConnectionIssue();
    }
  }

  private handleConnectionIssue() {
    this.connectionRetryAttempts++;
    if (this.connectionRetryAttempts >= this.maxRetryAttempts) {
      console.error('Max connection retry attempts reached. Working in offline mode.');
      this.isOnline = false;
    }
  }

  private handleOnline() {
    console.log('🌐 Network connection restored');
    this.isOnline = true;
    this.connectionRetryAttempts = 0;
    this.performFullSync();
  }

  private handleOffline() {
    console.log('📱 Network connection lost - operating in offline mode');
    this.isOnline = false;
  }

  async saveOperation(
    table: string, 
    data: any, 
    operation: 'create' | 'update' | 'delete' = 'create',
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ) {
    const store = useShopStore.getState();
    
    // Create operation with full metadata
    const syncOperation: SyncOperation = {
      id: `${this.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation,
      table,
      data: {
        ...data,
        lastModified: new Date().toISOString(),
        deviceId: this.deviceId,
        userId: store.currentUser?.id
      },
      timestamp: Date.now(),
      deviceId: this.deviceId,
      userId: store.currentUser?.id,
      retryCount: 0,
      priority
    };

    // Always save to local storage immediately for instant access
    this.saveToLocalStorage(table, syncOperation.data);

    // Add to sync queue
    this.addToSyncQueue(syncOperation);

    // If online, try to sync immediately
    if (this.isOnline && hasValidCredentials()) {
      try {
        await this.syncOperationToCloud(syncOperation);
        this.removeFromSyncQueue(syncOperation.id);
        console.log(`✅ Successfully synced ${table} operation to cloud`);
      } catch (error) {
        console.warn(`⚠️ Failed to sync ${table} operation immediately:`, error);
        // Operation remains in queue for retry
      }
    } else {
      console.log(`📋 Queued ${table} operation for later sync`);
    }

    // Notify other components of the change
    this.notifyStateChange(table, operation, syncOperation.data);
  }

  private saveToLocalStorage(table: string, data: any) {
    try {
      const key = `local_${table}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Remove existing record with same ID
      const filtered = existing.filter((item: any) => item.id !== data.id);
      
      // Add new/updated record if not deleted
      if (!data.deleted_at) {
        filtered.push({
          ...data,
          _localTimestamp: Date.now(),
          _deviceId: this.deviceId
        });
      }
      
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
      this.clearOldLocalData();
    }
  }

  private addToSyncQueue(operation: SyncOperation) {
    // Remove any existing operation for the same record
    this.syncQueue = this.syncQueue.filter(
      op => !(op.table === operation.table && op.data.id === operation.data.id)
    );
    
    // Add new operation
    this.syncQueue.push(operation);
    
    // Sort by priority and timestamp
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Persist queue to localStorage
    this.persistSyncQueue();
  }

  private removeFromSyncQueue(operationId: string) {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
    this.persistSyncQueue();
  }

  private persistSyncQueue() {
    try {
      localStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  private loadSyncQueue() {
    try {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        // Remove operations older than 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.syncQueue = this.syncQueue.filter(op => op.timestamp > oneDayAgo);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async syncOperationToCloud(operation: SyncOperation) {
    return await persistenceService.saveData(
      operation.table, 
      operation.data, 
      operation.type
    );
  }

  private async processQueuedOperations() {
    if (this.syncInProgress || !this.isOnline || !hasValidCredentials()) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Processing ${this.syncQueue.length} queued operations...`);

    const batchSize = 5;
    const operations = [...this.syncQueue];
    const successful: string[] = [];
    const failed: SyncOperation[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (operation) => {
          try {
            await this.syncOperationToCloud(operation);
            successful.push(operation.id);
            console.log(`✅ Synced operation: ${operation.id}`);
          } catch (error) {
            console.warn(`❌ Failed to sync operation ${operation.id}:`, error);
            
            operation.retryCount++;
            if (operation.retryCount < 5) {
              failed.push(operation);
            } else {
              console.error(`🚫 Giving up on operation ${operation.id} after 5 retries`);
            }
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Update sync queue
    this.syncQueue = failed;
    this.persistSyncQueue();

    this.syncInProgress = false;

    if (successful.length > 0) {
      console.log(`✅ Successfully synced ${successful.length} operations`);
      // Refresh data from cloud to get latest state
      await this.refreshFromCloud();
    }
  }

  private async refreshFromCloud() {
    try {
      const store = useShopStore.getState();
      await store.refreshFromCloud();
    } catch (error) {
      console.error('Failed to refresh from cloud:', error);
    }
  }

  private async performFullSync() {
    console.log('🔄 Performing full synchronization...');
    
    try {
      // First, sync all pending operations
      await this.processQueuedOperations();
      
      // Then refresh data from cloud
      await this.refreshFromCloud();
      
      console.log('✅ Full synchronization completed');
    } catch (error) {
      console.error('❌ Full synchronization failed:', error);
    }
  }

  private emergencySync() {
    // Use sendBeacon for reliability during page unload
    if (this.syncQueue.length > 0 && hasValidCredentials()) {
      try {
        const data = JSON.stringify({
          operations: this.syncQueue,
          deviceId: this.deviceId,
          timestamp: Date.now()
        });
        
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-sync`;
        navigator.sendBeacon(endpoint, data);
        console.log('📡 Emergency sync beacon sent');
      } catch (error) {
        console.error('Failed to send emergency sync:', error);
      }
    }
  }

  private notifyStateChange(table: string, operation: string, data: any) {
    const event = new CustomEvent('dataChange', {
      detail: {
        table,
        operation,
        data,
        deviceId: this.deviceId,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
  }

  private clearOldLocalData() {
    // Clear data older than 7 days to prevent storage bloat
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    ['shifts', 'workers', 'parts', 'tasks', 'task_notes', 'time_logs'].forEach(table => {
      try {
        const key = `local_${table}`;
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = data.filter((item: any) => {
          const timestamp = item._localTimestamp || 0;
          return timestamp > oneWeekAgo;
        });
        localStorage.setItem(key, JSON.stringify(filtered));
      } catch (error) {
        console.warn(`Failed to clean old data for ${table}:`, error);
      }
    });
  }

  // Public methods
  onConflictResolution(callback: (conflict: any) => void) {
    this.conflictResolutionCallbacks.add(callback);
    return () => this.conflictResolutionCallbacks.delete(callback);
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queuedOperations: this.syncQueue.length,
      lastHeartbeat: this.lastHeartbeat,
      deviceId: this.deviceId,
      connectionRetryAttempts: this.connectionRetryAttempts
    };
  }

  async forceSyncAll() {
    const store = useShopStore.getState();
    return await store.forceSyncAllData();
  }

  initialize() {
    this.loadSyncQueue();
    
    // Try initial sync if online
    if (this.isOnline && hasValidCredentials()) {
      this.performFullSync();
    }
    
    console.log(`🚀 SyncManager initialized with device ID: ${this.deviceId}`);
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.conflictResolutionCallbacks.clear();
    
    // Final sync attempt
    if (this.syncQueue.length > 0) {
      this.emergencySync();
    }
  }
}

export const syncManager = new SyncManager();