import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { 
  Shift, Worker, Part, Task, TaskNote, TaskTimeLog, ShiftReport, User,
  TaskStatus, TaskPriority, WorkerRole, ShiftType, ViewMode
} from '../types';
import { mockShifts, mockWorkers, mockParts, mockTasks, mockTaskNotes, mockTaskTimeLogs, mockShiftReports, mockUsers } from '../data/mockData';
import { persistenceService } from '../services/persistenceService';
import { realtimeService } from '../services/realtimeService';
import { hasValidCredentials } from '../services/supabase';
import {
  saveShift, saveWorker, savePart, saveTask, saveTaskNote, saveTimeLog,
  deleteShift as dbDeleteShift, deleteWorker as dbDeleteWorker, deleteTask as dbDeleteTask,
  saveStartChecklist, saveEndCleanup, syncAllData, loadAllCloudData
} from '../services/supabaseOperations';

interface ChecklistAcknowledgment {
  shiftId: string;
  date: string;
  acknowledgedWorkers: string[];
  completedAt?: string;
  completedBy?: string;
}

interface ShopState {
  // Data
  shifts: Shift[];
  workers: Worker[];
  parts: Part[];
  tasks: Task[];
  taskNotes: TaskNote[];
  taskTimeLogs: TaskTimeLog[];
  shiftReports: ShiftReport[];
  users: User[];
  
  // UI State
  selectedTaskId: string | null;
  isTaskModalOpen: boolean;
  selectedDate: string;
  currentUser: User | null;
  viewMode: ViewMode;
  startChecklistStatus: Record<string, ChecklistAcknowledgment>;
  endCleanupStatus: Record<string, ChecklistAcknowledgment>;
  
  // Sync state
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingChanges: string[];
  isInitialized: boolean;
  autoSyncEnabled: boolean;
  realtimeConnected: boolean;
  
  // Actions
  setSelectedTaskId: (id: string | null) => void;
  setTaskModalOpen: (isOpen: boolean) => void;
  setSelectedDate: (date: string) => void;
  setCurrentUser: (user: User) => void;
  setViewMode: (mode: ViewMode) => void;
  
  // Sync actions
  initializeApp: () => Promise<void>;
  syncData: () => Promise<void>;
  loadCloudData: () => Promise<void>;
  forceSyncAllData: () => Promise<boolean>;
  markPendingChange: (changeId: string) => void;
  refreshFromCloud: () => Promise<void>;
  
  // User actions
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => void;
  deleteUser: (userId: string) => void;
  
  // Shift actions
  addShift: (shift: Omit<Shift, 'id'>) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  
  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  moveTaskToShift: (taskId: string, newShiftId: string) => void;
  carryOverTask: (taskId: string, newShiftId: string) => void;
  
  // Worker actions
  addManualWorker: (name: string, shiftId: string) => string;
  assignWorkerToTask: (taskId: string, workerId: string) => void;
  removeWorkerFromTask: (taskId: string, workerId: string) => void;
  deleteWorker: (workerId: string) => void;
  
  // Time tracking
  startTaskTimer: (taskId: string, workerId: string) => void;
  stopTaskTimer: (taskId: string) => void;
  
  // Notes
  addTaskNote: (note: Omit<TaskNote, 'id' | 'timestamp'>) => void;
  
  // Reports
  generateHandoverReport: (shiftId: string, date: string) => void;
  acknowledgeHandoverReport: (reportId: string, workerId: string) => void;
  
  // Utilities
  getTaskSummaryForDate: (date: string) => {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    carriedOver: number;
  };
  getExpandedTask: (taskId: string) => (Task & { 
    part: Part;
    workers: Worker[];
    timeLogs?: TaskTimeLog[];
    activeTimeLog?: TaskTimeLog;
    totalDuration?: number;
  }) | null;
  getTaskNotesByTaskId: (taskId: string) => TaskNote[];
  getFilteredTasks: () => Task[];
  
