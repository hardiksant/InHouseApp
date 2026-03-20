/*
  # Create sales_bills table for invoice management

  1. New Tables
    - `sales_bills`
      - `id` (uuid, primary key) - Unique identifier for each bill
      - `bill_number` (text, unique) - Auto-generated bill number
      - `customer_name` (text) - Customer's full name
      - `customer_phone` (text) - Customer's phone number
      - `customer_address` (text) - Customer's address
      - `product_name` (text) - Name of the product/service
      - `quantity` (numeric) - Quantity of items
      - `price` (numeric) - Price per unit
      - `gst_percent` (numeric) - GST percentage applied
      - `gst_amount` (numeric) - Calculated GST amount
      - `total_amount` (numeric) - Final total amount
      - `created_by` (uuid) - References auth.users
      - `created_at` (timestamptz) - Timestamp of creation

  2. Security
    - Enable RLS on `sales_bills` table
    - Add policy for authenticated users to insert their own bills
    - Add policy for authenticated users to view their own bills
    - Add policy for admin users to view all bills
*/

CREATE TABLE IF NOT EXISTS sales_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  gst_percent numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own bills"
  ON sales_bills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own bills"
  ON sales_bills FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admin can view all bills"
  ON sales_bills FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::json->>'role' = 'admin');

-- Create index for faster bill number lookups
CREATE INDEX IF NOT EXISTS idx_sales_bills_bill_number ON sales_bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_bills_created_by ON sales_bills(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_bills_created_at ON sales_bills(created_at DESC);