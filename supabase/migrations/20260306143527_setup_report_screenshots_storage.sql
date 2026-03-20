/*
  # Setup Storage for Report Screenshots

  1. Storage Bucket
    - Create `report-screenshots` bucket for storing issue screenshots

  2. Security Policies
    - Authenticated users can upload screenshots
    - All authenticated users can view screenshots
    - Users can delete their own screenshots
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-screenshots', 'report-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload report screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'report-screenshots');

CREATE POLICY "Anyone can view report screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-screenshots');

CREATE POLICY "Users can delete their own report screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'report-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
