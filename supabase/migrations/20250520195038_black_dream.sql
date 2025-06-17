/*
  # Initial Schema Setup for CNC Shop Management

  1. Tables
    - `shifts`: Store shift information
    - `workers`: Store worker information
    - `parts`: Store part information
    - `tasks`: Store task information
    - `task_notes`: Store task notes
    - `time_logs`: Store time tracking logs
    - `shift_reports`: Store shift reports
    - `start_checklists`: Store start of shift checklists
    - `end_cleanups`: Store end of shift cleanups
    - `calibrations`: Store calibration records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('S1', 'S2', 'S3')),
  start_time text NOT NULL,
  end_time text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rest of the migration file remains the same...