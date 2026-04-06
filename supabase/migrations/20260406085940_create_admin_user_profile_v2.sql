/*
  # Create Admin User Profile

  1. Changes
    - Creates a user_profiles record for nepalrudraksh7@gmail.com
    - Sets role to 'admin'
    - Sets full_name to 'Hardik Sant'
    - Sets email to nepalrudraksh7@gmail.com
    - Links to the existing auth.users record
  
  2. Security
    - Uses existing RLS policies on user_profiles table
*/

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'nepalrudraksh7@gmail.com';
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- Only proceed if user exists
  IF v_user_id IS NOT NULL THEN
    -- Insert or update the user profile
    INSERT INTO user_profiles (id, full_name, email, role, is_active, created_at, updated_at)
    VALUES (
      v_user_id,
      'Hardik Sant',
      v_email,
      'admin',
      true,
      now(),
      now()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      full_name = 'Hardik Sant',
      email = v_email,
      role = 'admin',
      is_active = true,
      updated_at = now();
  END IF;
END $$;
