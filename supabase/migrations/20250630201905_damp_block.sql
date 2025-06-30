/*
  # Ensure Shift Deletion Works Properly

  1. Security
    - Ensure RLS policies allow proper deletion
    - Add comprehensive policies for all operations
    - Make sure facility_id filtering works correctly

  2. Constraints
    - Ensure foreign key constraints don't prevent deletion
    - Add proper cascade behavior where needed

  3. Indexes
    - Ensure proper indexing for performance
*/

-- Ensure RLS is enabled on all tables
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to select shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to delete shifts" ON shifts;

-- Create comprehensive policies for shifts
CREATE POLICY "Allow authenticated users to select shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  );

CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete shifts"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  );

-- Ensure workers table has proper policies
DROP POLICY IF EXISTS "Allow authenticated users to select workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

CREATE POLICY "Allow authenticated users to select workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
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
    deleted_at IS NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  );

-- Ensure tasks table has proper policies
DROP POLICY IF EXISTS "Allow authenticated users to select tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON tasks;

CREATE POLICY "Allow authenticated users to select tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
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
    deleted_at IS NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      facility_id IS NULL OR 
      facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid OR
      (auth.jwt() ->> 'facility_id'::text) IS NULL
    )
  );

-- Add indexes for better performance on deletion operations
CREATE INDEX IF NOT EXISTS idx_shifts_deleted_at ON shifts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workers_deleted_at ON workers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workers_shift_id ON workers(shift_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_shift_id ON tasks(shift_id) WHERE deleted_at IS NULL;

-- Ensure foreign key constraints don't prevent soft deletion
-- (We use soft deletion with deleted_at timestamps, so no CASCADE needed)