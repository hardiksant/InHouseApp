/*
  # Create products and product_images tables

  1. New Tables
    - `products`
      - `id` (uuid, primary key) - Unique identifier for each product
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `category` (text) - Product category
      - `created_by` (uuid) - References auth.users
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

    - `product_images`
      - `id` (uuid, primary key) - Unique identifier for each image
      - `product_id` (uuid) - References products table
      - `image_url` (text) - Storage URL of the image
      - `tags` (text) - Comma-separated tags for searching
      - `created_at` (timestamptz) - Timestamp of creation

  2. Security
    - Enable RLS on both tables
    - Admin users can insert, update, and delete products
    - All authenticated users can view products
    - Admin users can manage product images
    - All authenticated users can view product images
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  tags text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

CREATE POLICY "Admin can update products"
  ON products FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

CREATE POLICY "Admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- Product images policies
CREATE POLICY "Admin can insert product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

CREATE POLICY "Admin can delete product images"
  ON product_images FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

CREATE POLICY "All authenticated users can view product images"
  ON product_images FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);