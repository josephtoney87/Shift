/*
  # Add Audit Logging and Facility Scoping
  
  1. New Features
    - Audit logging system for tracking changes
    - Facility-level data isolation
    - Soft delete support
    - Materialized view for shift summaries
  
  2. Changes
    - Added facility_id to relevant tables
    - Added deleted_at for soft deletes
    - Created audit triggers and policies
    - Updated RLS policies for facility scoping
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create audit_logs policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_select_policy'
  ) THEN
    CREATE POLICY "audit_logs_select_policy" ON audit_logs
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Add soft delete support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add facility scoping
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS facility_id uuid;

-- Add unique constraints with NULLS NOT DISTINCT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_part_number_revision'
  ) THEN
    ALTER TABLE parts 
      ADD CONSTRAINT unique_part_number_revision 
      UNIQUE NULLS NOT DISTINCT (part_number, revision, facility_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_worker_name_facility'
  ) THEN
    ALTER TABLE workers 
      ADD CONSTRAINT unique_worker_name_facility 
      UNIQUE NULLS NOT DISTINCT (name, facility_id);
  END IF;
END $$;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION process_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      operation,
      old_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      operation,
      new_data,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_audit_trigger'
  ) THEN
    CREATE TRIGGER tasks_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON tasks
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'workers_audit_trigger'
  ) THEN
    CREATE TRIGGER workers_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON workers
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'parts_audit_trigger'
  ) THEN
    CREATE TRIGGER parts_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON parts
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;
END $$;

-- Create materialized view for shift summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shift_summary AS
SELECT 
  s.id AS shift_id,
  s.type AS shift_type,
  DATE(t.created_at) AS work_date,
  COUNT(t.id) AS total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS in_progress_tasks,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending_tasks,
  COUNT(CASE WHEN t.carried_over_from_task_id IS NOT NULL THEN 1 END) AS carried_over_tasks,
  AVG(CASE WHEN t.status = 'completed' AND tl.duration IS NOT NULL 
      THEN tl.duration END) AS avg_task_duration
FROM shifts s
LEFT JOIN tasks t ON s.id = t.shift_id AND t.deleted_at IS NULL
LEFT JOIN time_logs tl ON t.id = tl.task_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.type, DATE(t.created_at);

-- Create index on materialized view
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'mv_shift_summary_idx'
  ) THEN
    CREATE UNIQUE INDEX mv_shift_summary_idx ON mv_shift_summary (shift_id, work_date);
  END IF;
END $$;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_shift_summary()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_shift_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create refresh trigger
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_shift_summary_trigger'
  ) THEN
    CREATE TRIGGER refresh_shift_summary_trigger
      AFTER INSERT OR UPDATE OR DELETE
      ON tasks
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_shift_summary();
  END IF;
END $$;

-- Update policies safely
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON tasks;
  DROP POLICY IF EXISTS "Allow authenticated read access" ON workers;
  DROP POLICY IF EXISTS "Allow authenticated read access" ON parts;
  DROP POLICY IF EXISTS "Allow authenticated read access" ON shifts;
  DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;
  DROP POLICY IF EXISTS "workers_facility_policy" ON workers;
  DROP POLICY IF EXISTS "parts_facility_policy" ON parts;
  DROP POLICY IF EXISTS "shifts_facility_policy" ON shifts;

  -- Create new facility-scoped policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_facility_policy'
  ) THEN
    CREATE POLICY "tasks_facility_policy" ON tasks
      FOR ALL TO authenticated
      USING (
        (facility_id IS NULL OR facility_id = (auth.jwt() ->> 'facility_id')::uuid)
        AND deleted_at IS NULL
      )
      WITH CHECK (
        facility_id = (auth.jwt() ->> 'facility_id')::uuid
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'workers_facility_policy'
  ) THEN
    CREATE POLICY "workers_facility_policy" ON workers
      FOR SELECT TO authenticated
      USING (
        (facility_id IS NULL OR facility_id = (auth.jwt() ->> 'facility_id')::uuid)
        AND deleted_at IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parts' AND policyname = 'parts_facility_policy'
  ) THEN
    CREATE POLICY "parts_facility_policy" ON parts
      FOR SELECT TO authenticated
      USING (
        (facility_id IS NULL OR facility_id = (auth.jwt() ->> 'facility_id')::uuid)
        AND deleted_at IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_facility_policy'
  ) THEN
    CREATE POLICY "shifts_facility_policy" ON shifts
      FOR SELECT TO authenticated
      USING (
        (facility_id IS NULL OR facility_id = (auth.jwt() ->> 'facility_id')::uuid)
        AND deleted_at IS NULL
      );
  END IF;
END $$;