# Office Expense Tracker Setup Guide

## Overview
This is a multi-user office expense tracking application with role-based access control (Admin and Employee roles).

## Database Setup
The database tables and storage buckets have already been created automatically:
- `expenses` table with Row Level Security (RLS) policies
- `expense-bills` storage bucket for bill/invoice images

## Creating User Accounts

### Creating an Admin User
To create an admin user, you need to set the user's role in their metadata. You can do this via the Supabase Dashboard:

1. Go to your Supabase Dashboard: https://zcjlgovmitlelqbwgphz.supabase.co
2. Navigate to Authentication > Users
3. Click "Add user" and create a new user with email/password
4. After creating the user, click on the user to edit them
5. In the "User Metadata" section, add this to the `app_metadata`:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save the changes

Alternatively, you can use the Supabase SQL Editor to create an admin user:

```sql
-- First, create the user through Supabase Auth UI or use the auth.admin API
-- Then update their metadata:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@company.com';
```

### Creating an Employee User
Employee users don't need any special metadata. Simply create them through:

1. Supabase Dashboard: Authentication > Users > Add user
2. Set their email and password
3. They will automatically have the "employee" role (default)

## Default Categories
The app includes these expense categories:
- Office Supplies
- Courier / Shipping
- Marketing
- Travel
- Staff Expense
- Miscellaneous

## Features

### Employee Features
- View their own expenses only
- Add new expenses with bill/invoice images
- Upload receipts and bills
- Track personal expense history

### Admin Features
- View all company expenses
- Edit any expense
- Delete expenses
- Filter by date range, category, or employee
- Export expenses to CSV
- View dashboard with:
  - Total expenses today
  - Total expenses this month
  - Category spending breakdown
  - Visual charts and statistics

## Security
- All data is protected with Row Level Security (RLS)
- Employees can only see and manage their own expenses
- Admins can view and manage all expenses
- Bill images are stored securely in Supabase Storage
- Users must be authenticated to access the application

## Quick Start

1. Create at least one admin user (see above)
2. Create employee users as needed
3. Log in with admin credentials to see the full dashboard
4. Log in with employee credentials to add and track personal expenses

## Demo Credentials
After setting up your users, share the credentials with your team members according to their roles.
