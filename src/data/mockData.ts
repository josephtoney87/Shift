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
import { v4 as uuidv4 } from 'uuid';

// Generate consistent UUIDs for users
const userDanielId = uuidv4();
const userKyleId = uuidv4();
const userCollinId = uuidv4();
const userMattId = uuidv4();
const userDefaultId = uuidv4();

// Generate consistent UUIDs for shifts
const shift1Id = uuidv4();
const shift2Id = uuidv4();
const shift3Id = uuidv4();

// Mock Shifts
export const mockShifts: Shift[] = [
  { id: shift1Id, type: ShiftType.S1, startTime: '06:00', endTime: '14:00' },
  { id: shift2Id, type: ShiftType.S2, startTime: '14:00', endTime: '22:00' },
  { id: shift3Id, type: ShiftType.S3, startTime: '22:00', endTime: '06:00' }
];

// Pre-defined shift workers
export const mockWorkers: Worker[] = [
  // 2nd shift workers
  { 
    id: uuidv4(), 
    name: 'Daniel Lerner', 
    role: WorkerRole.OPERATOR, 
    shiftId: shift2Id,
    isManual: false
  },
  { 
    id: uuidv4(), 
    name: 'Kyle Riddle', 
    role: WorkerRole.OPERATOR, 
    shiftId: shift2Id,
    isManual: false
  },
  // 3rd shift workers
  { 
    id: uuidv4(), 
    name: 'Collin Taylor', 
    role: WorkerRole.OPERATOR, 
    shiftId: shift3Id,
    isManual: false
  },
  { 
    id: uuidv4(), 
    name: 'Matt Barrett', 
    role: WorkerRole.OPERATOR, 
    shiftId: shift3Id,
    isManual: false
  }
];

// Pre-defined users corresponding to the workers
export const mockUsers: User[] = [
  {
    id: userDefaultId,
    name: 'Default User',
    email: 'default@company.com',
    color: '#3B82F6',
    createdAt: new Date().toISOString()
  },
  {
    id: userDanielId,
    name: 'Daniel Lerner',
    email: 'daniel.lerner@company.com',
    color: '#EF4444',
    createdAt: new Date().toISOString()
  },
  {
    id: userKyleId,
    name: 'Kyle Riddle',
    email: 'kyle.riddle@company.com',
    color: '#10B981',
    createdAt: new Date().toISOString()
  },
  {
    id: userCollinId,
    name: 'Collin Taylor',
    email: 'collin.taylor@company.com',
    color: '#F59E0B',
    createdAt: new Date().toISOString()
  },
  {
    id: userMattId,
    name: 'Matt Barrett',
    email: 'matt.barrett@company.com',
    color: '#8B5CF6',
    createdAt: new Date().toISOString()
  }
];

// Mock Parts
export const mockParts: Part[] = [
  { 
    id: uuidv4(), 
    partNumber: 'CNC-10045-A', 
    revision: 'Rev.2', 
    material: 'Aluminum 6061', 
    coating: 'Anodized Type III' 
  },
  { 
    id: uuidv4(), 
    partNumber: 'CNC-22378-B', 
    revision: 'Rev.1', 
    material: 'Stainless Steel 304' 
  },
  { 
    id: uuidv4(), 
    partNumber: 'CNC-31557-C', 
    revision: 'Rev.4', 
    material: 'Titanium Grade 5' 
  },
  { 
    id: uuidv4(), 
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