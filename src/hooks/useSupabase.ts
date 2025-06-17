import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Database } from '../types/supabase';

type Tables = Database['public']['Tables'];

export function useSupabaseQuery<T extends keyof Tables>(
  table: T,
  options: {
    select?: string;
    eq?: { column: string; value: any }[];
    order?: { column: string; ascending?: boolean }[];
    limit?: number;
  } = {}
) {
  const [data, setData] = useState<Tables[T]['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let query = supabase.from(table).select(options.select || '*');

        if (options.eq) {
          options.eq.forEach(({ column, value }) => {
            query = query.eq(column, value);
          });
        }

        if (options.order) {
          options.order.forEach(({ column, ascending = true }) => {
            query = query.order(column, { ascending });
          });
        }

        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, JSON.stringify(options)]);

  return { data, loading, error };
}

export function useSupabaseSubscription<T extends keyof Tables>(
  table: T,
  callback: (payload: any) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
}