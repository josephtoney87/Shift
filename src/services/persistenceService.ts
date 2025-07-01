import { supabase, hasValidCredentials } from './supabase';
import { 
  saveShift, saveWorker, savePart, saveTask, saveTaskNote, saveTimeLog,
  loadShifts, loadWorkers, loadParts, loadTasks, loadTaskNotes, loadTimeLogs,
  syncAllData, loadAllCloudData
} from './supabaseOperations';

// Check if user is currently authenticated (not just has credentials)
async function isUserAuthenticated(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user !== null;
  } catch (error) {
    return false;
  }
}

// Tables that require authentication for operations
const TABLES_REQUIRING_AUTH = ['shifts', 'workers', 'parts', 'tasks', 'task_notes', 'time_logs'];
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
  private isOnline = navigator.onLine as boolean;
  private syncInterval: number | null = null;
  private autoSyncEnabled = true as boolean;
  private syncCallbacks: Set<() => void> = new Set();
  private lastSyncAttempt = 0 as number;
  private syncInProgress = false as boolean;

  constructor() {
    this.setupNetworkListeners();
    this.startPeriodicSync();
    this.loadPendingOperations();
    this.setupVisibilityChangeListener();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true as boolean;
      console.log('🌐 Back online - syncing pending operations');
      this.syncPendingOperations();
      this.notifyCallbacks();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false as boolean;
      console.log('📱 Gone offline - operations will be queued');
      this.notifyCallbacks();
    });

    // Sync before page unload
    window.addEventListener('beforeunload', () => {
      if ((this.pendingOperations.length as number) > 0) {
        // Try to sync immediately before leaving
        navigator.sendBeacon && this.sendBeaconSync();
      }
    });
  }

  private setupVisibilityChangeListener() {
    // Sync when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && (this.isOnline as boolean) && (this.pendingOperations.length as number) > 0) {
        console.log('👁️ Tab became visible - syncing pending operations');
        this.syncPendingOperations();
      }
    });
  }

  private sendBeaconSync() {
    if (!hasValidCredentials() || (this.pendingOperations.length as number) === 0) return;
    
    try {
      // Send pending operations via beacon for reliability
      const data = JSON.stringify({
        operations: this.pendingOperations as PendingOperation[],
        timestamp: Date.now() as number
      }) as string;
      
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/sync-data` as string;
      navigator.sendBeacon(endpoint as string, data as string);
    } catch (error) {
      console.error('Failed to send beacon sync:', error);
    }
  }

  private startPeriodicSync() {
    // Sync every 10 seconds if there are pending operations and we're online
    this.syncInterval = window.setInterval(() => {
      if (this.shouldAttemptSync()) {
        this.syncPendingOperations();
      }
    }, 10000) as number;
  }

  private shouldAttemptSync(): boolean {
    const now = Date.now() as number;
    const timeSinceLastAttempt = (now as number) - (this.lastSyncAttempt as number);
    
    return (
      (this.isOnline as boolean) && 
      (this.autoSyncEnabled as boolean) && 
      (this.pendingOperations.length as number) > 0 &&
      !(this.syncInProgress as boolean) &&
      (timeSinceLastAttempt as number) > 5000 // Minimum 5 seconds between attempts
    ) as boolean;
  }

  private loadPendingOperations() {
    try {
      const stored = localStorage.getItem('pendingOperations') as string | null;
      if (stored) {
        const operations = JSON.parse(stored as string) as PendingOperation[];
        // Only keep operations from the last 24 hours to prevent infinite growth
        const oneDayAgo = (Date.now() - (24 * 60 * 60 * 1000)) as number;
        this.pendingOperations = operations.filter((op: PendingOperation) => 
          (op.timestamp as number) > (oneDayAgo as number)
        ) as PendingOperation[];
        console.log(`📋 Loaded ${this.pendingOperations.length as number} pending operations from storage`);
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
      this.pendingOperations = [] as PendingOperation[];
    }
  }

  private savePendingOperations() {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations as PendingOperation[]) as string);
    } catch (error) {
      console.error('Failed to save pending operations:', error);
      // If localStorage is full, try to clear old operations
      this.clearOldOperations();
    }
  }

  private clearOldOperations() {
    const oneHourAgo = (Date.now() - (60 * 60 * 1000)) as number;
    this.pendingOperations = this.pendingOperations.filter(op => (op.timestamp as number) > (oneHourAgo as number)) as PendingOperation[];
    this.savePendingOperations();
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
    this.saveToLocalStorage(table as string, data);

    // Check both credentials and authentication before attempting cloud save
    if (!hasValidCredentials()) {
      console.log('💾 Saved to local storage only (no cloud credentials)');
      return;
    }

    if ((this.isOnline as boolean) && (this.autoSyncEnabled as boolean)) {
      try {
        await this.saveToCloud(table as string, data, operation as string);
        console.log(`☁️ Successfully saved ${table as string} data to cloud`);
        this.notifyCallbacks();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('authenticated') || errorMessage.includes('row-level security')) {
          console.warn(`🔐 Authentication required for ${table as string} - saving locally and queuing for later sync`);
        } else {
          console.error(`❌ Failed to save ${table as string} data to cloud:`, error);
        }
        this.queueOperation(table as string, data, operation);
      }
    } else {
      console.log(`📋 Queued ${table as string} operation (offline or auto-sync disabled)`);
      this.queueOperation(table as string, data, operation);
    }
  }

  private async saveToCloud(table: string, data: any, operation: string) {
    // Only attempt cloud save if user is authenticated
    if (!hasValidCredentials()) {
      throw new Error('No valid credentials for cloud save');
    }

    switch (table as string) {
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
        throw new Error(`Unknown table: ${table as string}`);
    }
  }

  private saveToLocalStorage(table: string, data: any) {
    try {
      const key = `local_${table as string}` as string;
      let existing: any[] = [];
      try {
        existing = JSON.parse(localStorage.getItem(key as string) || '[]') as any[];
      } catch (parseError) {
        console.warn(`Failed to parse existing data for ${table}, starting fresh:`, parseError);
        existing = [];
      }
      
      const updated = existing.filter((item: any) => (item.id as string) !== (data.id as string)) as any[];
      
      // Don't store soft-deleted items locally
      if (!data.deleted_at) {
        updated.push({
          ...data,
          _localTimestamp: Date.now() as number // Track when saved locally
        });
      }
      
      localStorage.setItem(key as string, JSON.stringify(updated as any[]) as string);
      console.log(`💾 Successfully saved ${table} data to localStorage (${updated.length} items)`);
    } catch (error) {
      console.error(`❌ Failed to save ${table} to local storage:`, error);
      // If localStorage is full or corrupted, try to clear and retry
      try {
        localStorage.removeItem(`local_${table}`);
        localStorage.setItem(`local_${table}`, JSON.stringify([data]));
        console.log(`🔄 Cleared and retried saving ${table} to localStorage`);
      } catch (retryError) {
        console.error(`❌ Retry failed for ${table}:`, retryError);
      }
    }
  }

  private queueOperation(table: string, data: any, operation: 'create' | 'update' | 'delete') {
    const pendingOp: PendingOperation = {
      id: `${table as string}_${data.id as string}_${Date.now() as number}` as string,
      type: operation as 'create' | 'update' | 'delete',
      table: table as string,
      data: {
        ...data,
        _queuedAt: Date.now() as number // Track when operation was queued
      },
      timestamp: Date.now() as number,
      retryCount: 0 as number
    } as PendingOperation;

    // Remove any existing operation for the same record to avoid duplicates
    this.pendingOperations = this.pendingOperations.filter(
      op => !((op.table as string) === (table as string) && (op.data.id as string) === (data.id as string))
    ) as PendingOperation[];

    this.pendingOperations.push(pendingOp as PendingOperation);
    this.savePendingOperations();
    this.notifyCallbacks();
    
    console.log(`📋 Queued operation for ${table as string}:`, pendingOp.id as string);
  }

  async syncPendingOperations() {
    if (!hasValidCredentials() || !(this.isOnline as boolean) || (this.pendingOperations.length as number) === 0 || (this.syncInProgress as boolean)) {
      return;
    }

    // Check if user is actually authenticated
    const isAuthenticated = await isUserAuthenticated();

    this.syncInProgress = true as boolean;
    this.lastSyncAttempt = Date.now() as number;

    console.log(`🔄 Syncing ${this.pendingOperations.length as number} pending operations...`);

    const operations = [...this.pendingOperations] as PendingOperation[];
    const successful: string[] = [] as string[];
    const failed: PendingOperation[] = [] as PendingOperation[];
    const skippedAuth: PendingOperation[] = [] as PendingOperation[];

    // Process operations in batches to avoid overwhelming the server
    const batchSize = 5 as number;
    for (let i = 0; i < (operations.length as number); i += (batchSize as number)) {
      const batch = operations.slice(i, i + (batchSize as number)) as PendingOperation[];
      
      await Promise.allSettled(
        batch.map(async (operation) => {
          // Skip operations that require authentication when user is not authenticated
          if (!isAuthenticated && TABLES_REQUIRING_AUTH.includes(operation.table)) {
            console.log(`🔐 Skipping ${operation.table} operation - user not authenticated`);
            skippedAuth.push(operation);
            return;
          }

          try {
            await this.saveToCloud(operation.table as string, operation.data, operation.type as string);
            successful.push(operation.id as string);
            console.log(`✅ Synced operation: ${operation.id as string}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check if this is an authentication error
            if (errorMessage.includes('authenticated') || errorMessage.includes('row-level security') || errorMessage.includes('JWT')) {
              console.log(`🔐 Authentication error for ${operation.id as string} - will retry when authenticated`);
              skippedAuth.push(operation);
              return;
            }

            console.error(`❌ Failed to sync operation ${operation.id as string}:`, error);
            
            // Retry logic with exponential backoff
            operation.retryCount = (operation.retryCount as number) + 1;
            if ((operation.retryCount as number) < 5) {
              failed.push(operation as PendingOperation);
            } else {
              console.error(`🚫 Giving up on operation ${operation.id as string} after 5 retries`);
            }
          }
        })
      );

      // Small delay between batches
      if (i + (batchSize as number) < (operations.length as number)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update pending operations - keep failed operations and auth-skipped operations
    this.pendingOperations = [...failed, ...skippedAuth] as PendingOperation[];
    this.savePendingOperations();
    this.notifyCallbacks();

    this.syncInProgress = false as boolean;

    if ((successful.length as number) > 0) {
      console.log(`✅ Successfully synced ${successful.length as number} operations`);
    }
    
    if ((failed.length as number) > 0) {
      console.log(`⚠️ ${failed.length as number} operations failed and will retry later`);
    }
  }
    if ((skippedAuth.length as number) > 0) {
      console.log(`🔐 ${skippedAuth.length as number} operations skipped due to authentication - will retry when authenticated`);
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
    const tables = ['shifts', 'workers', 'parts', 'tasks', 'taskNotes', 'timeLogs'] as string[];
    const merged = { ...cloudData };

    tables.forEach(table => {
      const cloudItems = (cloudData[table as string] || []) as any[];
      const localItems = (localData[table as string] || []) as any[];
      const cloudItemsMap = new Map(cloudItems.map((item: any) => [(item.id as string), item]));
      
      // Add local items that are newer or don't exist in cloud
      localItems.forEach((localItem: any) => {
        const cloudItem = cloudItemsMap.get(localItem.id as string);
        const localTimestamp = (localItem._localTimestamp || 0) as number;
        const cloudTimestamp = cloudItem ? new Date((cloudItem.updatedAt || cloudItem.createdAt) as string).getTime() : 0 as number;
        
        if (!cloudItem || (localTimestamp as number) > (cloudTimestamp as number)) {
          cloudItemsMap.set(localItem.id as string, localItem);
        }
      });
      
      merged[table as string] = Array.from(cloudItemsMap.values());
    });

    return merged;
  }

  private loadFromLocalStorage() {
    try {
      const shifts = JSON.parse(localStorage.getItem('local_shifts') || '[]') as any[];
      const workers = JSON.parse(localStorage.getItem('local_workers') || '[]') as any[];
      const parts = JSON.parse(localStorage.getItem('local_parts') || '[]') as any[];
      const tasks = JSON.parse(localStorage.getItem('local_tasks') || '[]') as any[];
      const taskNotes = JSON.parse(localStorage.getItem('local_task_notes') || '[]') as any[];
      const timeLogs = JSON.parse(localStorage.getItem('local_time_logs') || '[]') as any[];

      return {
        shifts: shifts as any[],
        workers: workers as any[],
        parts: parts as any[],
        tasks: tasks as any[],
        taskNotes: taskNotes as any[],
        timeLogs: timeLogs as any[],
        shiftReports: [] as any[]
      };
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      return {
        shifts: [] as any[],
        workers: [] as any[],
        parts: [] as any[],
        tasks: [] as any[],
        taskNotes: [] as any[],
        timeLogs: [] as any[],
        shiftReports: [] as any[]
      };
    }
  }

  async forceSyncAll(allData: any): Promise<boolean> {
    if (!hasValidCredentials()) {
      console.log('❌ Cannot force sync - no cloud credentials');
      return false as boolean;
    }

    try {
      console.log('🔄 Force syncing all data to cloud...');
      this.syncInProgress = true as boolean;
      
      await syncAllData(allData);
      
      // Clear pending operations since everything is now synced
      this.pendingOperations = [] as PendingOperation[];
      this.savePendingOperations();
      this.notifyCallbacks();
      
      console.log('✅ Force sync completed successfully');
      return true as boolean;
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false as boolean;
    } finally {
      this.syncInProgress = false as boolean;
    }
  }

  getPendingOperationsCount(): number {
    return this.pendingOperations.length as number;
  }

  isConnected(): boolean {
    return hasValidCredentials() && (this.isOnline as boolean);
  }

  getConnectionStatus(): string {
    if (!hasValidCredentials()) return 'local' as string;
    if (!(this.isOnline as boolean)) return 'offline' as string;
    if (this.syncInProgress as boolean) return 'syncing' as string;
    if ((this.pendingOperations.length as number) > 0) return 'pending' as string;
    return 'connected' as string;
  }

  enableAutoSync() {
    this.autoSyncEnabled = true as boolean;
    if ((this.isOnline as boolean) && (this.pendingOperations.length as number) > 0) {
      this.syncPendingOperations();
    }
  }

  disableAutoSync() {
    this.autoSyncEnabled = false as boolean;
  }

  // Get detailed sync statistics
  getSyncStats() {
    return {
      pendingOperations: this.pendingOperations.length as number,
      isOnline: this.isOnline as boolean,
      autoSyncEnabled: this.autoSyncEnabled as boolean,
      syncInProgress: this.syncInProgress as boolean,
      lastSyncAttempt: this.lastSyncAttempt as number,
      connectionStatus: this.getConnectionStatus() as string
    };
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval as number);
    }
    this.syncCallbacks.clear();
  }
}

export const persistenceService = new PersistenceService();