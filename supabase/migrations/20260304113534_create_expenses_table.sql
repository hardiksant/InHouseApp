/*
  # Create Expenses Table and RLS Policies

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key) - Unique identifier for each expense
      - `date` (date) - Date of the expense
      - `title` (text) - Title/description of the expense
      - `category` (text) - Expense category (Office Supplies, Courier/Shipping, etc.)
      - `amount` (numeric) - Amount spent
      - `payment_method` (text) - How the expense was paid
      - `notes` (text, nullable) - Additional notes about the expense
      - `bill_image` (text, nullable) - URL to the bill/invoice image in storage
      - `added_by` (uuid) - Foreign key to auth.users, tracks who added the expense
      - `created_at` (timestamptz) - When the expense was created

  2. Security
    - Enable RLS on `expenses` table
    - Policy for employees to insert their own expenses
    - Policy for employees to view only their own expenses
    - Policy for admins to view all expenses
    - Policy for admins to update any expense
    - Policy for admins to delete any expense

  3. Important Notes
    - Admin role is determined by checking auth.jwt() -> 'app_metadata' -> 'role'
    - Employees can only see and manage their own expenses
    - Admins have full access to all expenses
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL,
  notes text,
  bill_image text,
  added_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Employees can insert their own expenses
CREATE POLICY "Users can insert own expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

-- Employees can view their own expenses, admins can view all
CREATE POLICY "Users can view own expenses, admins view all"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = added_by 
    OR 
    (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
  );

-- Only admins can update expenses
CREATE POLICY "Admins can update all expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin')
  WITH CHECK ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin');

-- Only admins can delete expenses
CREATE POLICY "Admins can delete all expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_added_by ON expenses(added_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);