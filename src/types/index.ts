// Enum definitions
export enum ShiftType {
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

export enum WorkerRole {
  OPERATOR = 'Operator',
  SETUP_TECH = 'Setup Tech',
  QUALITY_INSPECTOR = 'Quality Inspector',
  MAINTENANCE = 'Maintenance'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Interface definitions
export interface Shift {
  id: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
}

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  shiftId: string;
}

export interface Part {
  id: string;
  partNumber: string;
  revision: string;
  material: string;
  coating?: string;
}

export interface Task {
  id: string;
  workOrderNumber: string;
  partId: string;
  description: string;
  estimatedDuration: number;
  priority: TaskPriority;
  assignedWorkers: string[];
  shiftId: string;
  status: TaskStatus;
  carriedOverFromTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimeLog {
  id: string;
  taskId: string;
  workerId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status?: 'running' | 'paused' | 'stopped';
  pausedAt?: string;
  parentLogId?: string;
  autoPaused?: boolean;
}

export interface TaskNote {
  id: string;
  taskId: string;
  workerId: string;
  timestamp: string;
  noteText: string;
}

export interface HandoverReport {
  id: string;
  shiftId: string;
  date: string;
  completedTasks: {
    taskId: string;
    workOrderNumber: string;
    partNumber: string;
    description: string;
    completedAt: string;
    completedBy: string[];
  }[];
  carriedOverTasks: {
    taskId: string;
    workOrderNumber: string;
    partNumber: string;
    description: string;
    reason: string;
    progress: number;
  }[];
  idleEvents: {
    taskId: string;
    startTime: string;
    endTime: string;
    duration: number;
    workerId: string;
  }[];
  metrics: {
    totalCompletedTasks: number;
    totalCarriedOver: number;
    totalIdleTime: number;
    shiftUtilization: number;
  };
  notes: string;
  generatedBy: string;
  generatedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface ShiftReport {
  id: string;
  shiftId: string;
  date: string;
  completedTasksCount: number;
  pendingTasksCount: number;
  summaryNotes: string;
  handoverReport?: HandoverReport;
}