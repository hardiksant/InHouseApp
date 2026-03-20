/*
  # Create System Reports Table

  1. New Tables
    - `system_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `user_name` (text)
      - `user_email` (text)
      - `module` (text) - Which module the issue is from
      - `issue_type` (text) - Bug, Improvement, UI Problem, Performance Issue, Feature Request
      - `priority` (text) - Low, Medium, High, Critical
      - `description` (text) - Issue description
      - `screenshot_url` (text, nullable) - URL to uploaded screenshot
      - `status` (text) - New, In Review, Fix Planned, Fixed, Closed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `system_reports` table
    - Add policy for authenticated users to create their own reports
    - Add policy for authenticated users to read all reports
    - Add policy for admins to update report status

  3. Important Notes
    - All users can submit reports
    - All users can view reports (transparency)
    - Only admins can update report status
    - User information is captured at submission time
*/

CREATE TABLE IF NOT EXISTS system_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  module text NOT NULL,
  issue_type text NOT NULL CHECK (issue_type IN ('Bug', 'Improvement', 'UI Problem', 'Performance Issue', 'Feature Request')),
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  description text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Review', 'Fix Planned', 'Fixed', 'Closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
  ON system_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all reports"
  ON system_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update report status"
  ON system_reports FOR UPDATE
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

CREATE INDEX idx_system_reports_user_id ON system_reports(user_id);
CREATE INDEX idx_system_reports_module ON system_reports(module);
CREATE INDEX idx_system_reports_status ON system_reports(status);
CREATE INDEX idx_system_reports_priority ON system_reports(priority);
CREATE INDEX idx_system_reports_created_at ON system_reports(created_at DESC);