  // Checklists
  createStartOfShiftChecklist: (data: any) => void;
  createEndOfShiftCleanup: (data: any) => void;
  acknowledgeStartChecklist: (shiftId: string, date: string, workerId: string) => void;
  acknowledgeEndCleanup: (shiftId: string, date: string, workerId: string) => void;
  isStartChecklistComplete: (shiftId: string, date: string) => boolean;
  isEndCleanupComplete: (shiftId: string, date: string) => boolean;
  getStartChecklistAcknowledgments: (shiftId: string, date: string) => string[];
  getEndCleanupAcknowledgments: (shiftId: string, date: string) => string[];
  getCarriedOverTasks: (date: string) => Task[];
  
  // Print
  printTask: (taskId: string) => void;
}

// Default user - use Daniel Lerner as default since he's on 2nd shift
const defaultUser: User = mockUsers.find(u => u.name === 'Daniel Lerner') || mockUsers[0];

// Network status detection
const isOnline = () => {
  return navigator.onLine;
};

export const useShopStore = create(
  persist<ShopState>(
    (set, get) => ({
      shifts: mockShifts,
      workers: mockWorkers,
      parts: mockParts,
      tasks: mockTasks,
      taskNotes: mockTaskNotes,
      taskTimeLogs: mockTaskTimeLogs,
      shiftReports: mockShiftReports,
      users: mockUsers,
      selectedTaskId: null,
      isTaskModalOpen: false,
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      currentUser: defaultUser,
      viewMode: ViewMode.MY_VIEW,
      startChecklistStatus: {},
      endCleanupStatus: {},
      isOnline: isOnline(),
      lastSyncTime: null,
      pendingChanges: [],
      isInitialized: false,
      autoSyncEnabled: true,
      realtimeConnected: false,
      
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setTaskModalOpen: (isOpen) => set({ isTaskModalOpen: isOpen }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setViewMode: (mode) => set({ viewMode: mode }),
      
      markPendingChange: (changeId) => {
        set((state) => ({
          pendingChanges: [...new Set([...state.pendingChanges, changeId])]
        }));
      },

      initializeApp: async () => {
        const state = get();
        if (state.isInitialized) return;

        console.log('🚀 Initializing CNC Shop Management application...');
        
        try {
          // Initialize real-time subscriptions if credentials are available
          if (hasValidCredentials()) {
            await realtimeService.initialize();
            set({ realtimeConnected: true });
            console.log('📡 Real-time subscriptions initialized');
          }
          
          // Load initial data (will load from cloud if available, local otherwise)
          await state.loadCloudData();
          
          set({ 
            isInitialized: true,
            lastSyncTime: new Date().toISOString()
          });
          
          console.log('✅ Application initialized successfully');

          // Setup real-time event listeners
          window.addEventListener('realtimeUpdate', ((event: CustomEvent) => {
            const { table, operation, newData, oldData } = event.detail;
            console.log(`📡 Real-time update received: ${operation} on ${table}`);
            
            // The realtimeService already handles updating the store directly
            // This event can be used for additional UI updates or notifications
          }) as EventListener);

        } catch (error) {
          console.error('❌ Failed to initialize application:', error);
          set({ isInitialized: true }); // Mark as initialized even if failed
        }
      },
      
      syncData: async () => {
        const state = get();
        if (!hasValidCredentials() || !isOnline()) {
          console.log('❌ Cannot sync - no connection or credentials');
          return;
        }
        
        try {
          console.log('🔄 Starting comprehensive data sync...');
          
          // First sync all current state to cloud
          await syncAllData({
            shifts: state.shifts,
            workers: state.workers,
            parts: state.parts,
            tasks: state.tasks,
            taskNotes: state.taskNotes,
            taskTimeLogs: state.taskTimeLogs
          });
          
          // Then sync pending operations
          await persistenceService.syncPendingOperations();
          
          set({
            lastSyncTime: new Date().toISOString(),
            pendingChanges: []
          });
          
          console.log('✅ Data synced successfully');
        } catch (error) {
          console.error('❌ Sync failed:', error);
          throw error;
        }
      },
      
      loadCloudData: async () => {
        try {
          console.log('📥 Loading data...');
          const data = await persistenceService.loadAllData();
          
          if (data) {
            // Merge with default data to ensure we have the predefined workers
            const mergedData = {
              ...data,
              users: data.users && data.users.length > 0 ? data.users : mockUsers,
              workers: data.workers && data.workers.length > 0 ? data.workers : mockWorkers,
              shifts: data.shifts && data.shifts.length > 0 ? data.shifts : mockShifts,
              parts: data.parts && data.parts.length > 0 ? data.parts : mockParts
            };
            
            set({
              ...mergedData,
              lastSyncTime: new Date().toISOString(),
              pendingChanges: []
            });
            console.log('✅ Data loaded successfully');
          }
        } catch (error) {
          console.error('❌ Failed to load data:', error);
          // Continue with existing state
        }
      },

      refreshFromCloud: async () => {
        if (!hasValidCredentials()) {
          console.log('❌ Cannot refresh - no cloud credentials');
          return;
        }

        try {
          console.log('🔄 Refreshing data from cloud...');
          const cloudData = await loadAllCloudData();
          
          if (cloudData) {
            // Merge with defaults to preserve predefined workers
            const mergedData = {
              ...cloudData,
              users: cloudData.users && cloudData.users.length > 0 ? cloudData.users : mockUsers,
              workers: cloudData.workers && cloudData.workers.length > 0 ? cloudData.workers : mockWorkers,
              shifts: cloudData.shifts && cloudData.shifts.length > 0 ? cloudData.shifts : mockShifts,
              parts: cloudData.parts && cloudData.parts.length > 0 ? cloudData.parts : mockParts
            };
            
            set({
              ...mergedData,
              lastSyncTime: new Date().toISOString()
            });
            console.log('✅ Data refreshed from cloud');
          }
        } catch (error) {
          console.error('❌ Failed to refresh from cloud:', error);
        }
      },

      forceSyncAllData: async () => {
        const state = get();
        console.log('💫 Force syncing all data to cloud...');
        
        const success = await persistenceService.forceSyncAll({
          shifts: state.shifts,
          workers: state.workers,
          parts: state.parts,
          tasks: state.tasks,
          taskNotes: state.taskNotes,
          taskTimeLogs: state.taskTimeLogs
        });

        if (success) {
          set({
            lastSyncTime: new Date().toISOString(),
            pendingChanges: []
          });
        }

        return success;
      },
      
      addUser: (userData) => {
        const newUser: User = {
          id: uuidv4(),
          ...userData,
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          users: [...state.users, newUser]
        }));
        
        get().markPendingChange(`user-${newUser.id}`);
      },
      
      deleteUser: (userId) => {
        set((state) => {
          const userToDelete = state.users.find(u => u.id === userId);
          if (!userToDelete) return state;
          
          const updatedTasks = state.tasks.filter(task => task.createdBy !== userId);
          
          let newCurrentUser = state.currentUser;
          if (state.currentUser?.id === userId) {
            newCurrentUser = state.users.find(u => u.id !== userId) || state.users[0];
          }
          
          return {
            ...state,
            users: state.users.filter(u => u.id !== userId),
            tasks: updatedTasks,
            currentUser: newCurrentUser
          };
        });
        
        get().markPendingChange(`user-delete-${userId}`);
      },
      
      addShift: (shift) => {
        const newShift: Shift = {
          id: uuidv4(),
          ...shift
        };
        set((state) => ({
          shifts: [...state.shifts, newShift]
        }));
        
        // Automatically save to cloud/local with improved persistence
        persistenceService.saveData('shifts', newShift, 'create');
      },
      
      updateShift: (id, updates) => {
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            shift.id === id ? { ...shift, ...updates } : shift
          )
        }));
        
        const updatedShift = get().shifts.find(s => s.id === id);
        if (updatedShift) {
          persistenceService.saveData('shifts', updatedShift, 'update');
        }
      },
      
      deleteShift: (id) => {
        const shiftToDelete = get().shifts.find(s => s.id === id);
        set((state) => ({
          shifts: state.shifts.filter((shift) => shift.id !== id)
        }));
        
        if (shiftToDelete) {
          persistenceService.saveData('shifts', { ...shiftToDelete, deleted_at: new Date().toISOString() }, 'delete');
        }
      },
      
      addTask: (taskData) => {
        const state = get();
        
        const existingTask = state.tasks.find(
          task => task.workOrderNumber.toLowerCase() === taskData.workOrderNumber.toLowerCase()
        );
        
        if (existingTask) {
          throw new Error(`Work order ${taskData.workOrderNumber} already exists`);
        }
        
        const newPart: Part = {
          id: uuidv4(),
          partNumber: taskData.workOrderNumber,
          revision: 'N/A',
          material: 'N/A',
          coating: undefined
        };
        
        set(state => ({
          parts: [...state.parts, newPart]
        }));
        
        // Auto-save part to cloud/local
        persistenceService.saveData('parts', newPart, 'create');

        const newTask: Task = {
          id: uuidv4(),
          workOrderNumber: taskData.workOrderNumber || `WO-${Date.now()}`,
          partId: newPart.id,
          description: taskData.description,
          estimatedDuration: taskData.estimatedDuration,
          priority: taskData.priority,
          assignedWorkers: taskData.assignedWorkers || [],
          shiftId: taskData.shiftId,
          status: TaskStatus.PENDING,
          createdAt: taskData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: state.currentUser?.id || 'unknown'
        };

        set(state => ({
          tasks: [...state.tasks, newTask]
        }));
        
        // Auto-save task to cloud/local
        persistenceService.saveData('tasks', newTask, 'create');

        return newTask;
      },
      
      updateTaskStatus: (taskId, status) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, status, updatedAt: new Date().toISOString() }
              : task
          )
        }));
        
        const updatedTask = get().tasks.find(t => t.id === taskId);
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask, 'update');
        }
      },
      
      deleteTask: (taskId) => {
        const taskToDelete = get().tasks.find(t => t.id === taskId);
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId)
        }));
        
        if (taskToDelete) {
          persistenceService.saveData('tasks', { ...taskToDelete, deleted_at: new Date().toISOString() }, 'delete');
        }
      },
      
      moveTaskToShift: (taskId, newShiftId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, shiftId: newShiftId, updatedAt: new Date().toISOString() }
              : task
          )
        }));
        
        const updatedTask = get().tasks.find(t => t.id === taskId);
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask, 'update');
        }
      },
      
      carryOverTask: (taskId, newShiftId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  shiftId: newShiftId,
                  status: TaskStatus.PENDING,
                  updatedAt: new Date().toISOString()
                }
              : task
          )
        }));
        
        const updatedTask = get().tasks.find(t => t.id === taskId);
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask, 'update');
        }
      },
      
      addManualWorker: (name, shiftId) => {
        const workerId = uuidv4();
        const newWorker: Worker = {
          id: workerId,
          name,
          role: WorkerRole.OPERATOR,
          shiftId,
          isManual: true
        };
        
        set((state) => ({
          workers: [...state.workers, newWorker]
        }));
        
        persistenceService.saveData('workers', newWorker, 'create');
        
        return workerId;
      },
      
      assignWorkerToTask: (taskId, workerId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  assignedWorkers: [...new Set([...task.assignedWorkers, workerId])],
                  updatedAt: new Date().toISOString()
                }
              : task
          )
        }));
        
        const updatedTask = get().tasks.find(t => t.id === taskId);
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask, 'update');
        }
      },
      
      removeWorkerFromTask: (taskId, workerId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  assignedWorkers: task.assignedWorkers.filter((id) => id !== workerId),
                  updatedAt: new Date().toISOString()
                }
              : task
          )
        }));
        
        const updatedTask = get().tasks.find(t => t.id === taskId);
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask, 'update');
        }
      },

      deleteWorker: (workerId) => {
        const workerToDelete = get().workers.find(w => w.id === workerId);
        set((state) => ({
          workers: state.workers.filter((w) => w.id !== workerId),
          tasks: state.tasks.map((task) => ({
            ...task,
            assignedWorkers: task.assignedWorkers.filter((id) => id !== workerId)
          }))
        }));
        
        if (workerToDelete) {
          persistenceService.saveData('workers', { ...workerToDelete, deleted_at: new Date().toISOString() }, 'delete');
        }
      },
      
      startTaskTimer: (taskId, workerId) => {
        const timeLogId = uuidv4();
        const newTimeLog: TaskTimeLog = {
          id: timeLogId,
          taskId,
          workerId,
          startTime: new Date().toISOString()
        };
        
        set((state) => ({
          taskTimeLogs: [...state.taskTimeLogs, newTimeLog]
        }));
        
        persistenceService.saveData('time_logs', newTimeLog, 'create');
      },
      
      stopTaskTimer: (taskId) => {
        const updatedTimeLog = get().taskTimeLogs.find(log => 
          log.taskId === taskId && !log.endTime
        );
        
        if (updatedTimeLog) {
          const endTime = new Date().toISOString();
          const duration = Math.round(
            (new Date(endTime).getTime() - new Date(updatedTimeLog.startTime).getTime()) / 60000
          );
          
          set((state) => ({
            taskTimeLogs: state.taskTimeLogs.map((log) =>
              log.id === updatedTimeLog.id
                ? { ...log, endTime, duration }
                : log
            )
          }));
          
          const finalTimeLog = { ...updatedTimeLog, endTime, duration };
          persistenceService.saveData('time_logs', finalTimeLog, 'update');
        }
      },
      
      addTaskNote: (note) => {
        const newNote: TaskNote = {
          id: uuidv4(),
          ...note,
          timestamp: new Date().toISOString()
        };
        
        set((state) => ({
          taskNotes: [...state.taskNotes, newNote]
        }));
        
        persistenceService.saveData('task_notes', newNote, 'create');
      },
      
      generateHandoverReport: (shiftId, date) => {
        const state = get();
        const shift = state.shifts.find((s) => s.id === shiftId);
        if (!shift) return;
        
        const shiftTasks = state.tasks.filter((t) => 
          t.shiftId === shiftId && t.createdAt.startsWith(date)
        );
        
        const completedTasks = shiftTasks
          .filter((t) => t.status === TaskStatus.COMPLETED)
          .map((task) => {
            const part = state.parts.find((p) => p.id === task.partId);
            const completedLog = state.taskTimeLogs
              .filter((log) => log.taskId === task.id && log.endTime)
              .sort((a, b) => 
                new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime()
              )[0];
              
            return {
              taskId: task.id,
              workOrderNumber: task.workOrderNumber,
              partNumber: part?.partNumber || 'Unknown',
              description: task.description,
              completedAt: completedLog?.endTime || task.updatedAt,
              completedBy: task.assignedWorkers
            };
          });
          
        const carriedOverTasks = shiftTasks
          .filter((t) => t.status !== TaskStatus.COMPLETED)
          .map((task) => {
            const part = state.parts.find((p) => p.id === task.partId);
            const totalTime = state.taskTimeLogs
              .filter((log) => log.taskId === task.id && log.duration)
              .reduce((sum, log) => sum + (log.duration || 0), 0);
              
            return {
              taskId: task.id,
              workOrderNumber: task.workOrderNumber,
              partNumber: part?.partNumber || 'Unknown',
              description: task.description,
              reason: 'Insufficient time to complete',
              progress: Math.min(totalTime / task.estimatedDuration, 1)
            };
          });
          
        const idleEvents = state.taskTimeLogs
          .filter((log) => {
            const task = shiftTasks.find((t) => t.id === log.taskId);
            return task && log.endTime;
          })
          .map((log) => ({
            taskId: log.taskId,
            workerId: log.workerId,
            startTime: log.startTime,
            endTime: log.endTime!,
            duration: log.duration || 0
          }));
          
        const totalTime = idleEvents.reduce((sum, event) => sum + event.duration, 0);
        const idleTime = idleEvents
          .filter((event) => event.duration > 30)
          .reduce((sum, event) => sum + event.duration, 0);
          
        const handoverReport = {
          id: uuidv4(),
          shiftId,
          date,
          completedTasks,
          carriedOverTasks,
          idleEvents,
          metrics: {
            totalCompletedTasks: completedTasks.length,
            totalCarriedOver: carriedOverTasks.length,
            totalIdleTime: idleTime,
            shiftUtilization: totalTime ? (totalTime - idleTime) / totalTime : 1
          },
          notes: '',
          generatedBy: state.workers[0].id,
          generatedAt: new Date().toISOString()
        };
        
        set((state) => ({
          shiftReports: [
            ...state.shiftReports,
            {
              id: uuidv4(),
              shiftId,
              date,
              completedTasksCount: completedTasks.length,
              pendingTasksCount: carriedOverTasks.length,
              summaryNotes: '',
              handoverReport
            }
          ]
        }));
      },
      
      acknowledgeHandoverReport: (reportId, workerId) => {
        set((state) => ({
          shiftReports: state.shiftReports.map((report) =>
            report.id === reportId && report.handoverReport
              ? {
                  ...report,
                  handoverReport: {
                    ...report.handoverReport,
                    acknowledgedBy: workerId,
                    acknowledgedAt: new Date().toISOString()
                  }
                }
              : report
          )
        }));
      },
      
      getTaskSummaryForDate: (date) => {
        const state = get();
        let tasks = state.tasks.filter((t) => t.createdAt.startsWith(date));
        
        if (state.viewMode === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => t.createdBy === state.currentUser?.id);
        }
        
        return {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
          inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
          pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
          carriedOver: tasks.filter((t) => t.carriedOverFromTaskId).length
        };
      },
      
      getExpandedTask: (taskId) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return null;
        
        const part = state.parts.find((p) => p.id === task.partId);
        if (!part) return null;
        
        const workers = state.workers.filter((w) => task.assignedWorkers.includes(w.id));
        const timeLogs = state.taskTimeLogs.filter((log) => log.taskId === taskId);
        const activeTimeLog = timeLogs.find((log) => !log.endTime);
        const totalDuration = timeLogs
          .filter((log) => log.duration)
          .reduce((sum, log) => sum + (log.duration || 0), 0);
          
        return {
          ...task,
          part,
          workers,
          timeLogs,
          activeTimeLog,
          totalDuration
        };
      },
      
      getTaskNotesByTaskId: (taskId) => {
        return get().taskNotes
          .filter((note) => note.taskId === taskId)
          .sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
      },
      
      getFilteredTasks: () => {
        const state = get();
        let tasks = state.tasks;
        
        if (state.viewMode === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => t.createdBy === state.currentUser?.id);
        }
        
        return tasks;
      },
      
      createStartOfShiftChecklist: (data) => {
        const { shiftId, date } = data;
        const key = `${shiftId}-${date}`;
        
        set((state) => ({
          startChecklistStatus: {
            ...state.startChecklistStatus,
            [key]: {
              shiftId,
              date,
              acknowledgedWorkers: [],
              completedAt: new Date().toISOString(),
              completedBy: state.currentUser?.id
            }
          }
        }));
        
        saveStartChecklist(data).catch(error => {
          console.error('Failed to save start checklist:', error);
          get().markPendingChange(`start-checklist-${key}`);
        });
      },
      
      createEndOfShiftCleanup: (data) => {
        const { shiftId, date } = data;
        const key = `${shiftId}-${date}`;
        
        set((state) => ({
          endCleanupStatus: {
            ...state.endCleanupStatus,
            [key]: {
              shiftId,
              date,
              acknowledgedWorkers: [],
              completedAt: new Date().toISOString(),
              completedBy: state.currentUser?.id
            }
          }
        }));
        
        saveEndCleanup(data).catch(error => {
          console.error('Failed to save end cleanup:', error);
          get().markPendingChange(`end-cleanup-${key}`);
        });
      },

      acknowledgeStartChecklist: (shiftId, date, workerId) => {
        const key = `${shiftId}-${date}`;
        set((state) => {
          const current = state.startChecklistStatus[key];
          if (!current) return state;
          
          const acknowledgedWorkers = [...new Set([...current.acknowledgedWorkers, workerId])];
          
          return {
            ...state,
            startChecklistStatus: {
              ...state.startChecklistStatus,
              [key]: {
                ...current,
                acknowledgedWorkers
              }
            }
          };
        });
      },

      acknowledgeEndCleanup: (shiftId, date, workerId) => {
        const key = `${shiftId}-${date}`;
        set((state) => {
          const current = state.endCleanupStatus[key];
          if (!current) return state;
          
          const acknowledgedWorkers = [...new Set([...current.acknowledgedWorkers, workerId])];
          
          return {
            ...state,
            endCleanupStatus: {
              ...state.endCleanupStatus,
              [key]: {
                ...current,
                acknowledgedWorkers
              }
            }
          };
        });
      },

      isStartChecklistComplete: (shiftId: string, date: string) => {
        const key = `${shiftId}-${date}`;
        const checklist = get().startChecklistStatus[key];
        if (!checklist) return false;
        
        const shiftWorkers = get().workers.filter(w => w.shiftId === shiftId);
        if (shiftWorkers.length === 0) return !!checklist.completedAt;
        
        return shiftWorkers.every(worker => 
          checklist.acknowledgedWorkers.includes(worker.id)
        );
      },

      isEndCleanupComplete: (shiftId: string, date: string) => {
        const key = `${shiftId}-${date}`;
        const cleanup = get().endCleanupStatus[key];
        if (!cleanup) return false;
        
        const shiftWorkers = get().workers.filter(w => w.shiftId === shiftId);
        if (shiftWorkers.length === 0) return !!cleanup.completedAt;
        
        return shiftWorkers.every(worker => 
          cleanup.acknowledgedWorkers.includes(worker.id)
        );
      },

      getStartChecklistAcknowledgments: (shiftId: string, date: string) => {
        const key = `${shiftId}-${date}`;
        return get().startChecklistStatus[key]?.acknowledgedWorkers || [];
      },

      getEndCleanupAcknowledgments: (shiftId: string, date: string) => {
        const key = `${shiftId}-${date}`;
        return get().endCleanupStatus[key]?.acknowledgedWorkers || [];
      },

      getCarriedOverTasks: (date: string) => {
        const state = get();
        let tasks = state.tasks.filter(task => 
          task.carriedOverFromTaskId && 
          task.createdAt.startsWith(date)
        );
        
        if (state.viewMode === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => t.createdBy === state.currentUser?.id);
        }
        
        return tasks;
      },
      
      printTask: (taskId) => {
        const task = get().getExpandedTask(taskId);
        if (!task) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Task ${task.workOrderNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .section { margin: 20px 0; }
                .label { font-weight: bold; }
              </style>
            </head>
            <body>
              <h1>Task Details: ${task.workOrderNumber}</h1>
              
              <div class="section">
                <div class="label">Part Number:</div>
                <div>${task.part.partNumber} (${task.part.revision})</div>
              </div>
              
              <div class="section">
                <div class="label">Description:</div>
                <div>${task.description}</div>
              </div>
              
              <div class="section">
                <div class="label">Status:</div>
                <div>${task.status}</div>
              </div>
              
              <div class="section">
                <div class="label">Priority:</div>
                <div>${task.priority}</div>
              </div>
              
              <div class="section">
                <div class="label">Estimated Duration:</div>
                <div>${task.estimatedDuration} minutes</div>
              </div>
              
              <div class="section">
                <div class="label">Assigned Workers:</div>
                <div>${task.workers.map(w => w.name).join(', ') || 'None'}</div>
              </div>
              
              ${task.totalDuration ? `
                <div class="section">
                  <div class="label">Total Time Spent:</div>
                  <div>${task.totalDuration} minutes</div>
                </div>
              ` : ''}
            </body>
          </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    }),
    {
      name: 'shop-storage',
      partialize: (state) => ({
        shifts: state.shifts,
        workers: state.workers,
        parts: state.parts,
        tasks: state.tasks,
        taskNotes: state.taskNotes,
        taskTimeLogs: state.taskTimeLogs,
        shiftReports: state.shiftReports,
        users: state.users,
        currentUser: state.currentUser,
        viewMode: state.viewMode,
        startChecklistStatus: state.startChecklistStatus,
        endCleanupStatus: state.endCleanupStatus,
        lastSyncTime: state.lastSyncTime,
        pendingChanges: state.pendingChanges,
        autoSyncEnabled: state.autoSyncEnabled
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure currentUser is always defined and has a valid id after rehydration
          if (!state.currentUser || !state.currentUser.id) {
            state.currentUser = defaultUser;
          }
          
          // Ensure we have the predefined workers and users
          if (!state.users || state.users.length === 0) {
            state.users = mockUsers;
          }
          if (!state.workers || state.workers.length === 0) {
            state.workers = mockWorkers;
          }
          if (!state.shifts || state.shifts.length === 0) {
            state.shifts = mockShifts;
          }
          
          // Initialize the app after rehydration
          setTimeout(() => {
            state.initializeApp();
          }, 100);
        }
      }
    }
  )
);