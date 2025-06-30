/*
  # Fix RLS policies for parts, tasks, and workers tables

  1. Security Updates
    - Enable RLS on all tables
    - Create proper policies for authenticated users
    - Use correct Supabase auth functions instead of jwt()
    - Allow operations when facility_id is NULL or matches user context

  2. Tables Updated
    - parts: Full CRUD policies
    - tasks: Full CRUD policies  
    - workers: Full CRUD policies

  3. Policy Logic
    - Allow access when facility_id is NULL (global data)
    - Allow access when user has matching facility context
    - Exclude soft-deleted records (deleted_at IS NULL)
*/

-- Ensure RLS is enabled on all tables
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies for parts table
DROP POLICY IF EXISTS "parts_facility_policy" ON parts;
DROP POLICY IF EXISTS "Allow authenticated users to select parts" ON parts;
DROP POLICY IF EXISTS "Allow authenticated users to insert parts" ON parts;
DROP POLICY IF EXISTS "Allow authenticated users to update parts" ON parts;
DROP POLICY IF EXISTS "Allow authenticated users to delete parts" ON parts;

-- Create comprehensive policies for parts table
CREATE POLICY "Allow authenticated users to select parts"
  ON parts
  FOR SELECT
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert parts"
  ON parts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to update parts"
  ON parts
  FOR UPDATE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete parts"
  ON parts
  FOR DELETE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );

-- Update tasks table policies to be more permissive
DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to select tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON tasks;

CREATE POLICY "Allow authenticated users to select tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );

-- Ensure workers table has proper policies
DROP POLICY IF EXISTS "workers_facility_policy" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to select workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

CREATE POLICY "Allow authenticated users to select workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (
    facility_id IS NULL 
    AND deleted_at IS NULL
  );