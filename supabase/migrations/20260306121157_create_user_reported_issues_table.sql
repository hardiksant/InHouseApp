/*
  # Create User Reported Issues Table

  1. New Tables
    - `user_reported_issues`
      - `id` (uuid, primary key)
      - `reported_by` (uuid, foreign key to auth.users) - User who reported the issue
      - `reporter_email` (text) - Email of the reporter for easy identification
      - `module_name` (text) - Name of the module where issue occurred
      - `issue_type` (text) - bug, suggestion, feature_request, other
      - `title` (text, required) - Brief title of the issue
      - `description` (text, required) - Detailed description
      - `priority` (text) - low, medium, high, critical
      - `status` (text) - open, in_progress, resolved, closed
      - `admin_notes` (text) - Notes added by admin
      - `resolved_at` (timestamptz) - When issue was resolved
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_reported_issues` table
    - All authenticated users can create issues
    - All authenticated users can view their own issues
    - Only admins can view all issues
    - Only admins can update issue status and add notes

  3. Indexes
    - Index on `reported_by` for faster user-specific queries
    - Index on `status` for filtering
    - Index on `created_at` for sorting
*/

CREATE TABLE IF NOT EXISTS user_reported_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid REFERENCES auth.users(id) NOT NULL,
  reporter_email text NOT NULL,
  module_name text NOT NULL,
  issue_type text NOT NULL DEFAULT 'bug',
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  admin_notes text DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_reported_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create issues"
  ON user_reported_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view own issues"
  ON user_reported_issues
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all issues"
  ON user_reported_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update issues"
  ON user_reported_issues
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete issues"
  ON user_reported_issues
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_reported_issues_reported_by ON user_reported_issues(reported_by);
CREATE INDEX IF NOT EXISTS idx_user_reported_issues_status ON user_reported_issues(status);
CREATE INDEX IF NOT EXISTS idx_user_reported_issues_created_at ON user_reported_issues(created_at DESC);