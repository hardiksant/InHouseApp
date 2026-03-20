/*
  # Setup storage bucket policies

  1. Storage Policies
    - Allow authenticated users to upload their own expense bills
    - Allow users to view their own expense bills
    - Allow admins to view all expense bills
    - Allow admins to upload/delete product images
    - Allow all authenticated users to view product images
    - Allow admins to upload/delete marketing creatives
    - Allow all authenticated users to view marketing creatives
*/

-- Expense bills bucket policies
DROP POLICY IF EXISTS "Authenticated users can upload expense bills" ON storage.objects;
CREATE POLICY "Authenticated users can upload expense bills"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-bills');

DROP POLICY IF EXISTS "Users can view expense bills" ON storage.objects;
CREATE POLICY "Users can view expense bills"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-bills');

-- Product images bucket policies
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

DROP POLICY IF EXISTS "All authenticated users can view product images" ON storage.objects;
CREATE POLICY "All authenticated users can view product images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND (auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

-- Marketing creatives bucket policies
DROP POLICY IF EXISTS "Admins can upload marketing creatives" ON storage.objects;
CREATE POLICY "Admins can upload marketing creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-creatives' AND (auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

DROP POLICY IF EXISTS "All authenticated users can view marketing creatives" ON storage.objects;
CREATE POLICY "All authenticated users can view marketing creatives"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marketing-creatives');

DROP POLICY IF EXISTS "Admins can delete marketing creatives" ON storage.objects;
CREATE POLICY "Admins can delete marketing creatives"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-creatives' AND (auth.jwt()->>'app_metadata')::json->>'role' = 'admin');