import { supabase, hasValidCredentials } from './supabase';
import { useShopStore } from '../store/useShopStore';

interface RealtimeSubscription {
  unsubscribe: () => void;
}

class RealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private isInitialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  async initialize() {
    if (!hasValidCredentials() || this.isInitialized) {
      return;
    }

    console.log('🔄 Initializing real-time subscriptions...');

    try {
      // Subscribe to all table changes with specific event handling
      await Promise.all([
        this.subscribeToTable('shifts'),
        this.subscribeToTable('workers'),
        this.subscribeToTable('parts'),
        this.subscribeToTable('tasks'),
        this.subscribeToTable('task_notes'),
        this.subscribeToTable('time_logs'),
        this.subscribeToTable('shift_reports'),
        this.subscribeToTable('start_checklists'),
        this.subscribeToTable('end_cleanups')
      ]);

      this.isInitialized = true;
      this.reconnectAttempts = 0;
      console.log('✅ Real-time subscriptions initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize real-time subscriptions:', error);
      this.scheduleReconnect();
    }
  }

  private subscribeToTable(tableName: string) {
    return new Promise<void>((resolve, reject) => {
      const channel = supabase
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            console.log(`📡 Real-time update for ${tableName}:`, payload.eventType);
            this.handleRealtimeUpdate(tableName, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${tableName} changes`);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Failed to subscribe to ${tableName}`);
            reject(new Error(`Failed to subscribe to ${tableName}`));
          }
        });

      this.subscriptions.push({
        unsubscribe: () => supabase.removeChannel(channel)
      });
    });
  }

  private handleRealtimeUpdate(tableName: string, payload: any) {
    const store = useShopStore.getState();
    
    // Handle different types of updates more efficiently
    switch (payload.eventType) {
      case 'INSERT':
        this.handleInsert(tableName, payload.new);
        break;
      case 'UPDATE':
        this.handleUpdate(tableName, payload.new, payload.old);
        break;
      case 'DELETE':
        this.handleDelete(tableName, payload.old);
        break;
      default:
        // Fallback to full refresh for unknown events
        store.loadCloudData();
    }
  }

  private handleInsert(tableName: string, newRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName) {
        case 'shifts':
          store.shifts = [...store.shifts, this.transformShift(newRecord)];
          break;
        case 'workers':
          store.workers = [...store.workers, this.transformWorker(newRecord)];
          break;
        case 'parts':
          store.parts = [...store.parts, this.transformPart(newRecord)];
          break;
        case 'tasks':
          store.tasks = [...store.tasks, this.transformTask(newRecord)];
          break;
        case 'task_notes':
          store.taskNotes = [...store.taskNotes, this.transformTaskNote(newRecord)];
          break;
        case 'time_logs':
          store.taskTimeLogs = [...store.taskTimeLogs, this.transformTimeLog(newRecord)];
          break;
        default:
          // For other tables, do a full refresh
          store.loadCloudData();
      }
      
      console.log(`➕ Added new ${tableName} record in real-time`);
      this.notifyUpdate(tableName, 'INSERT', newRecord);
    } catch (error) {
      console.error(`Error handling ${tableName} insert:`, error);
      store.loadCloudData(); // Fallback to full refresh
    }
  }

  private handleUpdate(tableName: string, newRecord: any, oldRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName) {
        case 'shifts':
          store.shifts = store.shifts.map(item => 
            item.id === newRecord.id ? this.transformShift(newRecord) : item
          );
          break;
        case 'workers':
          store.workers = store.workers.map(item => 
            item.id === newRecord.id ? this.transformWorker(newRecord) : item
          );
          break;
        case 'parts':
          store.parts = store.parts.map(item => 
            item.id === newRecord.id ? this.transformPart(newRecord) : item
          );
          break;
        case 'tasks':
          store.tasks = store.tasks.map(item => 
            item.id === newRecord.id ? this.transformTask(newRecord) : item
          );
          break;
        case 'task_notes':
          store.taskNotes = store.taskNotes.map(item => 
            item.id === newRecord.id ? this.transformTaskNote(newRecord) : item
          );
          break;
        case 'time_logs':
          store.taskTimeLogs = store.taskTimeLogs.map(item => 
            item.id === newRecord.id ? this.transformTimeLog(newRecord) : item
          );
          break;
        default:
          store.loadCloudData();
      }
      
      console.log(`📝 Updated ${tableName} record in real-time`);
      this.notifyUpdate(tableName, 'UPDATE', newRecord, oldRecord);
    } catch (error) {
      console.error(`Error handling ${tableName} update:`, error);
      store.loadCloudData();
    }
  }

  private handleDelete(tableName: string, deletedRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName) {
        case 'shifts':
          store.shifts = store.shifts.filter(item => item.id !== deletedRecord.id);
          break;
        case 'workers':
          store.workers = store.workers.filter(item => item.id !== deletedRecord.id);
          break;
        case 'parts':
          store.parts = store.parts.filter(item => item.id !== deletedRecord.id);
          break;
        case 'tasks':
          store.tasks = store.tasks.filter(item => item.id !== deletedRecord.id);
          break;
        case 'task_notes':
          store.taskNotes = store.taskNotes.filter(item => item.id !== deletedRecord.id);
          break;
        case 'time_logs':
          store.taskTimeLogs = store.taskTimeLogs.filter(item => item.id !== deletedRecord.id);
          break;
        default:
          store.loadCloudData();
      }
      
      console.log(`🗑️ Deleted ${tableName} record in real-time`);
      this.notifyUpdate(tableName, 'DELETE', deletedRecord);
    } catch (error) {
      console.error(`Error handling ${tableName} delete:`, error);
      store.loadCloudData();
    }
  }

  // Transform database records to application format
  private transformShift(dbRecord: any) {
    return {
      id: dbRecord.id,
      type: dbRecord.type,
      startTime: dbRecord.start_time,
      endTime: dbRecord.end_time
    };
  }

  private transformWorker(dbRecord: any) {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      role: dbRecord.role,
      shiftId: dbRecord.shift_id,
      isManual: dbRecord.is_manual
    };
  }

  private transformPart(dbRecord: any) {
    return {
      id: dbRecord.id,
      partNumber: dbRecord.part_number,
      revision: dbRecord.revision,
      material: dbRecord.material,
      coating: dbRecord.coating
    };
  }

  private transformTask(dbRecord: any) {
    // Extract work order number from description if it's formatted as [WO] description
    const match = dbRecord.description.match(/^\[([^\]]+)\]\s*(.*)$/);
    const workOrderNumber = match ? match[1] : `WO-${dbRecord.id.slice(-6)}`;
    const description = match ? match[2] : dbRecord.description;

    return {
      id: dbRecord.id,
      workOrderNumber,
      partId: dbRecord.part_id,
      description,
      estimatedDuration: dbRecord.estimated_duration,
      priority: dbRecord.priority,
      assignedWorkers: [], // Will be populated from a junction table in a full implementation
      shiftId: dbRecord.shift_id,
      status: dbRecord.status,
      carriedOverFromTaskId: dbRecord.carried_over_from_task_id,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      createdBy: dbRecord.created_by
    };
  }

  private transformTaskNote(dbRecord: any) {
    return {
      id: dbRecord.id,
      taskId: dbRecord.task_id,
      workerId: dbRecord.worker_id,
      noteText: dbRecord.note_text,
      timestamp: dbRecord.created_at
    };
  }

  private transformTimeLog(dbRecord: any) {
    return {
      id: dbRecord.id,
      taskId: dbRecord.task_id,
      workerId: dbRecord.worker_id,
      startTime: dbRecord.start_time,
      endTime: dbRecord.end_time,
      duration: dbRecord.duration
    };
  }

  private notifyUpdate(tableName: string, operation: string, newData?: any, oldData?: any) {
    // Dispatch custom events for components to listen to
    const event = new CustomEvent('realtimeUpdate', {
      detail: {
        table: tableName,
        operation,
        newData,
        oldData,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);
    
    // Show user-friendly notifications for important changes
    this.showUpdateNotification(tableName, operation, newData);
  }

  private showUpdateNotification(tableName: string, operation: string, data: any) {
    // Only show notifications for changes made by other users
    const currentUserId = useShopStore.getState().currentUser?.id;
    if (data?.created_by === currentUserId || data?.changed_by === currentUserId) {
      return; // Don't notify about our own changes
    }

    let message = '';
    switch (tableName) {
      case 'tasks':
        if (operation === 'INSERT') {
          message = `📋 New task added: ${data.workOrderNumber || 'Unknown'}`;
        } else if (operation === 'UPDATE') {
          message = `📝 Task updated: ${data.workOrderNumber || 'Unknown'}`;
        } else if (operation === 'DELETE') {
          message = `🗑️ Task deleted: ${data.workOrderNumber || 'Unknown'}`;
        }
        break;
      case 'workers':
        if (operation === 'INSERT') {
          message = `👷 New worker added: ${data.name}`;
        } else if (operation === 'DELETE') {
          message = `👷 Worker removed: ${data.name}`;
        }
        break;
      case 'task_notes':
        if (operation === 'INSERT') {
          message = `💬 New note added to task`;
        }
        break;
    }

    if (message) {
      // Create a subtle toast notification
      this.createToastNotification(message);
    }
  }

  private createToastNotification(message: string) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff with max 30s
    this.reconnectAttempts++;

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.cleanup();
      this.isInitialized = false;
      this.initialize();
    }, delay);
  }

  getConnectionStatus() {
    return {
      isInitialized: this.isInitialized,
      subscriptionCount: this.subscriptions.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  forceReconnect() {
    console.log('🔄 Forcing real-time reconnection...');
    this.cleanup();
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.initialize();
  }

  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.subscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    });
    
    this.subscriptions = [];
    this.isInitialized = false;
    console.log('🧹 Real-time subscriptions cleaned up');
  }
}

export const realtimeService = new RealtimeService();