/*
  # Complete CNC Shop Management Database Schema

  This migration creates the complete database schema for the CNC Shop Management application.
  
  ## New Tables
  1. **users** - User accounts and authentication
  2. **shifts** - Work shifts (A, B, C)
  3. **workers** - Shop floor workers
  4. **parts** - Manufacturing parts catalog
  5. **tasks** - Work orders and tasks
  6. **task_notes** - Notes attached to tasks
  7. **time_logs** - Time tracking for tasks
  8. **shift_reports** - End-of-shift reports
  9. **start_checklists** - Start-of-shift safety checklists
  10. **end_cleanups** - End-of-shift cleanup checklists
  11. **calibrations** - Equipment calibration records
  12. **audit_logs** - System audit trail

  ## Security
  - Enable RLS on all tables
  - Add appropriate policies for authenticated users
  - Multi-tenant support with facility_id

  ## Functions and Triggers
  - Audit logging trigger function
  - Shift summary refresh function
  - Materialized view for shift summaries
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])),
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  facility_id uuid
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING ((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid) OR ((jwt() ->> 'facility_id'::text) IS NULL));

CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK ((uid() IS NOT NULL) AND ((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid) OR ((jwt() ->> 'facility_id'::text) IS NULL)));

CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING ((uid() IS NOT NULL) AND ((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid) OR ((jwt() ->> 'facility_id'::text) IS NULL)))
  WITH CHECK ((uid() IS NOT NULL) AND ((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid) OR ((jwt() ->> 'facility_id'::text) IS NULL)));

CREATE POLICY "Allow authenticated users to delete shifts"
  ON shifts
  FOR DELETE
  TO authenticated
  USING ((uid() IS NOT NULL) AND ((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid) OR ((jwt() ->> 'facility_id'::text) IS NULL)));

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  role text NOT NULL,
  shift_id uuid REFERENCES shifts(id),
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  facility_id uuid
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS unique_worker_name_facility 
  ON workers (name, facility_id) NULLS NOT DISTINCT;

CREATE POLICY "workers_facility_policy"
  ON workers
  FOR SELECT
  TO authenticated
  USING (((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)) AND (deleted_at IS NULL));

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number text NOT NULL,
  revision text NOT NULL,
  material text NOT NULL,
  coating text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  facility_id uuid
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS unique_part_number_revision 
  ON parts (part_number, revision, facility_id) NULLS NOT DISTINCT;

CREATE POLICY "parts_facility_policy"
  ON parts
  FOR SELECT
  TO authenticated
  USING (((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)) AND (deleted_at IS NULL));

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id uuid REFERENCES parts(id),
  description text NOT NULL,
  estimated_duration integer NOT NULL,
  priority text NOT NULL CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  shift_id uuid REFERENCES shifts(id),
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  carried_over_from_task_id uuid REFERENCES tasks(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  facility_id uuid
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tasks_shift_id ON tasks (shift_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);

CREATE POLICY "tasks_facility_policy"
  ON tasks
  FOR ALL
  TO authenticated
  USING (((facility_id IS NULL) OR (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)) AND (deleted_at IS NULL))
  WITH CHECK (facility_id = ((jwt() ->> 'facility_id'::text))::uuid);

-- Create task_notes table
CREATE TABLE IF NOT EXISTS task_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id),
  worker_id uuid REFERENCES workers(id),
  note_text text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes (task_id);

CREATE POLICY "Allow authenticated CRUD access"
  ON task_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create time_logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id),
  worker_id uuid REFERENCES workers(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs (task_id);

CREATE POLICY "Allow authenticated CRUD access"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create shift_reports table
CREATE TABLE IF NOT EXISTS shift_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES shifts(id),
  date date NOT NULL,
  completed_tasks_count integer DEFAULT 0,
  pending_tasks_count integer DEFAULT 0,
  summary_notes text,
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shift_reports_shift_id ON shift_reports (shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_date ON shift_reports (date);

CREATE POLICY "Allow authenticated CRUD access"
  ON shift_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create start_checklists table
CREATE TABLE IF NOT EXISTS start_checklists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES shifts(id),
  work_order_number text NOT NULL,
  pallet_number text NOT NULL,
  part_number text NOT NULL,
  program_number text NOT NULL,
  starting_block_number text NOT NULL,
  tool_number text NOT NULL,
  tools_requiring_attention text[],
  immediate_attention_tools text[],
  notes text,
  safety_checks jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE start_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated CRUD access"
  ON start_checklists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create end_cleanups table
CREATE TABLE IF NOT EXISTS end_cleanups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES shifts(id),
  preparation_checks jsonb NOT NULL,
  cleaning_checks jsonb NOT NULL,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE end_cleanups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated CRUD access"
  ON end_cleanups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create calibrations table
CREATE TABLE IF NOT EXISTS calibrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id text NOT NULL,
  calibration_date timestamptz NOT NULL,
  next_calibration_date timestamptz NOT NULL,
  performed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated CRUD access"
  ON calibrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION process_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, operation, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workers_audit_trigger') THEN
    CREATE TRIGGER workers_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON workers
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'parts_audit_trigger') THEN
    CREATE TRIGGER parts_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON parts
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_audit_trigger') THEN
    CREATE TRIGGER tasks_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON tasks
      FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
  END IF;
END $$;

-- Create shift summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shift_summary AS
SELECT 
  s.id as shift_id,
  s.type as shift_type,
  DATE(t.created_at) as work_date,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN t.carried_over_from_task_id IS NOT NULL THEN 1 END) as carried_over_tasks,
  AVG(tl.duration) as avg_task_duration
FROM shifts s
LEFT JOIN tasks t ON s.id = t.shift_id AND t.deleted_at IS NULL
LEFT JOIN time_logs tl ON t.id = tl.task_id AND tl.end_time IS NOT NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.type, DATE(t.created_at);

-- Create function to refresh shift summary
CREATE OR REPLACE FUNCTION refresh_shift_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_shift_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh shift summary
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_shift_summary_trigger') THEN
    CREATE TRIGGER refresh_shift_summary_trigger
      AFTER INSERT OR UPDATE OR DELETE ON tasks
      FOR EACH STATEMENT EXECUTE FUNCTION refresh_shift_summary();
  END IF;
END $$;

-- Create legacy Shift table for compatibility (if needed)
CREATE TABLE IF NOT EXISTS "Shift" (
  id bigint PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE "Shift" ENABLE ROW LEVEL SECURITY;

-- Insert default shifts if they don't exist
INSERT INTO shifts (id, type, start_time, end_time) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'A', '06:00', '14:00'),
  ('550e8400-e29b-41d4-a716-446655440002', 'B', '14:00', '22:00'),
  ('550e8400-e29b-41d4-a716-446655440003', 'C', '22:00', '06:00')
ON CONFLICT (id) DO NOTHING;

-- Insert default user if it doesn't exist
INSERT INTO users (id, name, email, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Default User', 'default@company.com', '#3B82F6')
ON CONFLICT (id) DO NOTHING;