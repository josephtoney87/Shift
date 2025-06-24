import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use placeholder values for demo if not configured
const url = supabaseUrl || 'https://your-project.supabase.co';
const key = supabaseAnonKey || 'your-anon-key';

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Check if we have valid credentials
export const hasValidCredentials = () => {
  return supabaseUrl && 
         supabaseAnonKey && 
         supabaseUrl !== 'https://your-project.supabase.co' &&
         supabaseAnonKey !== 'your-anon-key';
};

// Initialize the connection and create demo user if needed
export const initializeSupabase = async () => {
  if (!hasValidCredentials()) {
    console.warn('Supabase not configured. Using local storage only.');
    return null;
  }

  try {
    // Check connection
    const { data, error } = await supabase.from('shifts').select('*').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return null;
    }
    
    console.log('Supabase connected successfully');
    return supabase;
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    return null;
  }
};