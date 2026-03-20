/*
  # Setup Creatives Storage Bucket

  1. Storage Setup
    - Create 'creatives' storage bucket
    - Set public access for easy sharing
    - Configure file size limits (100MB max)
    
  2. Storage Policies
    - All authenticated users can read/download
    - Only admins and moderators can upload
    - Only admins can delete
*/

-- Create storage bucket for creatives
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creatives',
  'creatives',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime', 'application/pdf'];

-- Storage RLS Policies

-- All authenticated users can view/download creatives
CREATE POLICY "Authenticated users can view creatives"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'creatives');

-- Public access for sharing (since bucket is public)
CREATE POLICY "Public can view creatives"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'creatives');

-- Only admins and moderators can upload
CREATE POLICY "Admins and moderators can upload creatives"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'creatives' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

-- Only admins can delete creatives
CREATE POLICY "Admins can delete creatives"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'creatives' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins and moderators can update creatives metadata
CREATE POLICY "Admins and moderators can update creatives"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'creatives' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    bucket_id = 'creatives' AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );