/*
  # Create Astro Recommendations Table

  1. New Tables
    - `astro_recommendations`
      - `id` (uuid, primary key)
      - `customer_name` (text) - Customer's full name
      - `gender` (text) - Customer's gender
      - `dob` (date, nullable) - Date of birth
      - `rashi` (text) - Customer's rashi/zodiac sign
      - `problem` (text) - Problem or goal category
      - `budget_preference` (text) - Low/Medium/High
      - `notes` (text, nullable) - Additional notes
      - `tier1_beads` (jsonb) - Array of Tier 1 recommendations
      - `tier2_kavach` (text) - Kavach combination
      - `tier3_beads` (jsonb) - Array of Tier 3 premium recommendations
      - `pdf_file_url` (text, nullable) - URL to generated PDF
      - `created_by` (uuid) - User who created the recommendation
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on `astro_recommendations` table
    - Add policy for users to view their own recommendations
    - Add policy for admins to view all recommendations
    - Add policy for users to create recommendations
*/

CREATE TABLE IF NOT EXISTS astro_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  gender text NOT NULL,
  dob date,
  rashi text NOT NULL,
  problem text NOT NULL,
  budget_preference text NOT NULL DEFAULT 'Medium',
  notes text,
  tier1_beads jsonb NOT NULL DEFAULT '[]'::jsonb,
  tier2_kavach text,
  tier3_beads jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_file_url text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE astro_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON astro_recommendations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Users can create recommendations"
  ON astro_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own recommendations"
  ON astro_recommendations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can delete recommendations"
  ON astro_recommendations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
