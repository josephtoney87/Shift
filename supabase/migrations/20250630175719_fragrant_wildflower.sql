/*
  # Add Specific Shift Workers

  1. New Users
    - Daniel Lerner (2nd shift)
    - Kyle Riddle (2nd shift) 
    - Collin Taylor (3rd shift)
    - Matt Barrett (3rd shift)

  2. Changes
    - Insert the specific users for each shift
    - Assign them to their respective shifts
    - Give them appropriate colors and roles
*/

-- Insert the specific shift workers
INSERT INTO users (id, name, email, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Daniel Lerner', 'daniel.lerner@company.com', '#EF4444'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Kyle Riddle', 'kyle.riddle@company.com', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Collin Taylor', 'collin.taylor@company.com', '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Matt Barrett', 'matt.barrett@company.com', '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- Insert workers for 2nd shift (B shift)
INSERT INTO workers (id, name, role, shift_id, is_manual, facility_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440020', 'Daniel Lerner', 'Operator', '550e8400-e29b-41d4-a716-446655440002', false, null),
  ('550e8400-e29b-41d4-a716-446655440021', 'Kyle Riddle', 'Operator', '550e8400-e29b-41d4-a716-446655440002', false, null)
ON CONFLICT (id) DO NOTHING;

-- Insert workers for 3rd shift (C shift)
INSERT INTO workers (id, name, role, shift_id, is_manual, facility_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440022', 'Collin Taylor', 'Operator', '550e8400-e29b-41d4-a716-446655440003', false, null),
  ('550e8400-e29b-41d4-a716-446655440023', 'Matt Barrett', 'Operator', '550e8400-e29b-41d4-a716-446655440003', false, null)
ON CONFLICT (id) DO NOTHING;