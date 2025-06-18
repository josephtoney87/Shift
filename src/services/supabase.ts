import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any;

// For local development, create a mock client if credentials are missing
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.warn('Supabase credentials not configured. Running in local-only mode.');
  
  // Create a mock client that returns empty data
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      eq: function() { return this; },
      is: function() { return this; },
      single: function() { return this; },
    }),
    channel: () => ({
      on: function() { return this; },
      subscribe: () => {},
    }),
    removeChannel: () => {},
  };
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
}

export { supabase };