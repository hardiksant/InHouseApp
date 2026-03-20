/*
  # Create CRM System

  1. New Tables
    - `crm_leads`
      - `id` (uuid, primary key)
      - `customer_name` (text, required)
      - `phone_number` (text, required)
      - `city` (text)
      - `product_interested` (text, required)
      - `budget` (numeric)
      - `lead_source` (text, required)
      - `remark` (text)
      - `assigned_to` (uuid, foreign key to auth.users)
      - `status` (text) - new, contacted, interested, not_interested, converted
      - `is_hot_lead` (boolean) - for daily hot leads
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `crm_follow_ups`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to crm_leads)
      - `follow_up_number` (int) - 1 to 5
      - `follow_up_date` (date, required)
      - `status` (text) - pending, contacted, interested, not_interested, converted
      - `notes` (text)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `crm_customers`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to crm_leads)
      - `customer_name` (text, required)
      - `phone_number` (text, required)
      - `city` (text)
      - `products_purchased` (text array)
      - `total_spent` (numeric, default 0)
      - `first_purchase_date` (date)
      - `last_purchase_date` (date)
      - `consultation_history` (jsonb) - array of consultation records
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all CRM tables
    - Admins can view/edit/delete all records
    - Team members can add leads and view/edit their assigned leads
    - All authenticated users can view customers

  3. Indexes
    - Index on assigned_to for filtering
    - Index on status for filtering
    - Index on follow_up_date for dashboard queries
    - Index on lead_source for analytics
*/

-- Create crm_leads table
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  city text,
  product_interested text NOT NULL,
  budget numeric,
  lead_source text NOT NULL,
  remark text DEFAULT '',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'converted')),
  is_hot_lead boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crm_follow_ups table
CREATE TABLE IF NOT EXISTS crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  follow_up_number int NOT NULL CHECK (follow_up_number BETWEEN 1 AND 5),
  follow_up_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'interested', 'not_interested', 'converted')),
  notes text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crm_customers table
CREATE TABLE IF NOT EXISTS crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  city text,
  products_purchased text[] DEFAULT '{}',
  total_spent numeric DEFAULT 0,
  first_purchase_date date,
  last_purchase_date date,
  consultation_history jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customers ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_is_hot_lead ON crm_leads(is_hot_lead);
CREATE INDEX IF NOT EXISTS idx_crm_leads_lead_source ON crm_leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_lead_id ON crm_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_date ON crm_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_status ON crm_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON crm_customers(phone_number);

-- RLS Policies for crm_leads

-- All authenticated users can view leads (will be filtered by assigned_to in application for non-admins)
CREATE POLICY "Authenticated users can view leads"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert leads
CREATE POLICY "Authenticated users can add leads"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their assigned leads, admins can update all
CREATE POLICY "Users can update their leads or admins can update all"
  ON crm_leads
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete leads
CREATE POLICY "Admins can delete leads"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for crm_follow_ups

-- Users can view follow-ups for their assigned leads or admins can view all
CREATE POLICY "Users can view their follow-ups"
  ON crm_follow_ups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_follow_ups.lead_id
      AND (crm_leads.assigned_to = auth.uid() OR
           EXISTS (
             SELECT 1 FROM auth.users
             WHERE auth.users.id = auth.uid()
             AND auth.users.raw_user_meta_data->>'role' = 'admin'
           ))
    )
  );

-- Follow-ups are auto-created, so INSERT is system-level
CREATE POLICY "System can insert follow-ups"
  ON crm_follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update follow-ups for their assigned leads
CREATE POLICY "Users can update their follow-ups"
  ON crm_follow_ups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_follow_ups.lead_id
      AND (crm_leads.assigned_to = auth.uid() OR
           EXISTS (
             SELECT 1 FROM auth.users
             WHERE auth.users.id = auth.uid()
             AND auth.users.raw_user_meta_data->>'role' = 'admin'
           ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_follow_ups.lead_id
      AND (crm_leads.assigned_to = auth.uid() OR
           EXISTS (
             SELECT 1 FROM auth.users
             WHERE auth.users.id = auth.uid()
             AND auth.users.raw_user_meta_data->>'role' = 'admin'
           ))
    )
  );

-- Only admins can delete follow-ups
CREATE POLICY "Admins can delete follow-ups"
  ON crm_follow_ups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policies for crm_customers

-- All authenticated users can view customers
CREATE POLICY "Authenticated users can view customers"
  ON crm_customers
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert customers
CREATE POLICY "Authenticated users can add customers"
  ON crm_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update customers
CREATE POLICY "Authenticated users can update customers"
  ON crm_customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers"
  ON crm_customers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_crm_leads_updated_at_trigger ON crm_leads;
CREATE TRIGGER update_crm_leads_updated_at_trigger
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_follow_ups_updated_at_trigger ON crm_follow_ups;
CREATE TRIGGER update_crm_follow_ups_updated_at_trigger
  BEFORE UPDATE ON crm_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();

DROP TRIGGER IF EXISTS update_crm_customers_updated_at_trigger ON crm_customers;
CREATE TRIGGER update_crm_customers_updated_at_trigger
  BEFORE UPDATE ON crm_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_updated_at();