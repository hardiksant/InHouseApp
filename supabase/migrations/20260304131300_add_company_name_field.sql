/*
  # Add Company Name Field

  1. Changes
    - Add `company_name` column to expenses table
    - Field is optional (nullable) text type
    
  2. Notes
    - Non-destructive migration
    - Supports storing buyer company name from invoices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE expenses ADD COLUMN company_name text;
  END IF;
END $$;
