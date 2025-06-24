import { supabase, hasValidCredentials } from './supabase';
import { useShopStore } from '../store/useShopStore';

interface RealtimeSubscription {
  unsubscribe: () => void;
}

class RealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private isInitialized = false;

  async initialize() {
    if (!hasValidCredentials() || this.isInitialized) {
      return;
    }

    console.log('Initializing real-time subscriptions...');

    // Subscribe to all table changes
    this.subscribeToTable('shifts');
    this.subscribeToTable('workers');
    this.subscribeToTable('parts');
    this.subscribeToTable('tasks');
    this.subscribeToTable('task_notes');
    this.subscribeToTable('time_logs');

    this.isInitialized = true;
  }

  private subscribeToTable(tableName: string) {
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
          console.log(`Real-time update for ${tableName}:`, payload);
          this.handleRealtimeUpdate(tableName, payload);
        }
      )
      .subscribe();

    this.subscriptions.push({
      unsubscribe: () => supabase.removeChannel(channel)
    });
  }

  private handleRealtimeUpdate(tableName: string, payload: any) {
    const store = useShopStore.getState();
    
    // Trigger a data refresh to get the latest state
    // This ensures all users see the same data immediately
    store.loadCloudData();
  }

  cleanup() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.isInitialized = false;
  }
}

export const realtimeService = new RealtimeService();