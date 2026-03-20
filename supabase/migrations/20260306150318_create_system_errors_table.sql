/*
  # Create System Errors Table

  1. New Tables
    - `system_errors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, nullable for unauthenticated errors)
      - `user_name` (text, nullable)
      - `user_email` (text, nullable)
      - `user_role` (text, nullable)
      - `module` (text) - Which module/page the error occurred
      - `page_url` (text) - Full URL where error occurred
      - `error_message` (text) - Error message
      - `error_stack` (text, nullable) - Stack trace
      - `error_type` (text) - Type of error (JavaScript, API, Unhandled, Form)
      - `severity` (text) - Critical, High, Medium, Low
      - `browser` (text, nullable) - Browser information
      - `device_type` (text, nullable) - Desktop, Mobile, Tablet
      - `status` (text) - New, Investigating, Resolved
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `system_errors` table
    - Add policy for authenticated users to create error logs
    - Add policy for admins to read all errors
    - Add policy for admins to update error status

  3. Important Notes
    - All users can log errors (including unauthenticated for critical errors)
    - Only admins can view and manage errors
    - Errors are automatically captured and logged
*/

CREATE TABLE IF NOT EXISTS system_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_role text,
  module text NOT NULL,
  page_url text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  error_type text NOT NULL CHECK (error_type IN ('JavaScript', 'API', 'Unhandled', 'Form', 'Network')),
  severity text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  browser text,
  device_type text,
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Investigating', 'Resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log errors"
  ON system_errors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all errors"
  ON system_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update error status"
  ON system_errors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE INDEX idx_system_errors_user_id ON system_errors(user_id);
CREATE INDEX idx_system_errors_module ON system_errors(module);
CREATE INDEX idx_system_errors_status ON system_errors(status);
CREATE INDEX idx_system_errors_severity ON system_errors(severity);
CREATE INDEX idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX idx_system_errors_error_type ON system_errors(error_type);
