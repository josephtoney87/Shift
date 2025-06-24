/*
  # Fix RLS policies for shifts table

  1. Security Updates
    - Add INSERT policy for authenticated users to create shifts
    - Add UPDATE policy for authenticated users to modify shifts
    - Maintain existing facility-based access control

  The existing SELECT policy already handles facility-based filtering.
  These new policies will allow authenticated users to INSERT and UPDATE
  shifts while respecting the same facility constraints.
*/

-- Policy for INSERT access for authenticated users
CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (facility_id IS NULL) OR 
    (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)
  );

-- Policy for UPDATE access for authenticated users  
CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    (facility_id IS NULL) OR 
    (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)
  )
  WITH CHECK (
    (facility_id IS NULL) OR 
    (facility_id = ((jwt() ->> 'facility_id'::text))::uuid)
  );