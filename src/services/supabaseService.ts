import { supabase } from './supabase';
import type { Database } from '../types/supabase';

// Type-safe table access
type Tables = Database['public']['Tables'];

export const getShifts = async () => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .is('deleted_at', null);
  
  if (error) throw error;
  return data;
};

export const getWorkers = async () => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .is('deleted_at', null);
  
  if (error) throw error;
  return data;
};

export const getParts = async () => {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .is('deleted_at', null);
  
  if (error) throw error;
  return data;
};

export const getTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      part:parts(*),
      workers:workers(*),
      time_logs:time_logs(*)
    `)
    .is('deleted_at', null);
  
  if (error) throw error;
  return data;
};

export const createTask = async (task: Omit<Tables['tasks']['Insert'], 'id'>) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, updates: Partial<Tables['tasks']['Update']>) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
};

export const createTimeLog = async (timeLog: Omit<Tables['time_logs']['Insert'], 'id'>) => {
  const { data, error } = await supabase
    .from('time_logs')
    .insert(timeLog)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTimeLog = async (id: string, updates: Partial<Tables['time_logs']['Update']>) => {
  const { data, error } = await supabase
    .from('time_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const createTaskNote = async (note: Omit<Tables['task_notes']['Insert'], 'id'>) => {
  const { data, error } = await supabase
    .from('task_notes')
    .insert(note)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getTaskNotes = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_notes')
    .select('*, worker:workers(*)')
    .eq('task_id', taskId);
  
  if (error) throw error;
  return data;
};

export const createStartChecklist = async (checklist: Omit<Tables['start_checklists']['Insert'], 'id'>) => {
  const { data, error } = await supabase
    .from('start_checklists')
    .insert(checklist)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const createEndCleanup = async (cleanup: Omit<Tables['end_cleanups']['Insert'], 'id'>) => {
  const { data, error } = await supabase
    .from('end_cleanups')
    .insert(cleanup)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getShiftSummary = async (shiftId: string, date: string) => {
  const { data, error } = await supabase
    .from('mv_shift_summary')
    .select('*')
    .eq('shift_id', shiftId)
    .eq('work_date', date)
    .single();
  
  if (error) throw error;
  return data;
};

// Subscribe to real-time changes
export const subscribeToTasks = (callback: (payload: any) => void) => {
  return supabase
    .channel('tasks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      callback
    )
    .subscribe();
};

export const subscribeToTimeLogs = (callback: (payload: any) => void) => {
  return supabase
    .channel('time_logs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_logs'
      },
      callback
    )
    .subscribe();
};