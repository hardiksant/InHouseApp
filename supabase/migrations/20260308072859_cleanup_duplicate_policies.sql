/*
  # Cleanup Duplicate RLS Policies

  1. Changes
    - Remove duplicate SELECT and UPDATE policies
    - Keep only the non-recursive versions
*/

-- Remove old duplicate policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Keep these policies:
-- "Service role can insert profiles" - for trigger
-- "Users can create own profile" - for signup
-- "Authenticated users can view profiles" - for viewing any profile
-- "Users update own profile only" - for updating own profile
