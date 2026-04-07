import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Shield, Building, Camera, Save, X,
  Lock, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export function MyProfile() {
  const navigate = useNavigate();
  const { user, userProfile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    mobile_number: userProfile?.mobile_number || '',
    department: userProfile?.department || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [uploading, setUploading] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      showToast('Profile updated successfully!', 'success');
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(`Failed to update profile: ${error.message}`, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'warning');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      showToast('Password changed successfully!', 'success');
      setChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast(`Failed to change password: ${error.message}`, 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      await updateProfile({ profile_photo_url: publicUrl });

      showToast('Profile photo updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showToast(`Failed to upload photo: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'sales': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div>
        <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-600 mt-1">Manage your personal information and settings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start gap-8 mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {userProfile.profile_photo_url ? (
                <img
                  src={userProfile.profile_photo_url}
                  alt={userProfile.full_name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
                />
              ) : (
                <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-200">
                  <span className="text-blue-600 font-bold text-4xl">
                    {userProfile.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && (
              <p className="text-sm text-blue-600">Uploading...</p>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{userProfile.full_name}</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(userProfile.role)}`}>
                {userProfile.role.toUpperCase()}
              </span>
              {userProfile.is_active ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  Inactive
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-5 h-5" />
                <span>{userProfile.email}</span>
              </div>
              {userProfile.mobile_number && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-5 h-5" />
                  <span>{userProfile.mobile_number}</span>
                </div>
              )}
              {userProfile.department && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Building className="w-5 h-5" />
                  <span>{userProfile.department}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Personal Information</h3>
            {!editing && (
              <button
                onClick={() => {
                  setEditing(true);
                  setFormData({
                    full_name: userProfile.full_name,
                    mobile_number: userProfile.mobile_number || '',
                    department: userProfile.department || ''
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  <X className="w-5 h-5 inline mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Full Name</p>
                <p className="text-slate-800">{userProfile.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Email</p>
                <p className="text-slate-800">{userProfile.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Mobile Number</p>
                <p className="text-slate-800">{userProfile.mobile_number || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Department</p>
                <p className="text-slate-800">{userProfile.department || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Role</p>
                <p className="text-slate-800 capitalize">{userProfile.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Member Since</p>
                <p className="text-slate-800">{new Date(userProfile.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Security</h3>
              <p className="text-sm text-slate-600">Update your password</p>
            </div>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                <Lock className="w-5 h-5 inline mr-2" />
                Change Password
              </button>
            )}
          </div>

          {changingPassword && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
