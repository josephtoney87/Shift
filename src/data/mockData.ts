import { 
  Shift, 
  ShiftType, 
  Worker, 
  WorkerRole, 
  Part, 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskNote,
  TaskTimeLog, 
  ShiftReport,
  User
} from '../types';
import { format } from 'date-fns';

// Mock Shifts
export const mockShifts: Shift[] = [
  { id: 'shift-1', type: ShiftType.S1, startTime: '06:00', endTime: '14:00' },
  { id: 'shift-2', type: ShiftType.S2, startTime: '14:00', endTime: '22:00' },
  { id: 'shift-3', type: ShiftType.S3, startTime: '22:00', endTime: '06:00' }
];

// Pre-defined shift workers
export const mockWorkers: Worker[] = [
  // 2nd shift workers
  { 
    id: 'worker-daniel', 
    name: 'Daniel Lerner', 
    role: WorkerRole.OPERATOR, 
    shiftId: 'shift-2',
    isManual: false
  },
  { 
    id: 'worker-kyle', 
    name: 'Kyle Riddle', 
    role: WorkerRole.OPERATOR, 
    shiftId: 'shift-2',
    isManual: false
  },
  // 3rd shift workers
  { 
    id: 'worker-collin', 
    name: 'Collin Taylor', 
    role: WorkerRole.OPERATOR, 
    shiftId: 'shift-3',
    isManual: false
  },
  { 
    id: 'worker-matt', 
    name: 'Matt Barrett', 
    role: WorkerRole.OPERATOR, 
    shiftId: 'shift-3',
    isManual: false
  }
];

// Pre-defined users corresponding to the workers
export const mockUsers: User[] = [
  {
    id: 'user-default',
    name: 'Default User',
    email: 'default@company.com',
    color: '#3B82F6',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-daniel',
    name: 'Daniel Lerner',
    email: 'daniel.lerner@company.com',
    color: '#EF4444',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-kyle',
    name: 'Kyle Riddle',
    email: 'kyle.riddle@company.com',
    color: '#10B981',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-collin',
    name: 'Collin Taylor',
    email: 'collin.taylor@company.com',
    color: '#F59E0B',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-matt',
    name: 'Matt Barrett',
    email: 'matt.barrett@company.com',
    color: '#8B5CF6',
    createdAt: new Date().toISOString()
  }
];

// Mock Parts
export const mockParts: Part[] = [
  { 
    id: 'part-1', 
    partNumber: 'CNC-10045-A', 
    revision: 'Rev.2', 
    material: 'Aluminum 6061', 
    coating: 'Anodized Type III' 
  },
  { 
    id: 'part-2', 
    partNumber: 'CNC-22378-B', 
    revision: 'Rev.1', 
    material: 'Stainless Steel 304' 
  },
  { 
    id: 'part-3', 
    partNumber: 'CNC-31557-C', 
    revision: 'Rev.4', 
    material: 'Titanium Grade 5' 
  },
  { 
    id: 'part-4', 
    partNumber: 'CNC-48890-D', 
    revision: 'Rev.3', 
    material: 'Carbon Steel 1045',
    coating: 'Black Oxide'
  }
];

// Empty initial tasks array since there are no workers yet
export const mockTasks: Task[] = [];

// Empty initial task notes array
export const mockTaskNotes: TaskNote[] = [];

// Empty initial time logs array
export const mockTaskTimeLogs: TaskTimeLog[] = [];

// Empty initial shift reports array
export const mockShiftReports: ShiftReport[] = [];