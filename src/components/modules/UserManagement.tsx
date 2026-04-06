import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, X, Mail, Phone, Shield, Building, Trash2,
  Check, AlertCircle, Eye, EyeOff, RefreshCw, ArrowLeft, Copy, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, UserProfile, UserInvitation } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TEMPORARY_PASSWORD = 'Welcome@1234';
const APP_URL = 'rudraoffice.netlify.app';

export function UserManagement() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    role: 'sales' as 'admin' | 'moderator' | 'sales',
    department: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: TEMPORARY_PASSWORD,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user account');

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.full_name,
          email: formData.email,
          mobile_number: formData.mobile_number || null,
          role: formData.role,
          department: formData.department || null,
          is_active: true
        });

      if (profileError) throw profileError;

      setCreatedUserEmail(formData.email);
      setShowAddModal(false);
      setShowSuccessModal(true);
      setFormData({
        full_name: '',
        email: '',
        mobile_number: '',
        role: 'sales',
        department: ''
      });
      fetchUsers();
      showToast('User created successfully!', 'success');
    } catch (error: any) {
      console.error('Error creating user:', error);
      showToast(`Failed to create user: ${error.message}`, 'error');
    }
  };

  const copyLoginDetails = () => {
    const details = `App URL: ${APP_URL}\nEmail: ${createdUserEmail}\nTemporary Password: ${TEMPORARY_PASSWORD}`;
    navigator.clipboard.writeText(details);
    showToast('Login details copied to clipboard!', 'success');
  };

  const handleDeactivateUser = async (userId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${fullName}?`)) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_activity', {
        p_user_id: user!.id,
        p_user_name: userProfile!.full_name,
        p_action_type: 'user_deactivated',
        p_action_description: `Deactivated user ${fullName}`,
        p_entity_type: 'user',
        p_entity_id: userId
      });

      showToast('User deactivated successfully!', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      showToast('Failed to deactivate user', 'error');
    }
  };

  const handleActivateUser = async (userId: string, fullName: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: true })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_activity', {
        p_user_id: user!.id,
        p_user_name: userProfile!.full_name,
        p_action_type: 'user_activated',
        p_action_description: `Activated user ${fullName}`,
        p_entity_type: 'user',
        p_entity_id: userId
      });

      showToast('User activated successfully!', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      showToast('Failed to activate user', 'error');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, fullName: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No rows updated. You may not have permission to update user roles.');
      }

      await supabase.rpc('log_activity', {
        p_user_id: user!.id,
        p_user_name: userProfile!.full_name,
        p_action_type: 'user_role_changed',
        p_action_description: `Changed ${fullName}'s role to ${newRole}`,
        p_entity_type: 'user',
        p_entity_id: userId
      });

      showToast(`Role updated to ${newRole} successfully!`, 'success');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      showToast(error.message || 'Failed to update role', 'error');
      // Refresh the list to revert the dropdown to the correct value
      fetchUsers();
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/platform')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Platform
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-600 mt-1">Manage team members and their access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Team Members</h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {users.length} Total
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {userItem.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{userItem.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{userItem.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {userItem.mobile_number ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">{userItem.mobile_number}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Not set</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                        {userItem.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {userItem.department ? (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building className="w-4 h-4" />
                          <span className="text-sm">{userItem.department}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Not set</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {userItem.is_active ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2 items-center">
                        {userItem.id !== user?.id && (
                          <>
                            <select
                              value={userItem.role}
                              onChange={(e) => handleRoleChange(userItem.id, e.target.value, userItem.full_name)}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="sales">Sales</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                            {userItem.is_active ? (
                              <button
                                onClick={() => handleDeactivateUser(userItem.id, userItem.full_name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Deactivate User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(userItem.id, userItem.full_name)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Activate User"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">User Created Successfully!</h2>
              </div>
              <button onClick={() => setShowSuccessModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 font-medium">
                Share these login details with the new user:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">App URL</label>
                  <p className="text-slate-900 font-mono text-sm mt-1">{APP_URL}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Email</label>
                  <p className="text-slate-900 font-mono text-sm mt-1">{createdUserEmail}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Temporary Password</label>
                  <p className="text-slate-900 font-mono text-sm mt-1">{TEMPORARY_PASSWORD}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Important:</strong> Ask the user to change their password after first login for security.
                </p>
              </div>

              <button
                onClick={copyLoginDetails}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 shadow-lg"
              >
                <Copy className="w-5 h-5" />
                Copy Login Details
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="sales">Sales</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-slate-600 mt-1">
                  {formData.role === 'admin' && 'Full access including user management and system settings'}
                  {formData.role === 'moderator' && 'Can view and update leads, manage follow-ups, view reports'}
                  {formData.role === 'sales' && 'Can add leads, update follow-ups, generate bills'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> User will be created with temporary password: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">{TEMPORARY_PASSWORD}</code>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  After creating the user, you'll receive login details to share with them.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
