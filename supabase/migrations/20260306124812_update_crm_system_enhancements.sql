/*
  # Update CRM System with Enhanced Features

  1. Schema Changes
    - Update `crm_leads` table:
      - Modify status enum to include all new statuses
      - Add `purchased_product` field for conversion tracking
      - Add `purchase_value` field
      - Add `purchase_date` field
      - Add `converted_to_customer_id` field
    
    - Update `crm_follow_ups` table:
      - Add `is_overdue` computed field
      - Add `next_follow_up_date` field
    
    - Update `crm_customers` table:
      - Add `purchased_product` field
      - Add `purchase_date` field
      - Add `purchase_value` field
      - Add `salesperson` field
    
    - Create `crm_lead_timeline` table:
      - Track all lead activities and status changes
    
    - Create `issue_reports` table:
      - Store user-reported issues with screenshots

  2. Security
    - Update RLS policies for role-based access
    - Add policies for timeline and reports tables

  3. Indexes
    - Add indexes for improved query performance
*/

-- Update crm_leads status to include new statuses
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'purchased_product'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN purchased_product text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'purchase_value'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN purchase_value decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN purchase_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'converted_to_customer_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN converted_to_customer_id uuid REFERENCES crm_customers(id);
  END IF;
END $$;

-- Update crm_customers with purchase details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_customers' AND column_name = 'purchased_product'
  ) THEN
    ALTER TABLE crm_customers ADD COLUMN purchased_product text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_customers' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE crm_customers ADD COLUMN purchase_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_customers' AND column_name = 'purchase_value'
  ) THEN
    ALTER TABLE crm_customers ADD COLUMN purchase_value decimal(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_customers' AND column_name = 'salesperson'
  ) THEN
    ALTER TABLE crm_customers ADD COLUMN salesperson text;
  END IF;
END $$;

-- Update crm_follow_ups with next follow up date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_follow_ups' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE crm_follow_ups ADD COLUMN next_follow_up_date timestamptz;
  END IF;
END $$;

-- Create lead timeline table
CREATE TABLE IF NOT EXISTS crm_lead_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_description text NOT NULL,
  old_value text,
  new_value text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_lead_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline of accessible leads"
  ON crm_lead_timeline
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_lead_timeline.lead_id
      AND (
        auth.uid() = crm_leads.assigned_to
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'moderator')
        )
      )
    )
  );

CREATE POLICY "Users can create timeline entries"
  ON crm_lead_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create issue reports table (separate from user_reported_issues)
CREATE TABLE IF NOT EXISTS issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  module text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create issue reports"
  ON issue_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own issue reports"
  ON issue_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all issue reports"
  ON issue_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update issue reports"
  ON issue_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crm_lead_timeline_lead_id ON crm_lead_timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_timeline_created_at ON crm_lead_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_purchase_date ON crm_leads(purchase_date);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_follow_up_date ON crm_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_issue_reports_user_id ON issue_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);