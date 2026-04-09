import React, { useState, useEffect } from 'react';
import { MessageSquareWarning, Plus, Filter, Search, AlertCircle, CheckCircle2, Clock, X, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { supabase, UserReportedIssue } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function UserReportedIssues() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [issues, setIssues] = useState<UserReportedIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<UserReportedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<UserReportedIssue | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    issue_type: 'bug' as 'bug' | 'suggestion' | 'feature_request' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: '',
    module_name: ''
  });

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [issues, searchTerm, filterStatus, filterType]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_reported_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...issues];

    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.reporter_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(issue => issue.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(issue => issue.issue_type === filterType);
    }

    setFilteredIssues(filtered);
  };

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_reported_issues')
        .insert({
          reported_by: user.id,
          reporter_email: user.email || '',
          module_name: formData.module_name,
          issue_type: formData.issue_type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: 'open'
        });

      if (error) throw error;

      showToast('Issue added successfully!', 'success');
      setFormData({
        title: '',
        issue_type: 'bug',
        priority: 'medium',
        description: '',
        module_name: ''
      });
      setShowAddModal(false);
      fetchIssues();
    } catch (error) {
      console.error('Error adding issue:', error);
      showToast('Failed to add issue. Please try again.', 'error');
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_reported_issues')
        .update(updates)
        .eq('id', issueId);

      if (error) throw error;
      fetchIssues();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status.', 'error');
    }
  };

  const handleUpdateAdminNotes = async (issueId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('user_reported_issues')
        .update({
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', issueId);

      if (error) throw error;
      fetchIssues();
      showToast('Notes updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating notes:', error);
      showToast('Failed to update notes.', 'error');
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      const { error } = await supabase
        .from('user_reported_issues')
        .delete()
        .eq('id', issueId);

      if (error) throw error;
      fetchIssues();
      showToast('Issue deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting issue:', error);
      showToast('Failed to delete issue.', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'suggestion': return 'bg-blue-100 text-blue-800';
      case 'feature_request': return 'bg-purple-100 text-purple-800';
      case 'other': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    inProgress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only administrators can access this section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Issues</p>
              <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
            </div>
            <MessageSquareWarning className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Open</p>
              <p className="text-3xl font-bold text-slate-800">{stats.open}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-slate-800">{stats.inProgress}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-slate-800">{stats.resolved}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
              <option value="feature_request">Feature Request</option>
              <option value="other">Other</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Issue
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading issues...</p>
          </div>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <MessageSquareWarning className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No issues found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800">{issue.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {issue.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                      {issue.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(issue.issue_type)}`}>
                      {issue.issue_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{issue.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Module: <strong>{issue.module_name}</strong></span>
                    <span>Reported by: <strong>{issue.reporter_email}</strong></span>
                    <span>Date: {new Date(issue.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedIssue(issue);
                      setShowDetailsModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="View Details"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteIssue(issue.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Issue"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {issue.admin_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Notes:</p>
                  <p className="text-sm text-blue-800">{issue.admin_notes}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleUpdateStatus(issue.id, 'open')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition"
                >
                  Open
                </button>
                <button
                  onClick={() => handleUpdateStatus(issue.id, 'in_progress')}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(issue.id, 'resolved')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition"
                >
                  Resolved
                </button>
                <button
                  onClick={() => handleUpdateStatus(issue.id, 'closed')}
                  className="px-3 py-1 text-xs bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition"
                >
                  Closed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Plus className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Add New Issue</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddIssue} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Module Name *
                </label>
                <input
                  type="text"
                  value={formData.module_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, module_name: e.target.value }))}
                  placeholder="e.g., CRM, Expenses, Sales Bills"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Issue Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the issue"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Issue Type *
                  </label>
                  <select
                    value={formData.issue_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_type: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="bug">Bug</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  placeholder="Please describe the issue in detail..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  Add Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Issue Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  defaultValue={selectedIssue.admin_notes}
                  rows={4}
                  placeholder="Add notes here..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onBlur={(e) => handleUpdateAdminNotes(selectedIssue.id, e.target.value)}
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedIssue.status)}`}>
                    {selectedIssue.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span>{new Date(selectedIssue.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Updated:</span>
                  <span>{new Date(selectedIssue.updated_at).toLocaleString()}</span>
                </div>
                {selectedIssue.resolved_at && (
                  <div className="flex justify-between">
                    <span className="font-medium">Resolved:</span>
                    <span>{new Date(selectedIssue.resolved_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
