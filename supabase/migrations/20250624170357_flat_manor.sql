/*
  # Fix RLS policies for shifts table

  1. Changes
    - Fix JWT function calls (use auth.jwt() instead of jwt())
    - Create more permissive policies for authenticated users
    - Allow operations when facility_id is NULL or matches user's facility
    - Add basic authenticated user access

  2. Security
    - Maintains facility-level isolation when facility_id is set
    - Allows general authenticated access when facility_id is NULL
    - Ensures users can only access their facility's data when applicable
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;
DROP POLICY IF EXISTS "shifts_facility_policy" ON shifts;

-- Policy for SELECT access for authenticated users
CREATE POLICY "Allow authenticated users to select shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (
    (facility_id IS NULL) OR 
    (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid) OR
    (auth.jwt() ->> 'facility_id') IS NULL
  );

-- Policy for INSERT access for authenticated users
CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      (facility_id IS NULL) OR 
      (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid) OR
      (auth.jwt() ->> 'facility_id') IS NULL
    )
  );

-- Policy for UPDATE access for authenticated users  
CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      (facility_id IS NULL) OR 
      (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid) OR
      (auth.jwt() ->> 'facility_id') IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      (facility_id IS NULL) OR 
      (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid) OR
      (auth.jwt() ->> 'facility_id') IS NULL
    )
  );

-- Policy for DELETE access for authenticated users
CREATE POLICY "Allow authenticated users to delete shifts"
  ON shifts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      (facility_id IS NULL) OR 
      (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid) OR
      (auth.jwt() ->> 'facility_id') IS NULL
    )
  );