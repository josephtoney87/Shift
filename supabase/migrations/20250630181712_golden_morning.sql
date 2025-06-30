/*
  # Restore Database to Original Working State
  
  This migration restores the database to the state it was in before the authentication errors.
  It removes all the problematic policies and restores the original simple RLS setup.
  
  1. Security
    - Drop all current policies that may be causing issues
    - Restore original simple RLS policies that were working
    - Keep RLS enabled but with basic access controls
  
  2. Tables Restored
    - All tables return to their original working state
    - Simple policies that don't use complex JWT functions
    - Basic authenticated access without facility restrictions
*/

-- Drop all current policies that may be causing issues
DROP POLICY IF EXISTS "shifts_public_access" ON shifts;
DROP POLICY IF EXISTS "workers_public_access" ON workers;
DROP POLICY IF EXISTS "parts_public_access" ON parts;
DROP POLICY IF EXISTS "tasks_public_access" ON tasks;
DROP POLICY IF EXISTS "task_notes_public_access" ON task_notes;
DROP POLICY IF EXISTS "time_logs_public_access" ON time_logs;
DROP POLICY IF EXISTS "shift_reports_public_access" ON shift_reports;
DROP POLICY IF EXISTS "start_checklists_public_access" ON start_checklists;
DROP POLICY IF EXISTS "end_cleanups_public_access" ON end_cleanups;
DROP POLICY IF EXISTS "calibrations_public_access" ON calibrations;
DROP POLICY IF EXISTS "audit_logs_public_read" ON audit_logs;

-- Also drop any remaining authenticated policies
DROP POLICY IF EXISTS "shifts_authenticated_access" ON shifts;
DROP POLICY IF EXISTS "workers_authenticated_access" ON workers;
DROP POLICY IF EXISTS "parts_authenticated_access" ON parts;
DROP POLICY IF EXISTS "tasks_authenticated_access" ON tasks;
DROP POLICY IF EXISTS "task_notes_authenticated_access" ON task_notes;
DROP POLICY IF EXISTS "time_logs_authenticated_access" ON time_logs;
DROP POLICY IF EXISTS "shift_reports_authenticated_access" ON shift_reports;
DROP POLICY IF EXISTS "start_checklists_authenticated_access" ON start_checklists;
DROP POLICY IF EXISTS "end_cleanups_authenticated_access" ON end_cleanups;
DROP POLICY IF EXISTS "calibrations_authenticated_access" ON calibrations;
DROP POLICY IF EXISTS "audit_logs_authenticated_access" ON audit_logs;

-- Restore original simple policies for shifts
CREATE POLICY "Allow authenticated users to select shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete shifts"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Restore original simple policies for workers
CREATE POLICY "workers_facility_policy"
  ON workers
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Restore original simple policies for parts
CREATE POLICY "parts_facility_policy"
  ON parts
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to insert parts"
  ON parts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update parts"
  ON parts
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete parts"
  ON parts
  FOR DELETE
  TO authenticated
  USING (deleted_at IS NULL);

-- Restore original simple policies for tasks
CREATE POLICY "tasks_facility_policy"
  ON tasks
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Restore original policies for task_notes
CREATE POLICY "Allow authenticated CRUD access"
  ON task_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for time_logs
CREATE POLICY "Allow authenticated CRUD access"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for shift_reports
CREATE POLICY "Allow authenticated CRUD access"
  ON shift_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for start_checklists
CREATE POLICY "Allow authenticated CRUD access"
  ON start_checklists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for end_cleanups
CREATE POLICY "Allow authenticated CRUD access"
  ON end_cleanups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for calibrations
CREATE POLICY "Allow authenticated CRUD access"
  ON calibrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Restore original policies for audit_logs
CREATE POLICY "audit_logs_select_policy"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);