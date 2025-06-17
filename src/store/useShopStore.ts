import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { 
  Shift, Worker, Part, Task, TaskNote, TaskTimeLog, ShiftReport,
  TaskStatus, TaskPriority, WorkerRole, ShiftType
} from '../types';
import { mockShifts, mockWorkers, mockParts, mockTasks, mockTaskNotes, mockTaskTimeLogs, mockShiftReports } from '../data/mockData';

interface ShopState {
  shifts: Shift[];
  workers: Worker[];
  parts: Part[];
  tasks: Task[];
  taskNotes: TaskNote[];
  taskTimeLogs: TaskTimeLog[];
  shiftReports: ShiftReport[];
  selectedTaskId: string | null;
  isTaskModalOpen: boolean;
  selectedDate: string;
  startChecklistStatus: Record<string, Record<string, boolean>>;
  endCleanupStatus: Record<string, Record<string, boolean>>;
  
  // Actions
  setSelectedTaskId: (id: string | null) => void;
  setTaskModalOpen: (isOpen: boolean) => void;
  setSelectedDate: (date: string) => void;
  
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
  
  // Checklists
  createStartOfShiftChecklist: (data: any) => void;
  createEndOfShiftCleanup: (data: any) => void;
  isStartChecklistComplete: (shiftId: string, date: string) => boolean;
  isEndCleanupComplete: (shiftId: string, date: string) => boolean;
  getCarriedOverTasks: (date: string) => Task[];
  
  // Print
  printTask: (taskId: string) => void;
}

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
      selectedTaskId: null,
      isTaskModalOpen: false,
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      startChecklistStatus: {},
      endCleanupStatus: {},
      
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setTaskModalOpen: (isOpen) => set({ isTaskModalOpen: isOpen }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      
      addShift: (shift) => {
        const newShift: Shift = {
          id: `shift-${Date.now()}`,
          ...shift
        };
        set((state) => ({
          shifts: [...state.shifts, newShift]
        }));
      },
      
      updateShift: (id, updates) => {
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            shift.id === id ? { ...shift, ...updates } : shift
          )
        }));
      },
      
      deleteShift: (id) => {
        set((state) => ({
          shifts: state.shifts.filter((shift) => shift.id !== id)
        }));
      },
      
      addTask: (taskData) => {
        // Check for duplicate work order
        const existingTask = get().tasks.find(
          task => task.workOrderNumber.toLowerCase() === taskData.workOrderNumber.toLowerCase()
        );
        
        if (existingTask) {
          throw new Error(`Work order ${taskData.workOrderNumber} already exists`);
        }
        
        // Create a simple part entry for the work order
        const newPart: Part = {
          id: `part-${Date.now()}`,
          partNumber: taskData.workOrderNumber, // Use work order as part number
          revision: 'N/A',
          material: 'N/A',
          coating: undefined
        };
        
        set(state => ({
          parts: [...state.parts, newPart]
        }));

        const newTask: Task = {
          id: `task-${Date.now()}`,
          workOrderNumber: taskData.workOrderNumber || `WO-${Date.now()}`,
          partId: newPart.id,
          description: taskData.description,
          estimatedDuration: taskData.estimatedDuration,
          priority: taskData.priority,
          assignedWorkers: taskData.assignedWorkers || [],
          shiftId: taskData.shiftId,
          status: TaskStatus.PENDING,
          createdAt: taskData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          tasks: [...state.tasks, newTask]
        }));

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
      },
      
      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId)
        }));
      },
      
      moveTaskToShift: (taskId, newShiftId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, shiftId: newShiftId, updatedAt: new Date().toISOString() }
              : task
          )
        }));
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
      },
      
      addManualWorker: (name, shiftId) => {
        const workerId = `worker-${Date.now()}`;
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
      },

      deleteWorker: (workerId) => {
        set((state) => ({
          workers: state.workers.filter((w) => w.id !== workerId),
          tasks: state.tasks.map((task) => ({
            ...task,
            assignedWorkers: task.assignedWorkers.filter((id) => id !== workerId)
          }))
        }));
      },
      
      startTaskTimer: (taskId, workerId) => {
        const timeLogId = `time-${Date.now()}`;
        const newTimeLog: TaskTimeLog = {
          id: timeLogId,
          taskId,
          workerId,
          startTime: new Date().toISOString()
        };
        
        set((state) => ({
          taskTimeLogs: [...state.taskTimeLogs, newTimeLog]
        }));
      },
      
      stopTaskTimer: (taskId) => {
        set((state) => ({
          taskTimeLogs: state.taskTimeLogs.map((log) =>
            log.taskId === taskId && !log.endTime
              ? {
                  ...log,
                  endTime: new Date().toISOString(),
                  duration: Math.round(
                    (new Date().getTime() - new Date(log.startTime).getTime()) / 60000
                  )
                }
              : log
          )
        }));
      },
      
      addTaskNote: (note) => {
        const newNote: TaskNote = {
          id: `note-${Date.now()}`,
          ...note,
          timestamp: new Date().toISOString()
        };
        
        set((state) => ({
          taskNotes: [...state.taskNotes, newNote]
        }));
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
          id: `report-${Date.now()}`,
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
              id: `shift-report-${Date.now()}`,
              shiftId,
              date,
              completedTasksCount: completedTasks.length,
              pendingTasksCount: carriedOverTasks.length,
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
        const tasks = get().tasks.filter((t) => t.createdAt.startsWith(date));
        
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
      
      createStartOfShiftChecklist: (data) => {
        const { shiftId, date } = data;
        set((state) => ({
          startChecklistStatus: {
            ...state.startChecklistStatus,
            [shiftId]: {
              ...(state.startChecklistStatus[shiftId] || {}),
              [date]: true
            }
          }
        }));
      },
      
      createEndOfShiftCleanup: (data) => {
        const { shiftId, date } = data;
        set((state) => ({
          endCleanupStatus: {
            ...state.endCleanupStatus,
            [shiftId]: {
              ...(state.endCleanupStatus[shiftId] || {}),
              [date]: true
            }
          }
        }));
      },

      isStartChecklistComplete: (shiftId: string, date: string) => {
        return get().startChecklistStatus[shiftId]?.[date] || false;
      },

      isEndCleanupComplete: (shiftId: string, date: string) => {
        return get().endCleanupStatus[shiftId]?.[date] || false;
      },

      getCarriedOverTasks: (date: string) => {
        return get().tasks.filter(task => 
          task.carriedOverFromTaskId && 
          task.createdAt.startsWith(date)
        );
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
        startChecklistStatus: state.startChecklistStatus,
        endCleanupStatus: state.endCleanupStatus
      })
    }
  )
);