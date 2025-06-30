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
const defaultUser: User = (mockUsers.find(u => (u.name as string) === 'Daniel Lerner') || mockUsers[0]) as User;

// Network status detection
const isOnline = (): boolean => {
  return navigator.onLine as boolean;
};

export const useShopStore = create(
  persist<ShopState>(
    (set, get) => ({
      shifts: mockShifts as Shift[],
      workers: mockWorkers as Worker[],
      parts: mockParts as Part[],
      tasks: mockTasks as Task[],
      taskNotes: mockTaskNotes as TaskNote[],
      taskTimeLogs: mockTaskTimeLogs as TaskTimeLog[],
      shiftReports: mockShiftReports as ShiftReport[],
      users: mockUsers as User[],
      selectedTaskId: null as string | null,
      isTaskModalOpen: false as boolean,
      selectedDate: format(new Date(), 'yyyy-MM-dd') as string,
      currentUser: defaultUser as User,
      viewMode: ViewMode.MY_VIEW as ViewMode,
      startChecklistStatus: {} as Record<string, ChecklistAcknowledgment>,
      endCleanupStatus: {} as Record<string, ChecklistAcknowledgment>,
      isOnline: isOnline() as boolean,
      lastSyncTime: null as string | null,
      pendingChanges: [] as string[],
      isInitialized: false as boolean,
      autoSyncEnabled: true as boolean,
      realtimeConnected: false as boolean,
      
      setSelectedTaskId: (id: string | null) => set({ selectedTaskId: id as string | null }),
      setTaskModalOpen: (isOpen: boolean) => set({ isTaskModalOpen: isOpen as boolean }),
      setSelectedDate: (date: string) => set({ selectedDate: date as string }),
      setCurrentUser: (user: User) => set({ currentUser: user as User }),
      setViewMode: (mode: ViewMode) => set({ viewMode: mode as ViewMode }),
      
      markPendingChange: (changeId: string) => {
        set((state) => ({
          pendingChanges: [...new Set([...state.pendingChanges, changeId as string])] as string[]
        }));
      },

      initializeApp: async () => {
        const state = get();
        if (state.isInitialized as boolean) return;

        console.log('🚀 Initializing CNC Shop Management application...');
        
        try {
          // Initialize real-time subscriptions if credentials are available
          if (hasValidCredentials()) {
            await realtimeService.initialize();
            set({ realtimeConnected: true as boolean });
            console.log('📡 Real-time subscriptions initialized');
          }
          
          // Load initial data (will load from cloud if available, local otherwise)
          await state.loadCloudData();
          
          set({ 
            isInitialized: true as boolean,
            lastSyncTime: new Date().toISOString() as string
          });
          
          console.log('✅ Application initialized successfully');

          // Setup real-time event listeners
          window.addEventListener('realtimeUpdate', ((event: CustomEvent) => {
            const { table, operation, newData, oldData } = event.detail;
            console.log(`📡 Real-time update received: ${operation as string} on ${table as string}`);
            
            // The realtimeService already handles updating the store directly
            // This event can be used for additional UI updates or notifications
          }) as EventListener);

        } catch (error) {
          console.error('❌ Failed to initialize application:', error);
          set({ isInitialized: true as boolean }); // Mark as initialized even if failed
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
            shifts: state.shifts as Shift[],
            workers: state.workers as Worker[],
            parts: state.parts as Part[],
            tasks: state.tasks as Task[],
            taskNotes: state.taskNotes as TaskNote[],
            taskTimeLogs: state.taskTimeLogs as TaskTimeLog[]
          });
          
          // Then sync pending operations
          await persistenceService.syncPendingOperations();
          
          set({
            lastSyncTime: new Date().toISOString() as string,
            pendingChanges: [] as string[]
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
              users: ((data.users && (data.users as User[]).length > 0) ? data.users : mockUsers) as User[],
              workers: ((data.workers && (data.workers as Worker[]).length > 0) ? data.workers : mockWorkers) as Worker[],
              shifts: ((data.shifts && (data.shifts as Shift[]).length > 0) ? data.shifts : mockShifts) as Shift[],
              parts: ((data.parts && (data.parts as Part[]).length > 0) ? data.parts : mockParts) as Part[]
            };
            
            set({
              ...mergedData,
              lastSyncTime: new Date().toISOString() as string,
              pendingChanges: [] as string[]
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
              users: ((cloudData.users && (cloudData.users as User[]).length > 0) ? cloudData.users : mockUsers) as User[],
              workers: ((cloudData.workers && (cloudData.workers as Worker[]).length > 0) ? cloudData.workers : mockWorkers) as Worker[],
              shifts: ((cloudData.shifts && (cloudData.shifts as Shift[]).length > 0) ? cloudData.shifts : mockShifts) as Shift[],
              parts: ((cloudData.parts && (cloudData.parts as Part[]).length > 0) ? cloudData.parts : mockParts) as Part[]
            };
            
            set({
              ...mergedData,
              lastSyncTime: new Date().toISOString() as string
            });
            console.log('✅ Data refreshed from cloud');
          }
        } catch (error) {
          console.error('❌ Failed to refresh from cloud:', error);
        }
      },

      forceSyncAllData: async (): Promise<boolean> => {
        const state = get();
        console.log('💫 Force syncing all data to cloud...');
        
        const success = await persistenceService.forceSyncAll({
          shifts: state.shifts as Shift[],
          workers: state.workers as Worker[],
          parts: state.parts as Part[],
          tasks: state.tasks as Task[],
          taskNotes: state.taskNotes as TaskNote[],
          taskTimeLogs: state.taskTimeLogs as TaskTimeLog[]
        }) as boolean;

        if (success as boolean) {
          set({
            lastSyncTime: new Date().toISOString() as string,
            pendingChanges: [] as string[]
          });
        }

        return success as boolean;
      },
      
      addUser: (userData: Omit<User, 'id' | 'createdAt'>) => {
        const newUser: User = {
          id: uuidv4() as string,
          ...userData,
          createdAt: new Date().toISOString() as string
        } as User;
        
        set((state) => ({
          users: [...state.users, newUser as User] as User[]
        }));
        
        get().markPendingChange(`user-${newUser.id as string}` as string);
      },
      
      deleteUser: (userId: string) => {
        set((state) => {
          const userToDelete = state.users.find(u => (u.id as string) === (userId as string)) as User | undefined;
          if (!userToDelete) return state;
          
          const updatedTasks = state.tasks.filter(task => (task.createdBy as string) !== (userId as string)) as Task[];
          
          let newCurrentUser = state.currentUser as User | null;
          if ((state.currentUser?.id as string) === (userId as string)) {
            newCurrentUser = (state.users.find(u => (u.id as string) !== (userId as string)) || state.users[0]) as User;
          }
          
          return {
            ...state,
            users: state.users.filter(u => (u.id as string) !== (userId as string)) as User[],
            tasks: updatedTasks as Task[],
            currentUser: newCurrentUser as User | null
          };
        });
        
        get().markPendingChange(`user-delete-${userId as string}` as string);
      },
      
      addShift: (shift: Omit<Shift, 'id'>) => {
        const newShift: Shift = {
          id: uuidv4() as string,
          ...shift
        } as Shift;
        set((state) => ({
          shifts: [...state.shifts, newShift as Shift] as Shift[]
        }));
        
        // Automatically save to cloud/local with improved persistence
        persistenceService.saveData('shifts', newShift as Shift, 'create');
      },
      
      updateShift: (id: string, updates: Partial<Shift>) => {
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            (shift.id as string) === (id as string) ? { ...shift, ...updates } as Shift : shift
          ) as Shift[]
        }));
        
        const updatedShift = get().shifts.find(s => (s.id as string) === (id as string)) as Shift | undefined;
        if (updatedShift) {
          persistenceService.saveData('shifts', updatedShift as Shift, 'update');
        }
      },
      
      deleteShift: (id: string) => {
        const shiftToDelete = get().shifts.find(s => (s.id as string) === (id as string)) as Shift | undefined;
        set((state) => ({
          shifts: state.shifts.filter((shift) => (shift.id as string) !== (id as string)) as Shift[]
        }));
        
        if (shiftToDelete) {
          persistenceService.saveData('shifts', { ...shiftToDelete, deleted_at: new Date().toISOString() as string } as any, 'delete');
        }
      },
      
      addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        const state = get();
        
        const existingTask = state.tasks.find(
          task => (task.workOrderNumber as string).toLowerCase() === (taskData.workOrderNumber as string).toLowerCase()
        ) as Task | undefined;
        
        if (existingTask) {
          throw new Error(`Work order ${taskData.workOrderNumber as string} already exists`);
        }
        
        const newPart: Part = {
          id: uuidv4() as string,
          partNumber: taskData.workOrderNumber as string,
          revision: 'N/A' as string,
          material: 'N/A' as string,
          coating: undefined as string | undefined
        } as Part;
        
        set(state => ({
          parts: [...state.parts, newPart as Part] as Part[]
        }));
        
        // Auto-save part to cloud/local
        persistenceService.saveData('parts', newPart as Part, 'create');

        const newTask: Task = {
          id: uuidv4() as string,
          workOrderNumber: (taskData.workOrderNumber || `WO-${Date.now() as number}`) as string,
          partId: newPart.id as string,
          description: taskData.description as string,
          estimatedDuration: taskData.estimatedDuration as number,
          priority: taskData.priority as TaskPriority,
          assignedWorkers: (taskData.assignedWorkers || []) as string[],
          shiftId: taskData.shiftId as string,
          status: TaskStatus.PENDING as TaskStatus,
          createdAt: (taskData.createdAt || new Date().toISOString()) as string,
          updatedAt: new Date().toISOString() as string,
          createdBy: (state.currentUser?.id || 'unknown') as string
        } as Task;

        set(state => ({
          tasks: [...state.tasks, newTask as Task] as Task[]
        }));
        
        // Auto-save task to cloud/local
        persistenceService.saveData('tasks', newTask as Task, 'create');

        return newTask as Task;
      },
      
      updateTaskStatus: (taskId: string, status: TaskStatus) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            (task.id as string) === (taskId as string)
              ? { ...task, status: status as TaskStatus, updatedAt: new Date().toISOString() as string } as Task
              : task
          ) as Task[]
        }));
        
        const updatedTask = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask as Task, 'update');
        }
      },
      
      deleteTask: (taskId: string) => {
        const taskToDelete = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        set((state) => ({
          tasks: state.tasks.filter((task) => (task.id as string) !== (taskId as string)) as Task[]
        }));
        
        if (taskToDelete) {
          persistenceService.saveData('tasks', { ...taskToDelete, deleted_at: new Date().toISOString() as string } as any, 'delete');
        }
      },
      
      moveTaskToShift: (taskId: string, newShiftId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            (task.id as string) === (taskId as string)
              ? { ...task, shiftId: newShiftId as string, updatedAt: new Date().toISOString() as string } as Task
              : task
          ) as Task[]
        }));
        
        const updatedTask = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask as Task, 'update');
        }
      },
      
      carryOverTask: (taskId: string, newShiftId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            (task.id as string) === (taskId as string)
              ? {
                  ...task,
                  shiftId: newShiftId as string,
                  status: TaskStatus.PENDING as TaskStatus,
                  updatedAt: new Date().toISOString() as string
                } as Task
              : task
          ) as Task[]
        }));
        
        const updatedTask = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask as Task, 'update');
        }
      },
      
      addManualWorker: (name: string, shiftId: string): string => {
        const workerId = uuidv4() as string;
        const newWorker: Worker = {
          id: workerId as string,
          name: name as string,
          role: WorkerRole.OPERATOR as WorkerRole,
          shiftId: shiftId as string,
          isManual: true as boolean
        } as Worker;
        
        set((state) => ({
          workers: [...state.workers, newWorker as Worker] as Worker[]
        }));
        
        persistenceService.saveData('workers', newWorker as Worker, 'create');
        
        return workerId as string;
      },
      
      assignWorkerToTask: (taskId: string, workerId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            (task.id as string) === (taskId as string)
              ? {
                  ...task,
                  assignedWorkers: [...new Set([...task.assignedWorkers, workerId as string])] as string[],
                  updatedAt: new Date().toISOString() as string
                } as Task
              : task
          ) as Task[]
        }));
        
        const updatedTask = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask as Task, 'update');
        }
      },
      
      removeWorkerFromTask: (taskId: string, workerId: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            (task.id as string) === (taskId as string)
              ? {
                  ...task,
                  assignedWorkers: task.assignedWorkers.filter((id) => (id as string) !== (workerId as string)) as string[],
                  updatedAt: new Date().toISOString() as string
                } as Task
              : task
          ) as Task[]
        }));
        
        const updatedTask = get().tasks.find(t => (t.id as string) === (taskId as string)) as Task | undefined;
        if (updatedTask) {
          persistenceService.saveData('tasks', updatedTask as Task, 'update');
        }
      },

      deleteWorker: (workerId: string) => {
        const workerToDelete = get().workers.find(w => (w.id as string) === (workerId as string)) as Worker | undefined;
        set((state) => ({
          workers: state.workers.filter((w) => (w.id as string) !== (workerId as string)) as Worker[],
          tasks: state.tasks.map((task) => ({
            ...task,
            assignedWorkers: task.assignedWorkers.filter((id) => (id as string) !== (workerId as string)) as string[]
          }) as Task) as Task[]
        }));
        
        if (workerToDelete) {
          persistenceService.saveData('workers', { ...workerToDelete, deleted_at: new Date().toISOString() as string } as any, 'delete');
        }
      },
      
      startTaskTimer: (taskId: string, workerId: string) => {
        const timeLogId = uuidv4() as string;
        const newTimeLog: TaskTimeLog = {
          id: timeLogId as string,
          taskId: taskId as string,
          workerId: workerId as string,
          startTime: new Date().toISOString() as string
        } as TaskTimeLog;
        
        set((state) => ({
          taskTimeLogs: [...state.taskTimeLogs, newTimeLog as TaskTimeLog] as TaskTimeLog[]
        }));
        
        persistenceService.saveData('time_logs', newTimeLog as TaskTimeLog, 'create');
      },
      
      stopTaskTimer: (taskId: string) => {
        const updatedTimeLog = get().taskTimeLogs.find(log => 
          (log.taskId as string) === (taskId as string) && !log.endTime
        ) as TaskTimeLog | undefined;
        
        if (updatedTimeLog) {
          const endTime = new Date().toISOString() as string;
          const duration = Math.round(
            (new Date(endTime as string).getTime() - new Date(updatedTimeLog.startTime as string).getTime()) / 60000
          ) as number;
          
          set((state) => ({
            taskTimeLogs: state.taskTimeLogs.map((log) =>
              (log.id as string) === (updatedTimeLog.id as string)
                ? { ...log, endTime: endTime as string, duration: duration as number } as TaskTimeLog
                : log
            ) as TaskTimeLog[]
          }));
          
          const finalTimeLog = { ...updatedTimeLog, endTime: endTime as string, duration: duration as number } as TaskTimeLog;
          persistenceService.saveData('time_logs', finalTimeLog as TaskTimeLog, 'update');
        }
      },
      
      addTaskNote: (note: Omit<TaskNote, 'id' | 'timestamp'>) => {
        const newNote: TaskNote = {
          id: uuidv4() as string,
          ...note,
          timestamp: new Date().toISOString() as string
        } as TaskNote;
        
        set((state) => ({
          taskNotes: [...state.taskNotes, newNote as TaskNote] as TaskNote[]
        }));
        
        persistenceService.saveData('task_notes', newNote as TaskNote, 'create');
      },
      
      generateHandoverReport: (shiftId: string, date: string) => {
        const state = get();
        const shift = state.shifts.find((s) => (s.id as string) === (shiftId as string)) as Shift | undefined;
        if (!shift) return;
        
        const shiftTasks = state.tasks.filter((t) => 
          (t.shiftId as string) === (shiftId as string) && (t.createdAt as string).startsWith(date as string)
        ) as Task[];
        
        const completedTasks = shiftTasks
          .filter((t) => (t.status as TaskStatus) === TaskStatus.COMPLETED)
          .map((task) => {
            const part = state.parts.find((p) => (p.id as string) === (task.partId as string)) as Part | undefined;
            const completedLog = state.taskTimeLogs
              .filter((log) => (log.taskId as string) === (task.id as string) && log.endTime)
              .sort((a, b) => 
                new Date(b.endTime! as string).getTime() - new Date(a.endTime! as string).getTime()
              )[0] as TaskTimeLog | undefined;
              
            return {
              taskId: task.id as string,
              workOrderNumber: task.workOrderNumber as string,
              partNumber: (part?.partNumber || 'Unknown') as string,
              description: task.description as string,
              completedAt: (completedLog?.endTime || task.updatedAt) as string,
              completedBy: task.assignedWorkers as string[]
            };
          });
          
        const carriedOverTasks = shiftTasks
          .filter((t) => (t.status as TaskStatus) !== TaskStatus.COMPLETED)
          .map((task) => {
            const part = state.parts.find((p) => (p.id as string) === (task.partId as string)) as Part | undefined;
            const totalTime = state.taskTimeLogs
              .filter((log) => (log.taskId as string) === (task.id as string) && log.duration)
              .reduce((sum, log) => sum + ((log.duration || 0) as number), 0) as number;
              
            return {
              taskId: task.id as string,
              workOrderNumber: task.workOrderNumber as string,
              partNumber: (part?.partNumber || 'Unknown') as string,
              description: task.description as string,
              reason: 'Insufficient time to complete' as string,
              progress: Math.min((totalTime as number) / (task.estimatedDuration as number), 1) as number
            };
          });
          
        const idleEvents = state.taskTimeLogs
          .filter((log) => {
            const task = shiftTasks.find((t) => (t.id as string) === (log.taskId as string)) as Task | undefined;
            return task && log.endTime;
          })
          .map((log) => ({
            taskId: log.taskId as string,
            workerId: log.workerId as string,
            startTime: log.startTime as string,
            endTime: log.endTime! as string,
            duration: (log.duration || 0) as number
          }));
          
        const totalTime = idleEvents.reduce((sum, event) => sum + (event.duration as number), 0) as number;
        const idleTime = idleEvents
          .filter((event) => (event.duration as number) > 30)
          .reduce((sum, event) => sum + (event.duration as number), 0) as number;
          
        const handoverReport = {
          id: uuidv4() as string,
          shiftId: shiftId as string,
          date: date as string,
          completedTasks,
          carriedOverTasks,
          idleEvents,
          metrics: {
            totalCompletedTasks: completedTasks.length as number,
            totalCarriedOver: carriedOverTasks.length as number,
            totalIdleTime: idleTime as number,
            shiftUtilization: (totalTime as number) ? ((totalTime as number) - (idleTime as number)) / (totalTime as number) : 1 as number
          },
          notes: '' as string,
          generatedBy: state.workers[0].id as string,
          generatedAt: new Date().toISOString() as string
        };
        
        set((state) => ({
          shiftReports: [
            ...state.shiftReports,
            {
              id: uuidv4() as string,
              shiftId: shiftId as string,
              date: date as string,
              completedTasksCount: completedTasks.length as number,
              pendingTasksCount: carriedOverTasks.length as number,
              summaryNotes: '' as string,
              handoverReport
            } as ShiftReport
          ] as ShiftReport[]
        }));
      },
      
      acknowledgeHandoverReport: (reportId: string, workerId: string) => {
        set((state) => ({
          shiftReports: state.shiftReports.map((report) =>
            (report.id as string) === (reportId as string) && report.handoverReport
              ? {
                  ...report,
                  handoverReport: {
                    ...report.handoverReport,
                    acknowledgedBy: workerId as string,
                    acknowledgedAt: new Date().toISOString() as string
                  }
                } as ShiftReport
              : report
          ) as ShiftReport[]
        }));
      },
      
      getTaskSummaryForDate: (date: string) => {
        const state = get();
        let tasks = state.tasks.filter((t) => (t.createdAt as string).startsWith(date as string)) as Task[];
        
        if ((state.viewMode as ViewMode) === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => (t.createdBy as string) === (state.currentUser?.id as string)) as Task[];
        }
        
        return {
          total: tasks.length as number,
          completed: tasks.filter((t) => (t.status as TaskStatus) === TaskStatus.COMPLETED).length as number,
          inProgress: tasks.filter((t) => (t.status as TaskStatus) === TaskStatus.IN_PROGRESS).length as number,
          pending: tasks.filter((t) => (t.status as TaskStatus) === TaskStatus.PENDING).length as number,
          carriedOver: tasks.filter((t) => t.carriedOverFromTaskId).length as number
        };
      },
      
      getExpandedTask: (taskId: string) => {
        const state = get();
        const task = state.tasks.find((t) => (t.id as string) === (taskId as string)) as Task | undefined;
        if (!task) return null;
        
        const part = state.parts.find((p) => (p.id as string) === (task.partId as string)) as Part | undefined;
        if (!part) return null;
        
        const workers = state.workers.filter((w) => task.assignedWorkers.includes(w.id as string)) as Worker[];
        const timeLogs = state.taskTimeLogs.filter((log) => (log.taskId as string) === (taskId as string)) as TaskTimeLog[];
        const activeTimeLog = timeLogs.find((log) => !log.endTime) as TaskTimeLog | undefined;
        const totalDuration = timeLogs
          .filter((log) => log.duration)
          .reduce((sum, log) => sum + ((log.duration || 0) as number), 0) as number;
          
        return {
          ...task,
          part: part as Part,
          workers: workers as Worker[],
          timeLogs: timeLogs as TaskTimeLog[],
          activeTimeLog: activeTimeLog as TaskTimeLog | undefined,
          totalDuration: totalDuration as number
        };
      },
      
      getTaskNotesByTaskId: (taskId: string): TaskNote[] => {
        return get().taskNotes
          .filter((note) => (note.taskId as string) === (taskId as string))
          .sort((a, b) => 
            new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
          ) as TaskNote[];
      },
      
      getFilteredTasks: (): Task[] => {
        const state = get();
        let tasks = state.tasks as Task[];
        
        if ((state.viewMode as ViewMode) === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => (t.createdBy as string) === (state.currentUser?.id as string)) as Task[];
        }
        
        return tasks as Task[];
      },
      
      createStartOfShiftChecklist: (data: any) => {
        const { shiftId, date } = data;
        const key = `${shiftId as string}-${date as string}` as string;
        
        set((state) => ({
          startChecklistStatus: {
            ...state.startChecklistStatus,
            [key as string]: {
              shiftId: shiftId as string,
              date: date as string,
              acknowledgedWorkers: [] as string[],
              completedAt: new Date().toISOString() as string,
              completedBy: state.currentUser?.id as string
            } as ChecklistAcknowledgment
          } as Record<string, ChecklistAcknowledgment>
        }));
        
        saveStartChecklist(data).catch(error => {
          console.error('Failed to save start checklist:', error);
          get().markPendingChange(`start-checklist-${key as string}` as string);
        });
      },
      
      createEndOfShiftCleanup: (data: any) => {
        const { shiftId, date } = data;
        const key = `${shiftId as string}-${date as string}` as string;
        
        set((state) => ({
          endCleanupStatus: {
            ...state.endCleanupStatus,
            [key as string]: {
              shiftId: shiftId as string,
              date: date as string,
              acknowledgedWorkers: [] as string[],
              completedAt: new Date().toISOString() as string,
              completedBy: state.currentUser?.id as string
            } as ChecklistAcknowledgment
          } as Record<string, ChecklistAcknowledgment>
        }));
        
        saveEndCleanup(data).catch(error => {
          console.error('Failed to save end cleanup:', error);
          get().markPendingChange(`end-cleanup-${key as string}` as string);
        });
      },

      acknowledgeStartChecklist: (shiftId: string, date: string, workerId: string) => {
        const key = `${shiftId as string}-${date as string}` as string;
        set((state) => {
          const current = state.startChecklistStatus[key as string] as ChecklistAcknowledgment | undefined;
          if (!current) return state;
          
          const acknowledgedWorkers = [...new Set([...current.acknowledgedWorkers, workerId as string])] as string[];
          
          return {
            ...state,
            startChecklistStatus: {
              ...state.startChecklistStatus,
              [key as string]: {
                ...current,
                acknowledgedWorkers: acknowledgedWorkers as string[]
              } as ChecklistAcknowledgment
            } as Record<string, ChecklistAcknowledgment>
          };
        });
      },

      acknowledgeEndCleanup: (shiftId: string, date: string, workerId: string) => {
        const key = `${shiftId as string}-${date as string}` as string;
        set((state) => {
          const current = state.endCleanupStatus[key as string] as ChecklistAcknowledgment | undefined;
          if (!current) return state;
          
          const acknowledgedWorkers = [...new Set([...current.acknowledgedWorkers, workerId as string])] as string[];
          
          return {
            ...state,
            endCleanupStatus: {
              ...state.endCleanupStatus,
              [key as string]: {
                ...current,
                acknowledgedWorkers: acknowledgedWorkers as string[]
              } as ChecklistAcknowledgment
            } as Record<string, ChecklistAcknowledgment>
          };
        });
      },

      isStartChecklistComplete: (shiftId: string, date: string): boolean => {
        const key = `${shiftId as string}-${date as string}` as string;
        const checklist = get().startChecklistStatus[key as string] as ChecklistAcknowledgment | undefined;
        if (!checklist) return false as boolean;
        
        const shiftWorkers = get().workers.filter(w => (w.shiftId as string) === (shiftId as string)) as Worker[];
        if ((shiftWorkers.length as number) === 0) return !!(checklist.completedAt as string);
        
        return shiftWorkers.every(worker => 
          checklist.acknowledgedWorkers.includes(worker.id as string)
        ) as boolean;
      },

      isEndCleanupComplete: (shiftId: string, date: string): boolean => {
        const key = `${shiftId as string}-${date as string}` as string;
        const cleanup = get().endCleanupStatus[key as string] as ChecklistAcknowledgment | undefined;
        if (!cleanup) return false as boolean;
        
        const shiftWorkers = get().workers.filter(w => (w.shiftId as string) === (shiftId as string)) as Worker[];
        if ((shiftWorkers.length as number) === 0) return !!(cleanup.completedAt as string);
        
        return shiftWorkers.every(worker => 
          cleanup.acknowledgedWorkers.includes(worker.id as string)
        ) as boolean;
      },

      getStartChecklistAcknowledgments: (shiftId: string, date: string): string[] => {
        const key = `${shiftId as string}-${date as string}` as string;
        return (get().startChecklistStatus[key as string]?.acknowledgedWorkers || []) as string[];
      },

      getEndCleanupAcknowledgments: (shiftId: string, date: string): string[] => {
        const key = `${shiftId as string}-${date as string}` as string;
        return (get().endCleanupStatus[key as string]?.acknowledgedWorkers || []) as string[];
      },

      getCarriedOverTasks: (date: string): Task[] => {
        const state = get();
        let tasks = state.tasks.filter(task => 
          task.carriedOverFromTaskId && 
          (task.createdAt as string).startsWith(date as string)
        ) as Task[];
        
        if ((state.viewMode as ViewMode) === ViewMode.MY_VIEW && state.currentUser) {
          tasks = tasks.filter((t) => (t.createdBy as string) === (state.currentUser?.id as string)) as Task[];
        }
        
        return tasks as Task[];
      },
      
      printTask: (taskId: string) => {
        const task = get().getExpandedTask(taskId as string);
        if (!task) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Task ${task.workOrderNumber as string}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .section { margin: 20px 0; }
                .label { font-weight: bold; }
              </style>
            </head>
            <body>
              <h1>Task Details: ${task.workOrderNumber as string}</h1>
              
              <div class="section">
                <div class="label">Part Number:</div>
                <div>${task.part.partNumber as string} (${task.part.revision as string})</div>
              </div>
              
              <div class="section">
                <div class="label">Description:</div>
                <div>${task.description as string}</div>
              </div>
              
              <div class="section">
                <div class="label">Status:</div>
                <div>${task.status as string}</div>
              </div>
              
              <div class="section">
                <div class="label">Priority:</div>
                <div>${task.priority as string}</div>
              </div>
              
              <div class="section">
                <div class="label">Estimated Duration:</div>
                <div>${task.estimatedDuration as number} minutes</div>
              </div>
              
              <div class="section">
                <div class="label">Assigned Workers:</div>
                <div>${task.workers.map(w => w.name as string).join(', ') || 'None'}</div>
              </div>
              
              ${(task.totalDuration as number) ? `
                <div class="section">
                  <div class="label">Total Time Spent:</div>
                  <div>${task.totalDuration as number} minutes</div>
                </div>
              ` : ''}
            </body>
          </html>
        `;
        
        printWindow.document.write(html as string);
        printWindow.document.close();
        printWindow.print();
      }
    }),
    {
      name: 'shop-storage',
      partialize: (state) => ({
        shifts: state.shifts as Shift[],
        workers: state.workers as Worker[],
        parts: state.parts as Part[],
        tasks: state.tasks as Task[],
        taskNotes: state.taskNotes as TaskNote[],
        taskTimeLogs: state.taskTimeLogs as TaskTimeLog[],
        shiftReports: state.shiftReports as ShiftReport[],
        users: state.users as User[],
        currentUser: state.currentUser as User | null,
        viewMode: state.viewMode as ViewMode,
        startChecklistStatus: state.startChecklistStatus as Record<string, ChecklistAcknowledgment>,
        endCleanupStatus: state.endCleanupStatus as Record<string, ChecklistAcknowledgment>,
        lastSyncTime: state.lastSyncTime as string | null,
        pendingChanges: state.pendingChanges as string[],
        autoSyncEnabled: state.autoSyncEnabled as boolean
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure currentUser is always defined and has a valid id after rehydration
          if (!state.currentUser || !(state.currentUser.id as string)) {
            state.currentUser = defaultUser as User;
          }
          
          // Ensure we have the predefined workers and users
          if (!state.users || (state.users.length as number) === 0) {
            state.users = mockUsers as User[];
          }
          if (!state.workers || (state.workers.length as number) === 0) {
            state.workers = mockWorkers as Worker[];
          }
          if (!state.shifts || (state.shifts.length as number) === 0) {
            state.shifts = mockShifts as Shift[];
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