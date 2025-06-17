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
  ShiftReport 
} from '../types';
import { format } from 'date-fns';

// Mock Shifts
export const mockShifts: Shift[] = [
  { id: 'shift-1', type: ShiftType.S1, startTime: '06:00', endTime: '14:00' },
  { id: 'shift-2', type: ShiftType.S2, startTime: '14:00', endTime: '22:00' },
  { id: 'shift-3', type: ShiftType.S3, startTime: '22:00', endTime: '06:00' }
];

// Empty initial workers array - workers will be added manually
export const mockWorkers: Worker[] = [];

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