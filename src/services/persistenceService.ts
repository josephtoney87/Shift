import { supabase, hasValidCredentials } from './supabase';
import { 
  saveShift, saveWorker, savePart, saveTask, saveTaskNote, saveTimeLog,
  loadShifts, loadWorkers, loadParts, loadTasks, loadTaskNotes, loadTimeLogs,
  syncAllData, loadAllCloudData
} from './supabaseOperations';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class PersistenceService {
  private pendingOperations: PendingOperation[] = [];
  private isOnline = navigator.onLine;
  private syncInterval: number | null = null;
  private autoSyncEnabled = true;
  private syncCallbacks: Set<() => void> = new Set();

  constructor() {
    this.setupNetworkListeners();
    this.startPeriodicSync();
    this.loadPendingOperations();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Back online - syncing pending operations');
      this.syncPendingOperations();
      this.notifyCallbacks();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Gone offline - operations will be queued');
      this.notifyCallbacks();
    });

    // Sync before page unload
    window.addEventListener('beforeunload', () => {
      if (this.pendingOperations.length > 0) {
        // Try to sync immediately before leaving
        this.syncPendingOperations();
      }
    });
  }

  private startPeriodicSync() {
    // Sync every 15 seconds if there are pending operations
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.autoSyncEnabled && this.pendingOperations.length > 0) {
        this.syncPendingOperations();
      }
    }, 15000);
  }

  private loadPendingOperations() {
    try {
      const stored = localStorage.getItem('pendingOperations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
        console.log(`📋 Loaded ${this.pendingOperations.length} pending operations from storage`);
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  private savePendingOperations() {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  private notifyCallbacks() {
    this.syncCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Sync callback error:', error);
      }
    });
  }

  onSyncStatusChange(callback: () => void) {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  async saveData(table: string, data: any, operation: 'create' | 'update' | 'delete' = 'create') {
    // Always save to local storage first for immediate access
    this.saveToLocalStorage(table, data);

    if (!hasValidCredentials()) {
      console.log('💾 Saved to local storage (no cloud credentials)');
      return;
    }

    if (this.isOnline && this.autoSyncEnabled) {
      try {
        await this.saveToCloud(table, data, operation);
        console.log(`☁️ Successfully saved ${table} data to cloud`);
        this.notifyCallbacks();
      } catch (error) {
        console.error(`❌ Failed to save ${table} data to cloud:`, error);
        this.queueOperation(table, data, operation);
      }
    } else {
      console.log(`📋 Queued ${table} operation (offline or auto-sync disabled)`);
      this.queueOperation(table, data, operation);
    }
  }

  private async saveToCloud(table: string, data: any, operation: string) {
    switch (table) {
      case 'shifts':
        return await saveShift(data);
      case 'workers':
        return await saveWorker(data);
      case 'parts':
        return await savePart(data);
      case 'tasks':
        return await saveTask(data);
      case 'task_notes':
        return await saveTaskNote(data);
      case 'time_logs':
        return await saveTimeLog(data);
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  private saveToLocalStorage(table: string, data: any) {
    try {
      const key = `local_${table}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter((item: any) => item.id !== data.id);
      
      // Don't store soft-deleted items locally
      if (!data.deleted_at) {
        updated.push(data);
      }
      
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  private queueOperation(table: string, data: any, operation: 'create' | 'update' | 'delete') {
    const pendingOp: PendingOperation = {
      id: `${table}_${data.id}_${Date.now()}`,
      type: operation,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Remove any existing operation for the same record to avoid duplicates
    this.pendingOperations = this.pendingOperations.filter(
      op => !(op.table === table && op.data.id === data.id)
    );

    this.pendingOperations.push(pendingOp);
    this.savePendingOperations();
    this.notifyCallbacks();
    
    console.log(`📋 Queued operation for ${table}:`, pendingOp.id);
  }

  async syncPendingOperations() {
    if (!hasValidCredentials() || !this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${this.pendingOperations.length} pending operations...`);

    const operations = [...this.pendingOperations];
    const successful: string[] = [];
    const failed: PendingOperation[] = [];

    for (const operation of operations) {
      try {
        await this.saveToCloud(operation.table, operation.data, operation.type);
        successful.push(operation.id);
        console.log(`✅ Synced operation: ${operation.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync operation ${operation.id}:`, error);
        
        // Retry logic with exponential backoff
        operation.retryCount++;
        if (operation.retryCount < 5) {
          failed.push(operation);
        } else {
          console.error(`🚫 Giving up on operation ${operation.id} after 5 retries`);
        }
      }
    }

    // Update pending operations
    this.pendingOperations = failed;
    this.savePendingOperations();
    this.notifyCallbacks();

    if (successful.length > 0) {
      console.log(`✅ Successfully synced ${successful.length} operations`);
    }
    
    if (failed.length > 0) {
      console.log(`⚠️ ${failed.length} operations failed and will retry later`);
    }
  }

  async loadAllData() {
    if (!hasValidCredentials()) {
      console.log('💾 Loading from local storage (no cloud credentials)');
      return this.loadFromLocalStorage();
    }

    try {
      console.log('☁️ Loading data from cloud...');
      const cloudData = await loadAllCloudData();
      if (cloudData) {
        // Merge with any pending local operations
        const mergedData = this.mergeLocalWithCloud(cloudData);
        console.log('✅ Loaded and merged cloud data');
        return mergedData;
      }
    } catch (error) {
      console.error('❌ Failed to load from cloud, falling back to local:', error);
    }

    return this.loadFromLocalStorage();
  }

  private mergeLocalWithCloud(cloudData: any) {
    const localData = this.loadFromLocalStorage();
    
    // For each table, merge local pending changes with cloud data
    const tables = ['shifts', 'workers', 'parts', 'tasks', 'taskNotes', 'timeLogs'];
    const merged = { ...cloudData };

    tables.forEach(table => {
      const cloudItems = cloudData[table] || [];
      const localItems = localData[table] || [];
      const cloudItemsMap = new Map(cloudItems.map((item: any) => [item.id, item]));
      
      // Add local items that are newer or don't exist in cloud
      localItems.forEach((localItem: any) => {
        const cloudItem = cloudItemsMap.get(localItem.id);
        if (!cloudItem || new Date(localItem.updatedAt || localItem.createdAt) > new Date(cloudItem.updatedAt || cloudItem.createdAt)) {
          cloudItemsMap.set(localItem.id, localItem);
        }
      });
      
      merged[table] = Array.from(cloudItemsMap.values());
    });

    return merged;
  }

  private loadFromLocalStorage() {
    try {
      const shifts = JSON.parse(localStorage.getItem('local_shifts') || '[]');
      const workers = JSON.parse(localStorage.getItem('local_workers') || '[]');
      const parts = JSON.parse(localStorage.getItem('local_parts') || '[]');
      const tasks = JSON.parse(localStorage.getItem('local_tasks') || '[]');
      const taskNotes = JSON.parse(localStorage.getItem('local_task_notes') || '[]');
      const timeLogs = JSON.parse(localStorage.getItem('local_time_logs') || '[]');

      return {
        shifts,
        workers,
        parts,
        tasks,
        taskNotes,
        timeLogs,
        shiftReports: []
      };
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return {
        shifts: [],
        workers: [],
        parts: [],
        tasks: [],
        taskNotes: [],
        timeLogs: [],
        shiftReports: []
      };
    }
  }

  async forceSyncAll(allData: any) {
    if (!hasValidCredentials()) {
      console.log('❌ Cannot force sync - no cloud credentials');
      return false;
    }

    try {
      console.log('🔄 Force syncing all data to cloud...');
      await syncAllData(allData);
      
      // Clear pending operations since everything is now synced
      this.pendingOperations = [];
      this.savePendingOperations();
      this.notifyCallbacks();
      
      console.log('✅ Force sync completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false;
    }
  }

  getPendingOperationsCount() {
    return this.pendingOperations.length;
  }

  isConnected() {
    return hasValidCredentials() && this.isOnline;
  }

  getConnectionStatus() {
    if (!hasValidCredentials()) return 'local';
    if (!this.isOnline) return 'offline';
    if (this.pendingOperations.length > 0) return 'syncing';
    return 'connected';
  }

  enableAutoSync() {
    this.autoSyncEnabled = true;
    if (this.isOnline && this.pendingOperations.length > 0) {
      this.syncPendingOperations();
    }
  }

  disableAutoSync() {
    this.autoSyncEnabled = false;
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncCallbacks.clear();
  }
}

export const persistenceService = new PersistenceService();