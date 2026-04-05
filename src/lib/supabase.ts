import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Expense {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  payment_method: string;
  notes?: string;
  bill_image?: string;
  added_by: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  role: 'admin' | 'moderator' | 'sales';
  department?: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Creative {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  thumbnail_path?: string;
  folder_category: string;
  subfolder?: string;
  tags: string[];
  suggested_caption: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CRMLead {
  id: string;
  customer_name: string;
  phone_number: string;
  city?: string;
  product_interested: string;
  budget?: number;
  lead_source: string;
  remark: string;
  customer_concerns: string;
  assigned_to: string;
  status: 'new' | 'consultation_pending' | 'recommendation_sent' | 'interested' | 'follow_up' | 'ready_to_buy' | 'sold' | 'not_interested';
  is_hot_lead: boolean;
  created_by: string;
  purchased_product?: string;
  purchase_value?: number;
  purchase_date?: string;
  converted_to_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMFollowUp {
  id: string;
  lead_id: string;
  follow_up_number: number;
  follow_up_date: string;
  status: 'pending' | 'completed' | 'skipped';
  notes: string;
  next_follow_up_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMCustomer {
  id: string;
  lead_id?: string;
  customer_name: string;
  phone_number: string;
  city?: string;
  products_purchased: string[];
  total_spent: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  consultation_history: any[];
  purchased_product?: string;
  purchase_date?: string;
  purchase_value?: number;
  salesperson?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMLeadTimeline {
  id: string;
  lead_id: string;
  event_type: string;
  event_description: string;
  old_value?: string;
  new_value?: string;
  created_by: string;
  created_at: string;
}

export interface IssueReport {
  id: string;
  user_name: string;
  user_id: string;
  module: string;
  description: string;
  screenshot_url?: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export interface UserReportedIssue {
  id: string;
  reported_by: string;
  reporter_email: string;
  module_name: string;
  issue_type: 'bug' | 'suggestion' | 'feature_request' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  action_description: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
  created_at: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moderator' | 'sales';
  department?: string;
  invited_by: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface OrderBook {
  id: string;
  order_number: string;
  customer_name: string;
  mobile_number: string;
  full_address: string;
  city: string;
  state: string;
  pin_code: string;
  product: string;
  quantity: number;
  price: number;
  gift?: string;
  order_type: 'prepaid' | 'cod';
  courier_charge: number;
  product_amount: number;
  advance_payment: number;
  final_due: number;
  remark?: string;
  payment_screenshot_url?: string;
  status: 'payment_received' | 'pending_approval' | 'approved' | 'preparing_product' | 'ready_for_dispatch' | 'dispatched' | 'delivered';
  created_by: string;
  created_by_name: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_at?: string;
  courier_partner?: string;
  tracking_id?: string;
  dispatch_date?: string;
  product_preparation_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  changed_by: string;
  changed_by_name: string;
  notes?: string;
  created_at: string;
}

export const LEAD_SOURCES = [
  'Website',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Phone Call',
  'Walk-in',
  'Referral',
  'Advertisement',
  'Other'
];

export const PRODUCTS_LIST = [
  'Rudraksha',
  'Gemstones',
  'Spiritual Items',
  'Consultation',
  'Other'
];

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'consultation_pending', label: 'Consultation Pending' },
  { value: 'recommendation_sent', label: 'Recommendation Sent' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'ready_to_buy', label: 'Ready To Buy' },
  { value: 'sold', label: 'Sold' },
  { value: 'not_interested', label: 'Not Interested' }
];

export const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Courier / Shipping',
  'Marketing',
  'Travel',
  'Staff Expense',
  'Miscellaneous',
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Check',
  'Other',
];
