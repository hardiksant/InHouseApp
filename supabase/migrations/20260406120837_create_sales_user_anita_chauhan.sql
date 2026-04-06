/*
  # Create Sales User - Anita Chauhan

  1. New User
    - Email: sales.rudrakshwala@gmail.com
    - Full Name: Anita Chauhan
    - Role: sales
    - Password: Welcome@1234

  2. Tables Updated
    - `auth.users` - Creates authentication account
    - `user_profiles` - Creates user profile record with role and details

  3. Security
    - Password is hashed using Supabase's crypt function
    - Email confirmation is bypassed (email_confirmed_at set)
    - User can login immediately after creation
*/

DO $$
DECLARE
  sales_user_id uuid;
  existing_profile_id uuid;
BEGIN
  -- Check if sales user already exists in auth.users
  SELECT id INTO sales_user_id FROM auth.users WHERE email = 'sales.rudrakshwala@gmail.com';
  
  -- Create sales user if not exists
  IF sales_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'sales.rudrakshwala@gmail.com',
      crypt('Welcome@1234', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Anita Chauhan"}',
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO sales_user_id;
  END IF;
  
  -- Check if profile already exists
  SELECT id INTO existing_profile_id FROM user_profiles WHERE id = sales_user_id;
  
  -- Insert Sales User Profile only if it doesn't exist
  IF existing_profile_id IS NULL THEN
    INSERT INTO user_profiles (
      id,
      full_name,
      email,
      role,
      department,
      is_active
    )
    VALUES (
      sales_user_id,
      'Anita Chauhan',
      'sales.rudrakshwala@gmail.com',
      'sales',
      'Sales',
      true
    );
  END IF;
END $$;