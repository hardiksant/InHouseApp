import React, { useState, useEffect } from 'react';
import { Building2, Save, Upload, Image as ImageIcon, MessageSquareWarning } from 'lucide-react';
import { SettingsHeader } from './SettingsHeader';
import UserReportedIssues from './UserReportedIssues';
import ReportIssueButton from '../ReportIssueButton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import logoImage from '../../assets/logo_Nepali_Rudraksh_wala.png';

interface CompanySettings {
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

export function Settings() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'company' | 'issues'>('company');
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Nepali Rudraksh Wala Beads and Mala LLP',
    company_address: '',
    company_gstin: '08AAXFN0754D1Z1',
    company_phone: '',
    company_email: '',
    company_logo: logoImage,
    currency: 'INR',
    currency_symbol: '₹'
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          company_name: data.company_name,
          company_address: data.company_address || '',
          company_gstin: data.company_gstin,
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          company_logo: data.company_logo || logoImage,
          currency: data.currency,
          currency_symbol: data.currency_symbol
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage('');

    try {
      const settingsData = {
        user_id: user.id,
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

      setMessage('Settings saved successfully!');
      await loadSettings();

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      setSettings({ ...settings, company_logo: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage('Error uploading logo. Please try again.');
    }
  };

  const resetToDefault = () => {
    setSettings({
      ...settings,
      company_logo: logoImage
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-50">
      <SettingsHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Settings</h1>
          <p className="text-lg text-slate-600">
            Configure your company information and preferences
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                activeTab === 'company'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Company Settings
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                activeTab === 'issues'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquareWarning className="w-5 h-5" />
              User Reported Issues
            </button>
          </div>
        )}

        {activeTab === 'issues' && isAdmin ? (
          <UserReportedIssues />
        ) : (

        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-200">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Company Settings</h2>
              <p className="text-slate-600">Manage your company information</p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  GSTIN *
                </label>
                <input
                  type="text"
                  value={settings.company_gstin}
                  onChange={(e) => setSettings({ ...settings, company_gstin: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter GSTIN"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Company Address
              </label>
              <textarea
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter company address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => {
                    const currency = e.target.value;
                    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€';
                    setSettings({ ...settings, currency, currency_symbol: symbol });
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currency_symbol}
                  readOnly
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {settings.company_logo && (
                  <div className="w-32 h-32 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={settings.company_logo}
                      alt="Company Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={resetToDefault}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors ml-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Use Default Logo
                  </button>
                  <p className="text-sm text-slate-500">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
        )}
      </main>
      <ReportIssueButton moduleName="Settings" />
    </div>
  );
}
