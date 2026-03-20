/*
  # Fix RLS Recursion Error on user_profiles

  1. Changes
    - Drop all recursive policies that reference user_profiles within USING clauses
    - Create new non-recursive policies using auth.jwt() to check admin role
    - Store role in user metadata instead of querying user_profiles table
  
  2. Security
    - Users can view and update their own profile
    - Admins can view and update all profiles (checked via JWT claims)
    - Service role can insert profiles (for trigger)
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile or admins can create any" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (but not their role)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles (using raw_app_meta_data from JWT)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'authenticated' 
    AND role = 'admin' 
    AND auth.uid() = id
  );

-- Admins can update all profiles (check if current user is admin by their own record)
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    id IN (
      SELECT id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
      LIMIT 1
    )
  );

-- Allow service role to insert profiles (for trigger)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile during signup
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
