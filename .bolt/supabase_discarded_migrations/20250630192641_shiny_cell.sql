/*
  # Fix RLS policies for parts and tasks tables

  1. Security Updates
    - Add proper RLS policies for parts table to allow authenticated users to perform CRUD operations
    - Add proper RLS policies for tasks table to allow authenticated users to perform CRUD operations
    - Ensure policies work with facility_id filtering where applicable

  2. Changes
    - Enable RLS on parts table (if not already enabled)
    - Add comprehensive policies for parts table
    - Update tasks table policies to be more permissive for authenticated users
    - Add policies for users table if needed
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
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert parts"
  ON parts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to update parts"
  ON parts
  FOR UPDATE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to delete parts"
  ON parts
  FOR DELETE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );

-- Update tasks table policies to be more permissive
DROP POLICY IF EXISTS "tasks_facility_policy" ON tasks;

CREATE POLICY "Allow authenticated users to select tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );

-- Ensure workers table has proper policies
DROP POLICY IF EXISTS "workers_facility_policy" ON workers;

CREATE POLICY "Allow authenticated users to select workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL)
  );

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (
    (facility_id IS NULL OR facility_id = ((jwt() ->> 'facility_id'::text))::uuid OR ((jwt() ->> 'facility_id'::text) IS NULL))
    AND deleted_at IS NULL
  );