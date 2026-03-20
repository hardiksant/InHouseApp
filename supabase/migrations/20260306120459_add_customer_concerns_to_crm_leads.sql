/*
  # Add Customer Concerns Field to CRM Leads

  1. Changes
    - Add `customer_concerns` column to crm_leads table
    - This field stores any specific concerns or requirements raised by the customer

  2. Notes
    - Using text field to allow free-form input of customer concerns
    - Default to empty string for existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'customer_concerns'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN customer_concerns text DEFAULT '';
  END IF;
END $$;