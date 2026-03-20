/*
  # Fix User Profile Creation Policy

  1. Changes
    - Add a policy to allow the trigger function to insert new user profiles
    - The trigger runs with SECURITY DEFINER so it needs a way to insert profiles
    - Add a policy that allows inserts for new users (when auth.uid() matches the profile id being created)
  
  2. Security
    - Maintains RLS protection
    - Only allows users to create their own profile during signup
    - Admins can still insert profiles for others
*/

-- Drop the restrictive admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- Create a new policy that allows both:
-- 1. Users creating their own profile during signup (trigger)
-- 2. Admins creating profiles for others
CREATE POLICY "Users can create own profile or admins can create any"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Also add a policy for service role to allow trigger to work
CREATE POLICY "Service role can insert profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
