/*
  # Create Order Book System

  1. New Tables
    - `order_book`
      - `id` (uuid, primary key)
      - `order_number` (text, unique, auto-generated RW-001, RW-002, etc.)
      - `customer_name` (text, required)
      - `mobile_number` (text, required)
      - `full_address` (text, required)
      - `city` (text, required)
      - `state` (text, required)
      - `pin_code` (text, required)
      - `product` (text, required)
      - `quantity` (integer, required)
      - `price` (decimal, required)
      - `gift` (text)
      - `order_type` (text: prepaid, cod)
      - `courier_charge` (decimal, default 0)
      - `product_amount` (decimal, required)
      - `advance_payment` (decimal, default 0)
      - `final_due` (decimal, required)
      - `remark` (text)
      - `payment_screenshot_url` (text)
      - `status` (text: payment_received, pending_approval, approved, preparing_product, ready_for_dispatch, dispatched, delivered)
      - `created_by` (uuid, references auth.users)
      - `created_by_name` (text)
      - `approved_by` (uuid, references auth.users)
      - `approved_by_name` (text)
      - `approved_at` (timestamptz)
      - `courier_partner` (text)
      - `tracking_id` (text)
      - `dispatch_date` (date)
      - `product_preparation_photo_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `order_status_history`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references order_book)
      - `status` (text)
      - `changed_by` (uuid, references auth.users)
      - `changed_by_name` (text)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Sales users can only see their own orders
    - Moderators and admins can see all orders
    - Only moderators and admins can update order status

  3. Functions
    - Create function to generate order numbers
    - Create trigger to auto-generate order numbers
    - Create function to log status changes

  4. Indexes
    - Add indexes for performance on order_number, status, created_by
*/

-- Create order book table
CREATE TABLE IF NOT EXISTS order_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  mobile_number text NOT NULL,
  full_address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pin_code text NOT NULL,
  product text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  gift text,
  order_type text NOT NULL CHECK (order_type IN ('prepaid', 'cod')),
  courier_charge decimal(10,2) DEFAULT 0 CHECK (courier_charge >= 0),
  product_amount decimal(10,2) NOT NULL CHECK (product_amount >= 0),
  advance_payment decimal(10,2) DEFAULT 0 CHECK (advance_payment >= 0),
  final_due decimal(10,2) NOT NULL CHECK (final_due >= 0),
  remark text,
  payment_screenshot_url text,
  status text NOT NULL DEFAULT 'payment_received' CHECK (status IN (
    'payment_received',
    'pending_approval',
    'approved',
    'preparing_product',
    'ready_for_dispatch',
    'dispatched',
    'delivered'
  )),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_by_name text NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  approved_by_name text,
  approved_at timestamptz,
  courier_partner text,
  tracking_id text,
  dispatch_date date,
  product_preparation_photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_book ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales users can view their own orders"
  ON order_book
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Sales users can create orders"
  ON order_book
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Moderators and admins can update orders"
  ON order_book
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only admins can delete orders"
  ON order_book
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES order_book(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  changed_by_name text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history of orders they can see"
  ON order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_book
      WHERE order_book.id = order_status_history.order_id
      AND (
        order_book.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('admin', 'moderator')
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create status history"
  ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  new_order_number text;
BEGIN
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_number FROM 4) AS integer
      )
    ), 0
  ) + 1
  INTO next_number
  FROM order_book
  WHERE order_number ~ '^RW-[0-9]+$';
  
  new_order_number := 'RW-' || LPAD(next_number::text, 3, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_order_number_trigger'
  ) THEN
    CREATE TRIGGER set_order_number_trigger
      BEFORE INSERT ON order_book
      FOR EACH ROW
      EXECUTE FUNCTION set_order_number();
  END IF;
END $$;

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      status,
      changed_by,
      changed_by_name,
      notes
    )
    VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      (SELECT full_name FROM user_profiles WHERE id = auth.uid()),
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'log_order_status_change_trigger'
  ) THEN
    CREATE TRIGGER log_order_status_change_trigger
      BEFORE UPDATE ON order_book
      FOR EACH ROW
      EXECUTE FUNCTION log_order_status_change();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_book_order_number ON order_book(order_number);
CREATE INDEX IF NOT EXISTS idx_order_book_status ON order_book(status);
CREATE INDEX IF NOT EXISTS idx_order_book_created_by ON order_book(created_by);
CREATE INDEX IF NOT EXISTS idx_order_book_created_at ON order_book(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- Create storage bucket for order documents
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('order-documents', 'order-documents', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for order documents
DROP POLICY IF EXISTS "Users can upload order documents" ON storage.objects;
CREATE POLICY "Users can upload order documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Users can update their order documents" ON storage.objects;
CREATE POLICY "Users can update their order documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'order-documents')
  WITH CHECK (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Anyone can view order documents" ON storage.objects;
CREATE POLICY "Anyone can view order documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Admins can delete order documents" ON storage.objects;
CREATE POLICY "Admins can delete order documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'order-documents' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );