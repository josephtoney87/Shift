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
}

class PersistenceService {
  private pendingOperations: PendingOperation[] = [];
  private isOnline = navigator.onLine;
  private syncInterval: number | null = null;

  constructor() {
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Back online - syncing pending operations');
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Gone offline - operations will be queued');
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
    // Sync every 30 seconds if there are pending operations
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  async saveData(table: string, data: any, operation: 'create' | 'update' | 'delete' = 'create') {
    if (!hasValidCredentials()) {
      // Local only mode
      return this.saveToLocalStorage(table, data);
    }

    if (this.isOnline) {
      try {
        await this.saveToCloud(table, data, operation);
        console.log(`Successfully saved ${table} data to cloud`);
      } catch (error) {
        console.error(`Failed to save ${table} data to cloud:`, error);
        this.queueOperation(table, data, operation);
      }
    } else {
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
    const key = `local_${table}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.filter((item: any) => item.id !== data.id);
    updated.push(data);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  private queueOperation(table: string, data: any, operation: 'create' | 'update' | 'delete') {
    const pendingOp: PendingOperation = {
      id: `${table}_${data.id}_${Date.now()}`,
      type: operation,
      table,
      data,
      timestamp: Date.now()
    };

    this.pendingOperations.push(pendingOp);
    console.log(`Queued operation for ${table}:`, pendingOp);
  }

  async syncPendingOperations() {
    if (!hasValidCredentials() || !this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    console.log(`Syncing ${this.pendingOperations.length} pending operations...`);

    const operations = [...this.pendingOperations];
    const successful: string[] = [];

    for (const operation of operations) {
      try {
        await this.saveToCloud(operation.table, operation.data, operation.type);
        successful.push(operation.id);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        // Keep the operation in the queue for retry
      }
    }

    // Remove successful operations
    this.pendingOperations = this.pendingOperations.filter(
      op => !successful.includes(op.id)
    );

    console.log(`Successfully synced ${successful.length} operations`);
  }

  async loadAllData() {
    if (!hasValidCredentials()) {
      return this.loadFromLocalStorage();
    }

    try {
      const cloudData = await loadAllCloudData();
      if (cloudData) {
        console.log('Loaded data from cloud');
        return cloudData;
      }
    } catch (error) {
      console.error('Failed to load from cloud, falling back to local:', error);
    }

    return this.loadFromLocalStorage();
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

  getPendingOperationsCount() {
    return this.pendingOperations.length;
  }

  isConnected() {
    return hasValidCredentials() && this.isOnline;
  }

  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const persistenceService = new PersistenceService();