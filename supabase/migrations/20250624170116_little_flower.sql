/*
  # Add INSERT and UPDATE policies for shifts table

  1. Policies
    - Allow authenticated users to insert shifts
    - Allow authenticated users to update shifts
    
  2. Security
    - Maintains facility-level isolation
    - Uses auth.jwt() function for facility_id extraction
*/

-- Policy for INSERT access for authenticated users
CREATE POLICY "Allow authenticated users to insert shifts"
  ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (facility_id IS NULL) OR 
    (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid)
  );

-- Policy for UPDATE access for authenticated users  
CREATE POLICY "Allow authenticated users to update shifts"
  ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    (facility_id IS NULL) OR 
    (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid)
  )
  WITH CHECK (
    (facility_id IS NULL) OR 
    (facility_id = ((auth.jwt() ->> 'facility_id'::text))::uuid)
  );