/*
  # Fix RLS Policies for Parts, Tasks, and Workers

  1. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to perform CRUD operations
    - Use auth.uid() instead of jwt() function
    - Allow access to records where facility_id is NULL (global data)

  2. Changes
    - Drop existing conflicting policies
    - Create new comprehensive policies for parts, tasks, and workers
    - Ensure soft-deleted records are filtered out
*/

-- Ensure RLS is enabled on all tables
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies for parts table
DROP POLICY IF EXISTS "parts_facility_policy" ON parts;

-- Create comprehensive policies for parts table
CREATE POLICY "Allow authenticated users to select parts"
  ON parts
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
    AND deleted_at IS NULL
  );

-- Update tasks table policies to be more permissive
DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;

CREATE POLICY "Allow authenticated users to select tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
    AND deleted_at IS NULL
  );

-- Ensure workers table has proper policies
DROP POLICY IF EXISTS "workers_facility_policy" ON workers;

CREATE POLICY "Allow authenticated users to select workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
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
    (facility_id IS NULL OR auth.uid() IS NOT NULL)
    AND deleted_at IS NULL
  );