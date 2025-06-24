import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any;

// For local development, create a mock client if credentials are missing
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.warn('Supabase credentials not configured. Running in local-only mode.');
  
  // Create a mock query builder that supports method chaining
  const createMockQueryBuilder = () => {
    const mockQueryBuilder = {
      select: function() { return this; },
      insert: function() { return this; },
      update: function() { return this; },
      delete: function() { return this; },
      eq: function() { return this; },
      is: function() { return this; },
      single: function() { return this; },
      order: function() { return this; },
      limit: function() { return this; },
      gte: function() { return this; },
      lte: function() { return this; },
      gt: function() { return this; },
      lt: function() { return this; },
      neq: function() { return this; },
      in: function() { return this; },
      contains: function() { return this; },
      filter: function() { return this; },
      match: function() { return this; },
      range: function() { return this; },
      // Make it awaitable by implementing then()
      then: function(resolve: any) {
        return resolve({ data: [], error: null });
      },
      // Support for promise-like behavior
      catch: function() { return this; },
      finally: function() { return this; }
    };
    return mockQueryBuilder;
  };
  
  // Create a mock client that returns empty data
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => createMockQueryBuilder(),
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