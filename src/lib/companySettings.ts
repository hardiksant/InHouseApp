import { supabase } from './supabase';
import logoImage from '../assets/logo_Nepali_Rudraksh_wala.png';

export interface CompanySettings {
  id?: string;
  company_name: string;
  company_address: string;
  company_gstin: string;
  company_phone: string;
  company_email: string;
  company_logo: string;
  currency: string;
  currency_symbol: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'Nepali Rudraksh Wala Beads and Mala LLP',
  company_address: '',
  company_gstin: '08AAXFN0754D1Z1',
  company_phone: '',
  company_email: '',
  company_logo: logoImage,
  currency: 'INR',
  currency_symbol: '₹'
};

export async function getCompanySettings(userId: string): Promise<CompanySettings> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        company_name: data.company_name,
        company_address: data.company_address || '',
        company_gstin: data.company_gstin,
        company_phone: data.company_phone || '',
        company_email: data.company_email || '',
        company_logo: data.company_logo || logoImage,
        currency: data.currency,
        currency_symbol: data.currency_symbol
      };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading company settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveCompanySettings(
  userId: string,
  settings: CompanySettings
): Promise<boolean> {
  try {
    const settingsData = {
      user_id: userId,
      company_name: settings.company_name,
      company_address: settings.company_address,
      company_gstin: settings.company_gstin,
      company_phone: settings.company_phone,
      company_email: settings.company_email,
      company_logo: settings.company_logo,
      currency: settings.currency,
      currency_symbol: settings.currency_symbol,
      updated_at: new Date().toISOString()
    };

    if (settings.id) {
      const { error } = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('id', settings.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('company_settings')
        .insert([settingsData]);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error saving company settings:', error);
    return false;
  }
}
