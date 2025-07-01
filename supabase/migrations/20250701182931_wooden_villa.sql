/*
  # Fix RLS policies for anonymous access

  1. Security Updates
    - Add policies to allow anonymous users to perform CRUD operations on all tables
    - This enables the application to work without requiring user authentication
    - Maintains existing authenticated user policies for future use

  2. Tables Updated
    - shifts: Allow anonymous INSERT, UPDATE, DELETE, SELECT
    - workers: Allow anonymous INSERT, UPDATE, DELETE, SELECT  
    - parts: Allow anonymous INSERT, UPDATE, DELETE, SELECT
    - tasks: Allow anonymous INSERT, UPDATE, DELETE, SELECT
    - task_notes: Allow anonymous INSERT, SELECT
    - time_logs: Allow anonymous INSERT, SELECT
    - start_checklists: Allow anonymous INSERT, SELECT
    - end_cleanups: Allow anonymous INSERT, SELECT
    - shift_reports: Allow anonymous INSERT, SELECT, UPDATE
    - calibrations: Allow anonymous INSERT, SELECT, UPDATE
    - audit_logs: Allow anonymous SELECT

  3. Notes
    - These policies enable the shop floor application to function without authentication
    - For production, consider implementing proper authentication and removing anonymous policies
*/

-- SHIFTS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select shifts"
  ON shifts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert shifts"
  ON shifts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update shifts"
  ON shifts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete shifts"
  ON shifts
  FOR DELETE
  TO anon
  USING (true);

-- WORKERS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select workers"
  ON workers
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Allow anonymous users to insert workers"
  ON workers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update workers"
  ON workers
  FOR UPDATE
  TO anon
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete workers"
  ON workers
  FOR DELETE
  TO anon
  USING (deleted_at IS NULL);

-- PARTS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select parts"
  ON parts
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Allow anonymous users to insert parts"
  ON parts
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update parts"
  ON parts
  FOR UPDATE
  TO anon
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete parts"
  ON parts
  FOR DELETE
  TO anon
  USING (deleted_at IS NULL);

-- TASKS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select tasks"
  ON tasks
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Allow anonymous users to insert tasks"
  ON tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update tasks"
  ON tasks
  FOR UPDATE
  TO anon
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete tasks"
  ON tasks
  FOR DELETE
  TO anon
  USING (deleted_at IS NULL);

-- TASK_NOTES table policies for anonymous users
CREATE POLICY "Allow anonymous users to select task_notes"
  ON task_notes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert task_notes"
  ON task_notes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- TIME_LOGS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select time_logs"
  ON time_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert time_logs"
  ON time_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- START_CHECKLISTS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select start_checklists"
  ON start_checklists
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert start_checklists"
  ON start_checklists
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- END_CLEANUPS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select end_cleanups"
  ON end_cleanups
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert end_cleanups"
  ON end_cleanups
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- SHIFT_REPORTS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select shift_reports"
  ON shift_reports
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert shift_reports"
  ON shift_reports
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update shift_reports"
  ON shift_reports
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- CALIBRATIONS table policies for anonymous users
CREATE POLICY "Allow anonymous users to select calibrations"
  ON calibrations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert calibrations"
  ON calibrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update calibrations"
  ON calibrations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- AUDIT_LOGS table policies for anonymous users (read-only)
CREATE POLICY "Allow anonymous users to select audit_logs"
  ON audit_logs
  FOR SELECT
  TO anon
  USING (true);