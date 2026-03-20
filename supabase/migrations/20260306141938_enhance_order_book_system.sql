/*
  # Enhance Order Book System

  1. New Tables
    - `order_products` - Store multiple products per order
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to order_book)
      - `product_name` (text)
      - `quantity` (integer)
      - `price_per_unit` (decimal)
      - `subtotal` (decimal)
      - `created_at` (timestamp)
    
    - `courier_partners` - Manage courier partner list
      - `id` (uuid, primary key)
      - `name` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)

  2. Changes to `order_book` table
    - Add `packing_note` (text) - notes during packing
    - Add `is_repeat_buyer` (boolean) - repeat customer flag
    - Add `slip_printed_at` (timestamp) - when slip was printed
    - Modify existing fields for new workflow

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
    - Restrict courier partner management to admin/moderator
*/

-- Create order_products table
CREATE TABLE IF NOT EXISTS order_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES order_book(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price_per_unit decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create courier_partners table
CREATE TABLE IF NOT EXISTS courier_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add new columns to order_book table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_book' AND column_name = 'packing_note'
  ) THEN
    ALTER TABLE order_book ADD COLUMN packing_note text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_book' AND column_name = 'is_repeat_buyer'
  ) THEN
    ALTER TABLE order_book ADD COLUMN is_repeat_buyer boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_book' AND column_name = 'slip_printed_at'
  ) THEN
    ALTER TABLE order_book ADD COLUMN slip_printed_at timestamptz;
  END IF;
END $$;

-- Insert default courier partners
INSERT INTO courier_partners (name, is_active) VALUES
  ('India Post', true),
  ('India Post COD', true),
  ('DTDC', true),
  ('Maruti Courier', true),
  ('Anjani Courier', true),
  ('Professional Courier', true),
  ('Blue Dart', true)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE order_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_products
CREATE POLICY "Users can view order products"
  ON order_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create order products"
  ON order_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update order products"
  ON order_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete order products"
  ON order_products FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for courier_partners
CREATE POLICY "Everyone can view active courier partners"
  ON courier_partners FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin and moderators can manage courier partners"
  ON courier_partners FOR ALL
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_products_order_id ON order_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_book_status ON order_book(status);
CREATE INDEX IF NOT EXISTS idx_order_book_dispatch_date ON order_book(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_order_book_mobile_number ON order_book(mobile_number);
CREATE INDEX IF NOT EXISTS idx_order_book_customer_name ON order_book(customer_name);
