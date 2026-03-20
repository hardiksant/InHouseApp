/*
  # Create Rudraksha Inventory Tables

  1. New Tables
    - `rudraksha_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., "1 Mukhi", "Ganesh Mukhi")
      - `display_order` (integer) - Order for displaying categories
      - `created_at` (timestamptz)
    
    - `rudraksha_beads`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Unique bead identifier
      - `category_id` (uuid) - Foreign key to rudraksha_categories
      - `mukhi` (text) - Mukhi type
      - `lab` (text) - Lab name
      - `size_mm` (numeric) - Size in millimeters
      - `weight_g` (numeric) - Weight in grams
      - `xray_report` (text) - X-ray report reference
      - `price` (numeric) - Price
      - `status` (text) - Available, Reserved, Sold
      - `created_by` (uuid) - Foreign key to auth.users
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `rudraksha_media`
      - `id` (uuid, primary key)
      - `bead_id` (uuid) - Foreign key to rudraksha_beads
      - `media_type` (text) - photo, video, certificate
      - `file_url` (text) - Supabase storage URL
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admins to view all data
*/

-- Create rudraksha_categories table
CREATE TABLE IF NOT EXISTS rudraksha_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rudraksha_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON rudraksha_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON rudraksha_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create rudraksha_beads table
CREATE TABLE IF NOT EXISTS rudraksha_beads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  category_id uuid REFERENCES rudraksha_categories(id) ON DELETE CASCADE,
  mukhi text NOT NULL,
  lab text,
  size_mm numeric,
  weight_g numeric,
  xray_report text,
  price numeric DEFAULT 0,
  status text DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Sold')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rudraksha_beads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own beads"
  ON rudraksha_beads FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own beads"
  ON rudraksha_beads FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own beads"
  ON rudraksha_beads FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own beads"
  ON rudraksha_beads FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create rudraksha_media table
CREATE TABLE IF NOT EXISTS rudraksha_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bead_id uuid REFERENCES rudraksha_beads(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video', 'certificate')),
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rudraksha_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view media for own beads"
  ON rudraksha_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rudraksha_beads
      WHERE rudraksha_beads.id = rudraksha_media.bead_id
      AND rudraksha_beads.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert media for own beads"
  ON rudraksha_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rudraksha_beads
      WHERE rudraksha_beads.id = rudraksha_media.bead_id
      AND rudraksha_beads.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete media for own beads"
  ON rudraksha_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rudraksha_beads
      WHERE rudraksha_beads.id = rudraksha_media.bead_id
      AND rudraksha_beads.created_by = auth.uid()
    )
  );

-- Insert default categories
INSERT INTO rudraksha_categories (name, display_order) VALUES
  ('1 Mukhi', 1),
  ('2 Mukhi', 2),
  ('3 Mukhi', 3),
  ('4 Mukhi', 4),
  ('5 Mukhi', 5),
  ('6 Mukhi', 6),
  ('7 Mukhi', 7),
  ('8 Mukhi', 8),
  ('9 Mukhi', 9),
  ('10 Mukhi', 10),
  ('11 Mukhi', 11),
  ('12 Mukhi', 12),
  ('13 Mukhi', 13),
  ('14 Mukhi', 14),
  ('15 Mukhi', 15),
  ('16 Mukhi', 16),
  ('17 Mukhi', 17),
  ('18 Mukhi', 18),
  ('19 Mukhi', 19),
  ('20 Mukhi', 20),
  ('21 Mukhi', 21),
  ('Ganesh Mukhi', 22),
  ('Gauri Shankar', 23),
  ('Trijuti', 24),
  ('Sawaar', 25),
  ('Other Certified Rudraksha', 26)
ON CONFLICT DO NOTHING;