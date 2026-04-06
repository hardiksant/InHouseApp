/*
  # Add GST and Invoice Fields to Expenses Table

  1. New Columns Added
    - `vendor_name` (text) - Name of the vendor/supplier
    - `invoice_number` (text) - Invoice number from the document
    - `invoice_date` (date) - Date from the invoice
    - `description` (text) - Detailed description from invoice
    - `taxable_amount` (numeric) - Base amount before tax
    - `cgst` (numeric) - Central GST amount
    - `sgst` (numeric) - State GST amount
    - `igst` (numeric) - Integrated GST amount
    - `gst_total` (numeric) - Total GST (cgst + sgst + igst)
    - `total_amount` (numeric) - Final amount including tax
    - `vendor_gstin` (text) - Vendor's GST identification number
    - `company_gstin` (text) - Company's GST identification number
    - `invoice_file` (text) - URL to uploaded invoice file

  2. Changes
    - All GST and tax fields default to 0
    - Invoice fields are optional (nullable)
    - Existing data remains intact

  3. Notes
    - This migration is safe and non-destructive
    - Supports Indian GST invoice processing
    - Compatible with existing expense records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'vendor_name'
  ) THEN
    ALTER TABLE expenses ADD COLUMN vendor_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE expenses ADD COLUMN invoice_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE expenses ADD COLUMN invoice_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'description'
  ) THEN
    ALTER TABLE expenses ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'taxable_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN taxable_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'cgst'
  ) THEN
    ALTER TABLE expenses ADD COLUMN cgst numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'sgst'
  ) THEN
    ALTER TABLE expenses ADD COLUMN sgst numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'igst'
  ) THEN
    ALTER TABLE expenses ADD COLUMN igst numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'gst_total'
  ) THEN
    ALTER TABLE expenses ADD COLUMN gst_total numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN total_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'vendor_gstin'
  ) THEN
    ALTER TABLE expenses ADD COLUMN vendor_gstin text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'company_gstin'
  ) THEN
    ALTER TABLE expenses ADD COLUMN company_gstin text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'invoice_file'
  ) THEN
    ALTER TABLE expenses ADD COLUMN invoice_file text;
  END IF;
END $$;