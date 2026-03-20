/*
  # Create Marketing Creatives Library

  1. New Tables
    - `creatives`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `file_path` (text, unique, required) - storage path
      - `file_type` (text) - jpg, png, mp4, pdf, mov
      - `file_size` (bigint) - in bytes
      - `thumbnail_path` (text) - for video thumbnails
      - `folder_category` (text, required)
      - `subfolder` (text) - for nested categories like Rudraksha Media > 1 Mukhi
      - `tags` (text array)
      - `suggested_caption` (text)
      - `uploaded_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create 'creatives' storage bucket for file uploads
    
  3. Security
    - Enable RLS on `creatives` table
    - Admins and moderators can upload, edit, and delete
    - All authenticated users can view and download
    - Public access for storage bucket for easy sharing

  4. Indexes
    - Index on folder_category for fast filtering
    - Index on tags for search
    - Index on uploaded_by for user tracking
*/

-- Create creatives table
CREATE TABLE IF NOT EXISTS creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  file_path text UNIQUE NOT NULL,
  file_type text NOT NULL,
  file_size bigint DEFAULT 0,
  thumbnail_path text,
  folder_category text NOT NULL,
  subfolder text,
  tags text[] DEFAULT '{}',
  suggested_caption text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creatives_folder_category ON creatives(folder_category);
CREATE INDEX IF NOT EXISTS idx_creatives_tags ON creatives USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_creatives_uploaded_by ON creatives(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON creatives(created_at DESC);

-- RLS Policies

-- All authenticated users can view creatives
CREATE POLICY "Authenticated users can view creatives"
  ON creatives
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins and moderators can insert creatives
CREATE POLICY "Admins and moderators can insert creatives"
  ON creatives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Only admins and moderators can update creatives
CREATE POLICY "Admins and moderators can update creatives"
  ON creatives
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Only admins can delete creatives
CREATE POLICY "Admins can delete creatives"
  ON creatives
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_creatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_creatives_updated_at_trigger ON creatives;
CREATE TRIGGER update_creatives_updated_at_trigger
  BEFORE UPDATE ON creatives
  FOR EACH ROW
  EXECUTE FUNCTION update_creatives_updated_at();