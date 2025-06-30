import { supabase } from './supabase';
import { 
  Shift, Worker, Part, Task, TaskNote, TaskTimeLog, 
  ShiftReport, User, TaskStatus, TaskPriority 
} from '../types';

// Error handling wrapper
const handleSupabaseOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Supabase operation failed:', error);
    throw error;
  }
};

// Convert between app types and database types
const convertTaskToDb = (task: Task) => ({
  id: task.id as string,
  description: task.description as string,
  estimated_duration: task.estimatedDuration as number,
  priority: task.priority as string,
  shift_id: task.shiftId as string,
  status: task.status as string,
  part_id: task.partId as string,
  carried_over_from_task_id: (task.carriedOverFromTaskId || null) as string | null,
  created_by: (task.createdBy || null) as string | null,
  created_at: task.createdAt as string,
  updated_at: task.updatedAt as string,
  facility_id: null as string | null // For multi-tenancy support
});

const convertTaskFromDb = (dbTask: any): Task => ({
  id: dbTask.id as string,
  workOrderNumber: (dbTask.work_order_number || dbTask.description?.split(' ')[0] || `WO-${(dbTask.id as string).slice(-6)}`) as string,
  partId: dbTask.part_id as string,
  description: dbTask.description as string,
  estimatedDuration: dbTask.estimated_duration as number,
  priority: dbTask.priority as TaskPriority,
  assignedWorkers: [] as string[], // Will be populated separately
  shiftId: dbTask.shift_id as string,
  status: dbTask.status as TaskStatus,
  carriedOverFromTaskId: (dbTask.carried_over_from_task_id || undefined) as string | undefined,
  createdAt: dbTask.created_at as string,
  updatedAt: dbTask.updated_at as string,
  createdBy: (dbTask.created_by || undefined) as string | undefined
});

// SHIFTS
export const saveShift = async (shift: Shift): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('shifts')
      .upsert({
        id: shift.id as string,
        type: shift.type as string,
        start_time: shift.startTime as string,
        end_time: shift.endTime as string,
        updated_at: new Date().toISOString() as string
      });
    
    if (error) throw error;
  });
};

export const loadShifts = async (): Promise<Shift[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    return (data || []).map(shift => ({
      id: shift.id as string,
      type: shift.type as any,
      startTime: shift.start_time as string,
      endTime: shift.end_time as string
    })) as Shift[];
  });
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('shifts')
      .update({ deleted_at: new Date().toISOString() as string })
      .eq('id', shiftId as string);
    
    if (error) throw error;
  });
};

// WORKERS
export const saveWorker = async (worker: Worker): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('workers')
      .upsert({
        id: worker.id as string,
        name: worker.name as string,
        role: worker.role as string,
        shift_id: (worker.shiftId || null) as string | null,
        is_manual: (worker.isManual || false) as boolean,
        updated_at: new Date().toISOString() as string
      });
    
    if (error) throw error;
  });
};

export const loadWorkers = async (): Promise<Worker[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    return (data || []).map(worker => ({
      id: worker.id as string,
      name: worker.name as string,
      role: worker.role as any,
      shiftId: worker.shift_id as string,
      isManual: (worker.is_manual || false) as boolean
    })) as Worker[];
  });
};

export const deleteWorker = async (workerId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('workers')
      .update({ deleted_at: new Date().toISOString() as string })
      .eq('id', workerId as string);
    
    if (error) throw error;
  });
};

// PARTS
export const savePart = async (part: Part): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('parts')
      .upsert({
        id: part.id as string,
        part_number: part.partNumber as string,
        revision: part.revision as string,
        material: part.material as string,
        coating: (part.coating || null) as string | null,
        updated_at: new Date().toISOString() as string
      });
    
    if (error) throw error;
  });
};

export const loadParts = async (): Promise<Part[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    return (data || []).map(part => ({
      id: part.id as string,
      partNumber: part.part_number as string,
      revision: part.revision as string,
      material: part.material as string,
      coating: (part.coating || undefined) as string | undefined
    })) as Part[];
  });
};

// TASKS
export const saveTask = async (task: Task): Promise<void> => {
  await handleSupabaseOperation(async () => {
    // First ensure the part exists
    const part = await supabase
      .from('parts')
      .select('id')
      .eq('id', task.partId as string)
      .single();

    if (!part.data) {
      // Create a simple part record if it doesn't exist
      await supabase
        .from('parts')
        .upsert({
          id: task.partId as string,
          part_number: task.workOrderNumber as string,
          revision: 'N/A' as string,
          material: 'N/A' as string
        });
    }

    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id as string,
        description: `[${task.workOrderNumber as string}] ${task.description as string}` as string,
        estimated_duration: task.estimatedDuration as number,
        priority: task.priority as string,
        shift_id: (task.shiftId || null) as string | null,
        status: task.status as string,
        part_id: (task.partId || null) as string | null,
        carried_over_from_task_id: (task.carriedOverFromTaskId || null) as string | null,
        created_by: (task.createdBy || null) as string | null,
        created_at: task.createdAt as string,
        updated_at: task.updatedAt as string
      });
    
    if (error) throw error;
  });
};

