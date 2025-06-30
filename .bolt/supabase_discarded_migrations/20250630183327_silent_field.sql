/*
  # Remove JWT Dependencies from Database

  1. Policy Updates
    - Remove all JWT-based policy conditions
    - Simplify to basic authenticated user access
    - Remove facility_id filtering that depends on JWT parsing
    
  2. Security Simplification
    - Maintain RLS protection
    - Use simple authenticated user checks
    - Remove complex JWT token parsing
*/

-- First, drop all existing policies that reference JWT or facility filtering
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop policies on shifts table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'shifts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON shifts';
    END LOOP;
    
    -- Drop policies on workers table  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON workers';
    END LOOP;
    
    -- Drop policies on parts table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'parts') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON parts';
    END LOOP;
    
    -- Drop policies on tasks table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON tasks';
    END LOOP;
END $$;

-- Create new simplified policies

-- Shifts policies
CREATE POLICY "shifts_authenticated_access"
  ON shifts
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Workers policies  
CREATE POLICY "workers_authenticated_access"
  ON workers
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Parts policies
CREATE POLICY "parts_authenticated_access"
  ON parts
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Tasks policies
CREATE POLICY "tasks_authenticated_access"
  ON tasks
  FOR ALL
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- Task notes policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON task_notes;
CREATE POLICY "task_notes_authenticated_access"
  ON task_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Time logs policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON time_logs;
CREATE POLICY "time_logs_authenticated_access"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Shift reports policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON shift_reports;
CREATE POLICY "shift_reports_authenticated_access"
  ON shift_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Start checklists policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON start_checklists;
CREATE POLICY "start_checklists_authenticated_access"
  ON start_checklists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- End cleanups policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON end_cleanups;
CREATE POLICY "end_cleanups_authenticated_access"
  ON end_cleanups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Calibrations policies
DROP POLICY IF EXISTS "Allow authenticated CRUD access" ON calibrations;
CREATE POLICY "calibrations_authenticated_access"
  ON calibrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit logs policies
DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
CREATE POLICY "audit_logs_authenticated_access"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Remove any foreign key constraints that reference users table if they exist
-- (since we're removing user authentication dependencies)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Check and drop foreign key constraints that reference users table
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE confrelid = (SELECT oid FROM pg_class WHERE relname = 'users')
    LOOP
        EXECUTE 'ALTER TABLE ' || 
                (SELECT schemaname||'.'||tablename 
                 FROM pg_tables 
                 WHERE schemaname = 'public' AND 
                       tablename IN (SELECT relname FROM pg_class WHERE oid IN 
                                   (SELECT conrelid FROM pg_constraint WHERE conname = constraint_name))) ||
                ' DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Update any columns that had user references to be nullable
ALTER TABLE audit_logs ALTER COLUMN changed_by DROP NOT NULL;
ALTER TABLE task_notes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE time_logs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE shift_reports ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE shift_reports ALTER COLUMN acknowledged_by DROP NOT NULL;
ALTER TABLE start_checklists ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE end_cleanups ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE calibrations ALTER COLUMN performed_by DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN created_by DROP NOT NULL;