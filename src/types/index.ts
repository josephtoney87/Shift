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

export enum ViewMode {
  MY_VIEW = 'my_view',
  ALL_DATA = 'all_data'
}

// Interface definitions
export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  createdAt: string;
}

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
  isManual?: boolean;
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
  createdBy?: string; // User ID who created the task
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
  metrics: {
    totalCompletedTasks: number;
    totalCarriedOver: number;
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

// Additional types for checklists
export interface StartOfShiftChecklist {
  id: string;
  shiftId: string;
  date: string;
  workOrderNumber: string;
  palletNumber: string;
  partNumber: string;
  programNumber: string;
  startingBlockNumber: string;
  toolNumber: string;
  toolsRequiringAttention: string[];
  immediateAttentionTools: string[];
  notes: string;
  safetyChecks: Record<string, boolean>;
  completedBy: string;
  completedAt: string;
  lastModified: string;
  modifiedBy: string;
}

export interface EndOfShiftCleanup {
  id: string;
  shiftId: string;
  date: string;
  preparationChecks: Record<string, boolean>;
  cleaningChecks: Record<string, boolean>;
  notes: string;
  completedBy: string;
  completedAt: string;
  lastModified: string;
  modifiedBy: string;
}

export interface CalibrationRecord {
  id: string;
  equipmentId: string;
  calibrationDate: string;
  nextCalibrationDate: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}