export const loadTasks = async (): Promise<Task[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    return (data || []).map(task => {
      // Extract work order number from description if it's formatted as [WO] description
      const match = (task.description as string).match(/^\[([^\]]+)\]\s*(.*)$/);
      const workOrderNumber = match ? (match[1] as string) : `WO-${(task.id as string).slice(-6)}`;
      const description = match ? (match[2] as string) : (task.description as string);

      return {
        id: task.id as string,
        workOrderNumber: workOrderNumber as string,
        partId: task.part_id as string,
        description: description as string,
        estimatedDuration: task.estimated_duration as number,
        priority: task.priority as TaskPriority,
        assignedWorkers: [] as string[], // Will be populated from a junction table in a full implementation
        shiftId: task.shift_id as string,
        status: task.status as TaskStatus,
        carriedOverFromTaskId: (task.carried_over_from_task_id || undefined) as string | undefined,
        createdAt: task.created_at as string,
        updatedAt: task.updated_at as string,
        createdBy: (task.created_by || undefined) as string | undefined
      } as Task;
    }) as Task[];
  });
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() as string })
      .eq('id', taskId as string);
    
    if (error) throw error;
  });
};

// TASK NOTES
export const saveTaskNote = async (note: TaskNote): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('task_notes')
      .upsert({
        id: note.id as string,
        task_id: (note.taskId || null) as string | null,
        worker_id: (note.workerId || null) as string | null,
        note_text: note.noteText as string,
        created_at: note.timestamp as string
      });
    
    if (error) throw error;
  });
};

export const loadTaskNotes = async (): Promise<TaskNote[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('task_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(note => ({
      id: note.id as string,
      taskId: note.task_id as string,
      workerId: note.worker_id as string,
      noteText: note.note_text as string,
      timestamp: note.created_at as string
    })) as TaskNote[];
  });
};

// TIME LOGS
export const saveTimeLog = async (timeLog: TaskTimeLog): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('time_logs')
      .upsert({
        id: timeLog.id as string,
        task_id: (timeLog.taskId || null) as string | null,
        worker_id: (timeLog.workerId || null) as string | null,
        start_time: timeLog.startTime as string,
        end_time: (timeLog.endTime || null) as string | null,
        duration: (timeLog.duration || null) as number | null
      });
    
    if (error) throw error;
  });
};

export const loadTimeLogs = async (): Promise<TaskTimeLog[]> => {
  return handleSupabaseOperation(async () => {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .order('start_time', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(log => ({
      id: log.id as string,
      taskId: log.task_id as string,
      workerId: log.worker_id as string,
      startTime: log.start_time as string,
      endTime: (log.end_time || undefined) as string | undefined,
      duration: (log.duration || undefined) as number | undefined
    })) as TaskTimeLog[];
  });
};

// CHECKLISTS
export const saveStartChecklist = async (checklist: any): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('start_checklists')
      .insert({
        shift_id: (checklist.shiftId || null) as string | null,
        work_order_number: checklist.workOrderNumber as string,
        pallet_number: checklist.palletNumber as string,
        part_number: checklist.partNumber as string,
        program_number: checklist.programNumber as string,
        starting_block_number: checklist.startingBlockNumber as string,
        tool_number: checklist.toolNumber as string,
        tools_requiring_attention: (checklist.toolsRequiringAttention || null) as string[] | null,
        immediate_attention_tools: (checklist.immediateAttentionTools || null) as string[] | null,
        notes: (checklist.notes || null) as string | null,
        safety_checks: checklist.safetyChecks as any,
        created_by: (checklist.completedBy || null) as string | null
      });
    
    if (error) throw error;
  });
};

export const saveEndCleanup = async (cleanup: any): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('end_cleanups')
      .insert({
        shift_id: (cleanup.shiftId || null) as string | null,
        preparation_checks: cleanup.preparationChecks as any,
        cleaning_checks: cleanup.cleaningChecks as any,
        notes: (cleanup.notes || null) as string | null,
        created_by: (cleanup.completedBy || null) as string | null
      });
    
    if (error) throw error;
  });
};

// DATA SYNCHRONIZATION
export const syncAllData = async (localData: any): Promise<void> => {
  try {
    console.log('Starting data synchronization...');
    
    // Sync shifts
    for (const shift of (localData.shifts || []) as Shift[]) {
      await saveShift(shift);
    }
    
    // Sync workers
    for (const worker of (localData.workers || []) as Worker[]) {
      await saveWorker(worker);
    }
    
    // Sync parts
    for (const part of (localData.parts || []) as Part[]) {
      await savePart(part);
    }
    
    // Sync tasks
    for (const task of (localData.tasks || []) as Task[]) {
      await saveTask(task);
    }
    
    // Sync task notes
    for (const note of (localData.taskNotes || []) as TaskNote[]) {
      await saveTaskNote(note);
    }
    
    // Sync time logs
    for (const timeLog of (localData.taskTimeLogs || []) as TaskTimeLog[]) {
      await saveTimeLog(timeLog);
    }
    
    console.log('Data synchronization completed successfully');
  } catch (error) {
    console.error('Data synchronization failed:', error);
    throw error;
  }
};

export const loadAllCloudData = async () => {
  try {
    console.log('Loading all data from cloud...');
    
    const [shifts, workers, parts, tasks, taskNotes, timeLogs] = await Promise.all([
      loadShifts(),
      loadWorkers(),
      loadParts(),
      loadTasks(),
      loadTaskNotes(),
      loadTimeLogs()
    ]);
    
    console.log('Successfully loaded all cloud data');
    
    return {
      shifts: shifts as Shift[],
      workers: workers as Worker[],
      parts: parts as Part[],
      tasks: tasks as Task[],
      taskNotes: taskNotes as TaskNote[],
      timeLogs: timeLogs as TaskTimeLog[],
      shiftReports: [] as ShiftReport[] // Will be populated as needed
    };
  } catch (error) {
    console.error('Failed to load cloud data:', error);
    return null;
  }
};