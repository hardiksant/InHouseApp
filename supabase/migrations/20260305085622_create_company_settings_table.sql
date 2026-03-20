/*
  # Create company_settings table

  1. New Tables
    - `company_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - Links to auth.users
      - `company_name` (text) - Company name
      - `company_address` (text) - Company address
      - `company_gstin` (text) - GST identification number
      - `company_phone` (text) - Company phone number
      - `company_email` (text) - Company email address
      - `company_logo` (text) - URL/path to company logo
      - `currency` (text) - Default currency code (e.g., INR)
      - `currency_symbol` (text) - Currency symbol (e.g., ₹)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `company_settings` table
    - Add policy for authenticated users to read their own settings
    - Add policy for authenticated users to insert their own settings
    - Add policy for authenticated users to update their own settings
    - Add policy for authenticated users to delete their own settings

  3. Notes
    - Each user can have one company settings record
    - Settings are user-specific for multi-tenant support
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name text NOT NULL DEFAULT 'Nepali Rudraksh Wala Beads and Mala LLP',
  company_address text DEFAULT '',
  company_gstin text DEFAULT '08AAXFN0754D1Z1',
  company_phone text DEFAULT '',
  company_email text DEFAULT '',
  company_logo text DEFAULT '',
  currency text NOT NULL DEFAULT 'INR',
  currency_symbol text NOT NULL DEFAULT '₹',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company settings"
  ON company_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);