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
  id: task.id,
  description: task.description,
  estimated_duration: task.estimatedDuration,
  priority: task.priority,
  shift_id: task.shiftId,
  status: task.status,
  part_id: task.partId,
  carried_over_from_task_id: task.carriedOverFromTaskId,
  created_by: task.createdBy,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  facility_id: null // For multi-tenancy support
});

const convertTaskFromDb = (dbTask: any): Task => ({
  id: dbTask.id,
  workOrderNumber: dbTask.work_order_number || dbTask.description?.split(' ')[0] || `WO-${dbTask.id.slice(-6)}`,
  partId: dbTask.part_id,
  description: dbTask.description,
  estimatedDuration: dbTask.estimated_duration,
  priority: dbTask.priority as TaskPriority,
  assignedWorkers: [], // Will be populated separately
  shiftId: dbTask.shift_id,
  status: dbTask.status as TaskStatus,
  carriedOverFromTaskId: dbTask.carried_over_from_task_id,
  createdAt: dbTask.created_at,
  updatedAt: dbTask.updated_at,
  createdBy: dbTask.created_by
});

// SHIFTS
export const saveShift = async (shift: Shift): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('shifts')
      .upsert({
        id: shift.id,
        type: shift.type,
        start_time: shift.startTime,
        end_time: shift.endTime,
        updated_at: new Date().toISOString()
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
    
    return data?.map(shift => ({
      id: shift.id,
      type: shift.type,
      startTime: shift.start_time,
      endTime: shift.end_time
    })) || [];
  });
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('shifts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', shiftId);
    
    if (error) throw error;
  });
};

// WORKERS
export const saveWorker = async (worker: Worker): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('workers')
      .upsert({
        id: worker.id,
        name: worker.name,
        role: worker.role,
        shift_id: worker.shiftId,
        is_manual: worker.isManual || false,
        updated_at: new Date().toISOString()
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
    
    return data?.map(worker => ({
      id: worker.id,
      name: worker.name,
      role: worker.role,
      shiftId: worker.shift_id,
      isManual: worker.is_manual
    })) || [];
  });
};

export const deleteWorker = async (workerId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('workers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', workerId);
    
    if (error) throw error;
  });
};

// PARTS
export const savePart = async (part: Part): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('parts')
      .upsert({
        id: part.id,
        part_number: part.partNumber,
        revision: part.revision,
        material: part.material,
        coating: part.coating,
        updated_at: new Date().toISOString()
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
    
    return data?.map(part => ({
      id: part.id,
      partNumber: part.part_number,
      revision: part.revision,
      material: part.material,
      coating: part.coating
    })) || [];
  });
};

// TASKS
export const saveTask = async (task: Task): Promise<void> => {
  await handleSupabaseOperation(async () => {
    // First ensure the part exists
    const part = await supabase
      .from('parts')
      .select('id')
      .eq('id', task.partId)
      .single();

    if (!part.data) {
      // Create a simple part record if it doesn't exist
      await supabase
        .from('parts')
        .upsert({
          id: task.partId,
          part_number: task.workOrderNumber,
          revision: 'N/A',
          material: 'N/A'
        });
    }

    const { error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        description: `[${task.workOrderNumber}] ${task.description}`,
        estimated_duration: task.estimatedDuration,
        priority: task.priority,
        shift_id: task.shiftId,
        status: task.status,
        part_id: task.partId,
        carried_over_from_task_id: task.carriedOverFromTaskId,
        created_by: task.createdBy,
        created_at: task.createdAt,
        updated_at: task.updatedAt
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
    
    return data?.map(task => {
      // Extract work order number from description if it's formatted as [WO] description
      const match = task.description.match(/^\[([^\]]+)\]\s*(.*)$/);
      const workOrderNumber = match ? match[1] : `WO-${task.id.slice(-6)}`;
      const description = match ? match[2] : task.description;

      return {
        id: task.id,
        workOrderNumber,
        partId: task.part_id,
        description,
        estimatedDuration: task.estimated_duration,
        priority: task.priority as TaskPriority,
        assignedWorkers: [], // Will be populated from a junction table in a full implementation
        shiftId: task.shift_id,
        status: task.status as TaskStatus,
        carriedOverFromTaskId: task.carried_over_from_task_id,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        createdBy: task.created_by
      };
    }) || [];
  });
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);
    
    if (error) throw error;
  });
};

// TASK NOTES
export const saveTaskNote = async (note: TaskNote): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('task_notes')
      .upsert({
        id: note.id,
        task_id: note.taskId,
        worker_id: note.workerId,
        note_text: note.noteText,
        created_at: note.timestamp
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
    
    return data?.map(note => ({
      id: note.id,
      taskId: note.task_id,
      workerId: note.worker_id,
      noteText: note.note_text,
      timestamp: note.created_at
    })) || [];
  });
};

// TIME LOGS
export const saveTimeLog = async (timeLog: TaskTimeLog): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('time_logs')
      .upsert({
        id: timeLog.id,
        task_id: timeLog.taskId,
        worker_id: timeLog.workerId,
        start_time: timeLog.startTime,
        end_time: timeLog.endTime,
        duration: timeLog.duration
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
    
    return data?.map(log => ({
      id: log.id,
      taskId: log.task_id,
      workerId: log.worker_id,
      startTime: log.start_time,
      endTime: log.end_time,
      duration: log.duration
    })) || [];
  });
};

// CHECKLISTS
export const saveStartChecklist = async (checklist: any): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('start_checklists')
      .insert({
        shift_id: checklist.shiftId,
        work_order_number: checklist.workOrderNumber,
        pallet_number: checklist.palletNumber,
        part_number: checklist.partNumber,
        program_number: checklist.programNumber,
        starting_block_number: checklist.startingBlockNumber,
        tool_number: checklist.toolNumber,
        tools_requiring_attention: checklist.toolsRequiringAttention,
        immediate_attention_tools: checklist.immediateAttentionTools,
        notes: checklist.notes,
        safety_checks: checklist.safetyChecks,
        created_by: checklist.completedBy
      });
    
    if (error) throw error;
  });
};

export const saveEndCleanup = async (cleanup: any): Promise<void> => {
  await handleSupabaseOperation(async () => {
    const { error } = await supabase
      .from('end_cleanups')
      .insert({
        shift_id: cleanup.shiftId,
        preparation_checks: cleanup.preparationChecks,
        cleaning_checks: cleanup.cleaningChecks,
        notes: cleanup.notes,
        created_by: cleanup.completedBy
      });
    
    if (error) throw error;
  });
};

// DATA SYNCHRONIZATION
export const syncAllData = async (localData: any): Promise<void> => {
  try {
    console.log('Starting data synchronization...');
    
    // Sync shifts
    for (const shift of localData.shifts || []) {
      await saveShift(shift);
    }
    
    // Sync workers
    for (const worker of localData.workers || []) {
      await saveWorker(worker);
    }
    
    // Sync parts
    for (const part of localData.parts || []) {
      await savePart(part);
    }
    
    // Sync tasks
    for (const task of localData.tasks || []) {
      await saveTask(task);
    }
    
    // Sync task notes
    for (const note of localData.taskNotes || []) {
      await saveTaskNote(note);
    }
    
    // Sync time logs
    for (const timeLog of localData.taskTimeLogs || []) {
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
      shifts,
      workers,
      parts,
      tasks,
      taskNotes,
      timeLogs,
      shiftReports: [] // Will be populated as needed
    };
  } catch (error) {
    console.error('Failed to load cloud data:', error);
    return null;
  }
};