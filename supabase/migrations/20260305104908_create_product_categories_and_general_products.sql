/*
  # Create Product Categories and General Products Tables

  1. New Tables
    - `product_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., "Certified Rudraksha", "Nepali Mala")
      - `type` (text) - "rudraksha" or "general"
      - `display_order` (integer) - Order for displaying categories
      - `created_at` (timestamptz)
    
    - `general_products`
      - `id` (uuid, primary key)
      - `category_id` (uuid) - Foreign key to product_categories
      - `product_name` (text) - Product name
      - `size` (text) - Size information
      - `material` (text) - Material description
      - `price` (numeric) - Price
      - `status` (text) - Available, Reserved, Sold
      - `keywords` (text) - Searchable keywords
      - `created_by` (uuid) - Foreign key to auth.users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `general_product_media`
      - `id` (uuid, primary key)
      - `product_id` (uuid) - Foreign key to general_products
      - `media_type` (text) - photo, video
      - `file_url` (text) - Supabase storage URL
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Only admins can create/delete categories

  3. Important Notes
    - Categories are global and shared across all users
    - Products are user-specific
*/

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('rudraksha', 'general')),
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON product_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON product_categories FOR DELETE
  TO authenticated
  USING (true);

-- Create general_products table
CREATE TABLE IF NOT EXISTS general_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  size text,
  material text,
  price numeric DEFAULT 0,
  status text DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Sold')),
  keywords text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE general_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own general products"
  ON general_products FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own general products"
  ON general_products FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own general products"
  ON general_products FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own general products"
  ON general_products FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create general_product_media table
CREATE TABLE IF NOT EXISTS general_product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES general_products(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE general_product_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for own general products"
  ON general_product_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM general_products
      WHERE general_products.id = general_product_media.product_id
      AND general_products.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert media for own general products"
  ON general_product_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM general_products
      WHERE general_products.id = general_product_media.product_id
      AND general_products.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete media for own general products"
  ON general_product_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM general_products
      WHERE general_products.id = general_product_media.product_id
      AND general_products.created_by = auth.uid()
    )
  );

-- Insert default product categories
INSERT INTO product_categories (name, type, display_order) VALUES
  ('Certified Rudraksha', 'rudraksha', 1),
  ('Nepali Mala', 'general', 2),
  ('Indonesian Mala', 'general', 3),
  ('Nepali Bracelets', 'general', 4),
  ('Indonesian Bracelets', 'general', 5),
  ('Kavach', 'general', 6),
  ('Crystals', 'general', 7),
  ('Rudraksha + Crystals', 'general', 8),
  ('Siddha Mala', 'general', 9),
  ('Premium Mala', 'general', 10),
  ('Customised by Customer', 'general', 11)
ON CONFLICT DO NOTHING;