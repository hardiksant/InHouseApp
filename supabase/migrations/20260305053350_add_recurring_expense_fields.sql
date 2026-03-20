/*
  # Add Recurring Expense Detection Fields

  1. New Columns
    - `is_recurring` (boolean) - Whether this expense is recurring
    - `recurring_vendor` (text) - Vendor name for recurring expenses
    - `recurring_frequency` (text) - Frequency: monthly, yearly, unknown
    
  2. Changes
    - All fields default to null for non-recurring expenses
    - Supports automatic detection of recurring expenses
    
  3. Notes
    - Non-destructive migration
    - Enables tracking of subscription and recurring payments
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE expenses ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'recurring_vendor'
  ) THEN
    ALTER TABLE expenses ADD COLUMN recurring_vendor text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'recurring_frequency'
  ) THEN
    ALTER TABLE expenses ADD COLUMN recurring_frequency text;
  END IF;
END $$;
