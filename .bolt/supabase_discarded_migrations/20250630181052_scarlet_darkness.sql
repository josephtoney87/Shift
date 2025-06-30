/*
  # Remove All Authentication Requirements

  1. Security Changes
    - Drop all RLS policies that require authentication
    - Create public access policies for all tables
    - Remove any user-based restrictions
    - Allow anonymous access to all data

  2. Tables Affected
    - shifts: Full public access
    - workers: Full public access  
    - parts: Full public access
    - tasks: Full public access
    - task_notes: Full public access
    - time_logs: Full public access
    - shift_reports: Full public access
    - start_checklists: Full public access
    - end_cleanups: Full public access
    - calibrations: Full public access
    - audit_logs: Read-only public access
*/

-- Drop all existing authentication-based policies
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

-- Create public access policies for shifts
CREATE POLICY "shifts_public_access" ON shifts
  FOR ALL TO public
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create public access policies for workers
CREATE POLICY "workers_public_access" ON workers
  FOR ALL TO public
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create public access policies for parts
CREATE POLICY "parts_public_access" ON parts
  FOR ALL TO public
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create public access policies for tasks
CREATE POLICY "tasks_public_access" ON tasks
  FOR ALL TO public
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Create public access policies for task_notes
CREATE POLICY "task_notes_public_access" ON task_notes
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public access policies for time_logs
CREATE POLICY "time_logs_public_access" ON time_logs
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public access policies for shift_reports
CREATE POLICY "shift_reports_public_access" ON shift_reports
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public access policies for start_checklists
CREATE POLICY "start_checklists_public_access" ON start_checklists
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public access policies for end_cleanups
CREATE POLICY "end_cleanups_public_access" ON end_cleanups
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public access policies for calibrations
CREATE POLICY "calibrations_public_access" ON calibrations
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Create public read access for audit_logs
CREATE POLICY "audit_logs_public_read" ON audit_logs
  FOR SELECT TO public
  USING (true);

-- Drop the user ID function since it's no longer needed
DROP FUNCTION IF EXISTS get_current_user_id();

-- Remove any remaining user-based constraints or references
-- This ensures the database is fully accessible without authentication