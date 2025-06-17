/*
  # Initial Schema Setup for CNC Shop Management

  1. Tables
    - `shifts`: Store shift information
    - `workers`: Store worker information
    - `parts`: Store part information
    - `tasks`: Store task information
    - `task_notes`: Store task notes
    - `time_logs`: Store time tracking logs
    - `shift_reports`: Store shift reports
    - `start_checklists`: Store start of shift checklists
    - `end_cleanups`: Store end of shift cleanups
    - `calibrations`: Store calibration records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('A', 'B', 'C')),
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  role text NOT NULL,
  shift_id uuid REFERENCES shifts(id),
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number text NOT NULL,
  revision text NOT NULL,
  material text NOT NULL,
  coating text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id uuid REFERENCES parts(id),
  description text NOT NULL,
  estimated_duration integer NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  shift_id uuid REFERENCES shifts(id),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  carried_over_from_task_id uuid REFERENCES tasks(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_notes table
CREATE TABLE IF NOT EXISTS task_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id),
  worker_id uuid REFERENCES workers(id),
  note_text text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create time_logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid REFERENCES tasks(id),
  worker_id uuid REFERENCES workers(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create shift_reports table
CREATE TABLE IF NOT EXISTS shift_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES shifts(id),
  date date NOT NULL,
  completed_tasks_count integer DEFAULT 0,
  pending_tasks_count integer DEFAULT 0,
  summary_notes text,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create end_cleanups table
CREATE TABLE IF NOT EXISTS end_cleanups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES shifts(id),
  preparation_checks jsonb NOT NULL,
  cleaning_checks jsonb NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create calibrations table
CREATE TABLE IF NOT EXISTS calibrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id text NOT NULL,
  calibration_date timestamptz NOT NULL,
  next_calibration_date timestamptz NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE start_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_cleanups ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access" ON shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON workers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON parts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated CRUD access" ON tasks
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON task_notes
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON time_logs
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON shift_reports
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON start_checklists
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON end_cleanups
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated CRUD access" ON calibrations
  FOR ALL TO authenticated USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_shift_id ON tasks(shift_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_shift_id ON shift_reports(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_date ON shift_reports(date);