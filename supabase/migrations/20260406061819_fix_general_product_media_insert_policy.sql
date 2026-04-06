/*
  # Fix general_product_media INSERT policy

  1. Security Changes
    - Drop the existing INSERT policy that lacks proper WITH CHECK
    - Create new INSERT policy that verifies the user owns the product before allowing media upload

  2. Notes
    - This ensures users can only add media to their own products
    - The WITH CHECK clause validates ownership through a subquery
*/

DROP POLICY IF EXISTS "Users can insert media for own general products" ON general_product_media;

CREATE POLICY "Users can insert media for own general products"
  ON general_product_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM general_products
      WHERE general_products.id = general_product_media.product_id
      AND general_products.created_by = auth.uid()
    )
  );
