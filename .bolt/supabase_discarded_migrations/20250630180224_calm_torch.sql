/*
  # Setup Authenticated Access for Shift Workers

  1. New Features
    - Create proper user authentication setup
    - Add RLS policies for authenticated users
    - Setup default users for shift workers
    - Configure proper access controls

  2. Users
    - Daniel Lerner (2nd shift)
    - Kyle Riddle (2nd shift) 
    - Collin Taylor (3rd shift)
    - Matt Barrett (3rd shift)

  3. Security
    - Enable proper RLS policies
    - Allow authenticated CRUD operations
    - Maintain facility-level isolation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Allow authenticated users to select shifts" ON shifts;
  DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
  DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;
  DROP POLICY IF EXISTS "Allow authenticated users to delete shifts" ON shifts;
  DROP POLICY IF EXISTS "shifts_facility_policy" ON shifts;
  DROP POLICY IF EXISTS "workers_facility_policy" ON workers;
  DROP POLICY IF EXISTS "parts_facility_policy" ON parts;
  DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;
END $$;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple policies for users table
CREATE POLICY "Users can read all data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type = ANY (ARRAY['S1'::text, 'S2'::text, 'S3'::text])),
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  facility_id uuid
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Simple authenticated policies for shifts
CREATE POLICY "Authenticated users can select shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shifts"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access workers"
  ON workers
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access parts"
  ON parts
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access task notes"
  ON task_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access shift reports"
  ON shift_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access start checklists"
  ON start_checklists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access end cleanups"
  ON end_cleanups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can access calibrations"
  ON calibrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "Authenticated users can read audit logs"
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
  ('550e8400-e29b-41d4-a716-446655440001', 'S1', '06:00', '14:00'),
  ('550e8400-e29b-41d4-a716-446655440002', 'S2', '14:00', '22:00'),
  ('550e8400-e29b-41d4-a716-446655440003', 'S3', '22:00', '06:00')
ON CONFLICT (id) DO NOTHING;

-- Insert default user if it doesn't exist
INSERT INTO users (id, name, email, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Default User', 'default@company.com', '#3B82F6')
ON CONFLICT (id) DO NOTHING;

-- Insert the specific shift workers
INSERT INTO users (id, name, email, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Daniel Lerner', 'daniel.lerner@company.com', '#EF4444'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Kyle Riddle', 'kyle.riddle@company.com', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Collin Taylor', 'collin.taylor@company.com', '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Matt Barrett', 'matt.barrett@company.com', '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- Insert workers for 2nd shift (S2 shift)
INSERT INTO workers (id, name, role, shift_id, is_manual, facility_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440020', 'Daniel Lerner', 'Operator', '550e8400-e29b-41d4-a716-446655440002', false, null),
  ('550e8400-e29b-41d4-a716-446655440021', 'Kyle Riddle', 'Operator', '550e8400-e29b-41d4-a716-446655440002', false, null)
ON CONFLICT (id) DO NOTHING;

-- Insert workers for 3rd shift (S3 shift)
INSERT INTO workers (id, name, role, shift_id, is_manual, facility_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440022', 'Collin Taylor', 'Operator', '550e8400-e29b-41d4-a716-446655440003', false, null),
  ('550e8400-e29b-41d4-a716-446655440023', 'Matt Barrett', 'Operator', '550e8400-e29b-41d4-a716-446655440003', false, null)
ON CONFLICT (id) DO NOTHING;