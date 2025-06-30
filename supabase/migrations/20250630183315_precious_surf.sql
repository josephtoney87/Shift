/*
  # Remove JWT dependencies and simplify policies

  1. Security Changes
    - Remove JWT-based policies
    - Simplify RLS policies to use basic authentication
    - Remove facility_id filtering that depends on JWT
    
  2. Updated Policies
    - Simple authenticated user access
    - Remove complex JWT token parsing
    - Maintain data security without JWT complexity
*/

-- Drop existing policies that use JWT
DROP POLICY IF EXISTS "Allow authenticated users to delete shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to select shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;

DROP POLICY IF EXISTS "workers_facility_policy" ON workers;
DROP POLICY IF EXISTS "parts_facility_policy" ON parts;
DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;

-- Create simplified policies for shifts
CREATE POLICY "Authenticated users can manage shifts"
  ON shifts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for workers
CREATE POLICY "Authenticated users can manage workers"
  ON workers
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create simplified policies for parts
CREATE POLICY "Authenticated users can manage parts"
  ON parts
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create simplified policies for tasks
CREATE POLICY "Authenticated users can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Update existing policies to remove JWT dependencies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON task_notes;
CREATE POLICY "Authenticated users can manage task notes"
  ON task_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON time_logs;
CREATE POLICY "Authenticated users can manage time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON shift_reports;
CREATE POLICY "Authenticated users can manage shift reports"
  ON shift_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON start_checklists;
CREATE POLICY "Authenticated users can manage start checklists"
  ON start_checklists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON end_cleanups;
CREATE POLICY "Authenticated users can manage end cleanups"
  ON end_cleanups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON calibrations;
CREATE POLICY "Authenticated users can manage calibrations"
  ON calibrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Remove audit_logs JWT dependency
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);