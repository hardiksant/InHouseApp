/*
  # Temporarily Allow User Profile Creation

  1. Changes
    - Grant INSERT permission to anon role temporarily to allow signup
    - The trigger function with SECURITY DEFINER should handle this, but we need to ensure it works
  
  2. Security
    - This is a temporary fix to allow user creation
    - The trigger ensures proper data insertion
*/

-- Grant the ability for the trigger to insert regardless of current user
GRANT INSERT ON user_profiles TO anon, authenticated;
