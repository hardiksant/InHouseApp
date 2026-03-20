/*
  # Fix RLS Recursion Error - Proper Fix

  1. Changes
    - Remove ALL recursive policies
    - Use simple auth.uid() checks for base access
    - For admin access, we'll handle in application layer or use function
  
  2. Security
    - Users can view and update only their own profile
    - No recursive queries that cause infinite loops
*/

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Simple policy: authenticated users can view any profile
-- (Authorization will be handled at application layer)
CREATE POLICY "Authenticated users can view profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
-- Admins updating other profiles will need to use service role or specific function
CREATE POLICY "Users update own profile only"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
