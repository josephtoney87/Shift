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
        .channel(`${tableName as string}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName as string
          },
          (payload) => {
            console.log(`📡 Real-time update for ${tableName as string}:`, payload.eventType as string);
            this.handleRealtimeUpdate(tableName as string, payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${tableName as string} changes`);
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Failed to subscribe to ${tableName as string}`);
            reject(new Error(`Failed to subscribe to ${tableName as string}`));
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
    switch (payload.eventType as string) {
      case 'INSERT':
        this.handleInsert(tableName as string, payload.new);
        break;
      case 'UPDATE':
        this.handleUpdate(tableName as string, payload.new, payload.old);
        break;
      case 'DELETE':
        this.handleDelete(tableName as string, payload.old);
        break;
      default:
        // Fallback to full refresh for unknown events
        store.loadCloudData();
    }
  }

  private handleInsert(tableName: string, newRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName as string) {
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
      
      console.log(`➕ Added new ${tableName as string} record in real-time`);
      this.notifyUpdate(tableName as string, 'INSERT', newRecord);
    } catch (error) {
      console.error(`Error handling ${tableName as string} insert:`, error);
      store.loadCloudData(); // Fallback to full refresh
    }
  }

  private handleUpdate(tableName: string, newRecord: any, oldRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName as string) {
        case 'shifts':
          store.shifts = store.shifts.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformShift(newRecord) : item
          );
          break;
        case 'workers':
          store.workers = store.workers.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformWorker(newRecord) : item
          );
          break;
        case 'parts':
          store.parts = store.parts.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformPart(newRecord) : item
          );
          break;
        case 'tasks':
          store.tasks = store.tasks.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformTask(newRecord) : item
          );
          break;
        case 'task_notes':
          store.taskNotes = store.taskNotes.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformTaskNote(newRecord) : item
          );
          break;
        case 'time_logs':
          store.taskTimeLogs = store.taskTimeLogs.map(item => 
            (item.id as string) === (newRecord.id as string) ? this.transformTimeLog(newRecord) : item
          );
          break;
        default:
          store.loadCloudData();
      }
      
      console.log(`📝 Updated ${tableName as string} record in real-time`);
      this.notifyUpdate(tableName as string, 'UPDATE', newRecord, oldRecord);
    } catch (error) {
      console.error(`Error handling ${tableName as string} update:`, error);
      store.loadCloudData();
    }
  }

  private handleDelete(tableName: string, deletedRecord: any) {
    const store = useShopStore.getState();
    
    try {
      switch (tableName as string) {
        case 'shifts':
          store.shifts = store.shifts.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        case 'workers':
          store.workers = store.workers.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        case 'parts':
          store.parts = store.parts.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        case 'tasks':
          store.tasks = store.tasks.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        case 'task_notes':
          store.taskNotes = store.taskNotes.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        case 'time_logs':
          store.taskTimeLogs = store.taskTimeLogs.filter(item => (item.id as string) !== (deletedRecord.id as string));
          break;
        default:
          store.loadCloudData();
      }
      
      console.log(`🗑️ Deleted ${tableName as string} record in real-time`);
      this.notifyUpdate(tableName as string, 'DELETE', deletedRecord);
    } catch (error) {
      console.error(`Error handling ${tableName as string} delete:`, error);
      store.loadCloudData();
    }
  }

  // Transform database records to application format
  private transformShift(dbRecord: any) {
    return {
      id: dbRecord.id as string,
      type: dbRecord.type as any,
      startTime: dbRecord.start_time as string,
      endTime: dbRecord.end_time as string
    };
  }

  private transformWorker(dbRecord: any) {
    return {
      id: dbRecord.id as string,
      name: dbRecord.name as string,
      role: dbRecord.role as any,
      shiftId: dbRecord.shift_id as string,
      isManual: (dbRecord.is_manual || false) as boolean
    };
  }

  private transformPart(dbRecord: any) {
    return {
      id: dbRecord.id as string,
      partNumber: dbRecord.part_number as string,
      revision: dbRecord.revision as string,
      material: dbRecord.material as string,
      coating: (dbRecord.coating || undefined) as string | undefined
    };
  }

  private transformTask(dbRecord: any) {
    // Extract work order number from description if it's formatted as [WO] description
    const match = (dbRecord.description as string).match(/^\[([^\]]+)\]\s*(.*)$/);
    const workOrderNumber = match ? (match[1] as string) : `WO-${(dbRecord.id as string).slice(-6)}`;
    const description = match ? (match[2] as string) : (dbRecord.description as string);

    return {
      id: dbRecord.id as string,
      workOrderNumber: workOrderNumber as string,
      partId: dbRecord.part_id as string,
      description: description as string,
      estimatedDuration: dbRecord.estimated_duration as number,
      priority: dbRecord.priority as any,
      assignedWorkers: [] as string[], // Will be populated from a junction table in a full implementation
      shiftId: dbRecord.shift_id as string,
      status: dbRecord.status as any,
      carriedOverFromTaskId: (dbRecord.carried_over_from_task_id || undefined) as string | undefined,
      createdAt: dbRecord.created_at as string,
      updatedAt: dbRecord.updated_at as string,
      createdBy: (dbRecord.created_by || undefined) as string | undefined
    };
  }

  private transformTaskNote(dbRecord: any) {
    return {
      id: dbRecord.id as string,
      taskId: dbRecord.task_id as string,
      workerId: dbRecord.worker_id as string,
      noteText: dbRecord.note_text as string,
      timestamp: dbRecord.created_at as string
    };
  }

  private transformTimeLog(dbRecord: any) {
    return {
      id: dbRecord.id as string,
      taskId: dbRecord.task_id as string,
      workerId: dbRecord.worker_id as string,
      startTime: dbRecord.start_time as string,
      endTime: (dbRecord.end_time || undefined) as string | undefined,
      duration: (dbRecord.duration || undefined) as number | undefined
    };
  }

  private notifyUpdate(tableName: string, operation: string, newData?: any, oldData?: any) {
    // Dispatch custom events for components to listen to
    const event = new CustomEvent('realtimeUpdate', {
      detail: {
        table: tableName as string,
        operation: operation as string,
        newData,
        oldData,
        timestamp: new Date().toISOString() as string
      }
    });
    
    window.dispatchEvent(event);
    
    // Show user-friendly notifications for important changes
    this.showUpdateNotification(tableName as string, operation as string, newData);
  }

  private showUpdateNotification(tableName: string, operation: string, data: any) {
    // Only show notifications for changes made by other users
    const currentUserId = useShopStore.getState().currentUser?.id as string | undefined;
    if ((data?.created_by as string) === currentUserId || (data?.changed_by as string) === currentUserId) {
      return; // Don't notify about our own changes
    }

    let message = '';
    switch (tableName as string) {
      case 'tasks':
        if ((operation as string) === 'INSERT') {
          message = `📋 New task added: ${(data.workOrderNumber as string) || 'Unknown'}`;
        } else if ((operation as string) === 'UPDATE') {
          message = `📝 Task updated: ${(data.workOrderNumber as string) || 'Unknown'}`;
        } else if ((operation as string) === 'DELETE') {
          message = `🗑️ Task deleted: ${(data.workOrderNumber as string) || 'Unknown'}`;
        }
        break;
      case 'workers':
        if ((operation as string) === 'INSERT') {
          message = `👷 New worker added: ${data.name as string}`;
        } else if ((operation as string) === 'DELETE') {
          message = `👷 Worker removed: ${data.name as string}`;
        }
        break;
      case 'task_notes':
        if ((operation as string) === 'INSERT') {
          message = `💬 New note added to task`;
        }
        break;
    }

    if (message) {
      // Create a subtle toast notification
      this.createToastNotification(message as string);
    }
  }

  private createToastNotification(message: string) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message as string;
    
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

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) as number; // Exponential backoff with max 30s
    this.reconnectAttempts++;

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts as number} in ${delay as number}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.cleanup();
      this.isInitialized = false;
      this.initialize();
    }, delay as number);
  }

  getConnectionStatus() {
    return {
      isInitialized: this.isInitialized as boolean,
      subscriptionCount: this.subscriptions.length as number,
      reconnectAttempts: this.reconnectAttempts as number
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
      clearTimeout(this.reconnectTimeout as number);
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