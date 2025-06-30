import { useEffect, useRef } from 'react';
import { syncManager } from '../services/syncManager';
import { enhancedPersistenceService } from '../services/enhancedPersistenceService';
import { useShopStore } from '../store/useShopStore';
import { hasValidCredentials } from '../services/supabase';

export const useAutoSync = () => {
  const initializationRef = useRef(false);
  const store = useShopStore();

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('🔄 Initializing auto-sync system...');

    // Initialize sync manager
    syncManager.initialize();

    // Setup automatic data saving
    const originalMethods = setupAutoSave();

    // Listen for data changes from other devices
    const handleDataChange = (event: CustomEvent) => {
      const { table, operation, data } = event.detail;
      console.log(`📡 Received data change: ${operation} on ${table}`);
      
      // Refresh store state if needed
      if (hasValidCredentials()) {
        store.refreshFromCloud();
      }
    };

    window.addEventListener('dataChange', handleDataChange as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('dataChange', handleDataChange as EventListener);
      restoreOriginalMethods(originalMethods);
      syncManager.cleanup();
    };
  }, [store]);

  const setupAutoSave = () => {
    // Store original methods
    const originalMethods = {
      addTask: store.addTask,
      updateTaskStatus: store.updateTaskStatus,
      deleteTask: store.deleteTask,
      addTaskNote: store.addTaskNote,
      addManualWorker: store.addManualWorker,
      deleteWorker: store.deleteWorker,
      addShift: store.addShift,
      updateShift: store.updateShift,
      deleteShift: store.deleteShift
    };

    // Wrap methods to use enhanced persistence
    store.addTask = function(taskData) {
      const result = originalMethods.addTask.call(this, taskData);
      enhancedPersistenceService.saveWithIntegrity('tasks', result, 'create');
      return result;
    };

    store.updateTaskStatus = function(taskId, status) {
      originalMethods.updateTaskStatus.call(this, taskId, status);
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        enhancedPersistenceService.saveWithIntegrity('tasks', task, 'update');
      }
    };

    store.deleteTask = function(taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      originalMethods.deleteTask.call(this, taskId);
      if (task) {
        enhancedPersistenceService.saveWithIntegrity('tasks', 
          { ...task, deleted_at: new Date().toISOString() }, 'delete');
      }
    };

    store.addTaskNote = function(note) {
      originalMethods.addTaskNote.call(this, note);
      const newNote = this.taskNotes[this.taskNotes.length - 1];
      if (newNote) {
        enhancedPersistenceService.saveWithIntegrity('task_notes', newNote, 'create');
      }
    };

    store.addManualWorker = function(name, shiftId) {
      const workerId = originalMethods.addManualWorker.call(this, name, shiftId);
      const worker = this.workers.find(w => w.id === workerId);
      if (worker) {
        enhancedPersistenceService.saveWithIntegrity('workers', worker, 'create');
      }
      return workerId;
    };

    store.deleteWorker = function(workerId) {
      const worker = this.workers.find(w => w.id === workerId);
      originalMethods.deleteWorker.call(this, workerId);
      if (worker) {
        enhancedPersistenceService.saveWithIntegrity('workers', 
          { ...worker, deleted_at: new Date().toISOString() }, 'delete');
      }
    };

    store.addShift = function(shift) {
      originalMethods.addShift.call(this, shift);
      const newShift = this.shifts[this.shifts.length - 1];
      if (newShift) {
        enhancedPersistenceService.saveWithIntegrity('shifts', newShift, 'create');
      }
    };

    store.updateShift = function(id, updates) {
      originalMethods.updateShift.call(this, id, updates);
      const shift = this.shifts.find(s => s.id === id);
      if (shift) {
        enhancedPersistenceService.saveWithIntegrity('shifts', shift, 'update');
      }
    };

    store.deleteShift = function(id) {
      const shift = this.shifts.find(s => s.id === id);
      originalMethods.deleteShift.call(this, id);
      if (shift) {
        enhancedPersistenceService.saveWithIntegrity('shifts', 
          { ...shift, deleted_at: new Date().toISOString() }, 'delete');
      }
    };

    return originalMethods;
  };

  const restoreOriginalMethods = (originalMethods: any) => {
    Object.assign(store, originalMethods);
  };

  return {
    syncStatus: syncManager.getStatus(),
    forceSyncAll: () => syncManager.forceSyncAll()
  };
};