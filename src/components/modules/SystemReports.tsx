import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Filter,
  Search,
  ChevronDown,
  ExternalLink,
  Calendar,
  User,
  FileText,
  TrendingUp,
  X,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SystemReport {
  id: string;
  user_name: string;
  user_email: string;
  module: string;
  issue_type: string;
  priority: string;
  description: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const ISSUE_TYPES = ['Bug', 'Improvement', 'UI Problem', 'Performance Issue', 'Feature Request'];
const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS = ['New', 'In Review', 'Fix Planned', 'Fixed', 'Closed'];

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  New: 'bg-purple-100 text-purple-700',
  'In Review': 'bg-blue-100 text-blue-700',
  'Fix Planned': 'bg-yellow-100 text-yellow-700',
  Fixed: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-700'
};

export function SystemReports() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<SystemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SystemReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    module: 'All',
    priority: 'All',
    status: 'All',
    issueType: 'All'
  });

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      navigate('/platform');
      return;
    }
    fetchReports();
  }, [userProfile, navigate]);

  useEffect(() => {
    applyFilters();
  }, [reports, filters, searchTerm]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('system_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (filters.module !== 'All') {
      filtered = filtered.filter(r => r.module === filters.module);
    }
    if (filters.priority !== 'All') {
      filtered = filtered.filter(r => r.priority === filters.priority);
    }
    if (filters.status !== 'All') {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.issueType !== 'All') {
      filtered = filtered.filter(r => r.issue_type === filters.issueType);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.user_name.toLowerCase().includes(term) ||
        r.user_email.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.module.toLowerCase().includes(term)
      );
    }

    setFilteredReports(filtered);
  };

  const updateStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('system_reports')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.map(r =>
        r.id === reportId ? { ...r, status: newStatus } : r
      ));

      if (selectedReport?.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getModules = () => {
    const modules = new Set(reports.map(r => r.module));
    return ['All', ...Array.from(modules).sort()];
  };

  const stats = {
    total: reports.length,
    new: reports.filter(r => r.status === 'New').length,
    critical: reports.filter(r => r.priority === 'Critical').length,
    fixed: reports.filter(r => r.status === 'Fixed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white hover:text-orange-100 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">System Reports</h1>
              <p className="text-orange-100 mt-1">Track and manage bugs, improvements, and feature requests</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-orange-100 text-sm font-medium mb-1">Total Reports</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-orange-100 text-sm font-medium mb-1">New Issues</div>
              <div className="text-3xl font-bold">{stats.new}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-orange-100 text-sm font-medium mb-1">Critical</div>
              <div className="text-3xl font-bold">{stats.critical}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-orange-100 text-sm font-medium mb-1">Fixed</div>
              <div className="text-3xl font-bold">{stats.fixed}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {getModules().map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>

              <select
                value={filters.issueType}
                onChange={(e) => setFilters({ ...filters, issueType: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="All">All Types</option>
                {ISSUE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="All">All Priorities</option>
                {PRIORITY_LEVELS.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {(filters.module !== 'All' || filters.priority !== 'All' || filters.status !== 'All' || filters.issueType !== 'All' || searchTerm) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Showing {filteredReports.length} of {reports.length} reports</span>
              <button
                onClick={() => {
                  setFilters({ module: 'All', priority: 'All', status: 'All', issueType: 'All' });
                  setSearchTerm('');
                }}
                className="ml-2 text-orange-600 hover:text-orange-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Issue Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{report.user_name}</div>
                        <div className="text-xs text-gray-500">{report.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.module}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.issue_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[report.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {report.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={report.status}
                          onChange={(e) => updateStatus(report.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[report.status as keyof typeof STATUS_COLORS]}`}
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                        >
                          View Details
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Reported By</div>
                  <div className="text-gray-900">{selectedReport.user_name}</div>
                  <div className="text-sm text-gray-500">{selectedReport.user_email}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Date</div>
                  <div className="text-gray-900">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Module</div>
                  <div className="text-gray-900">{selectedReport.module}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Issue Type</div>
                  <div className="text-gray-900">{selectedReport.issue_type}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Priority</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[selectedReport.priority as keyof typeof PRIORITY_COLORS]}`}>
                    {selectedReport.priority}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Status</div>
                  <select
                    value={selectedReport.status}
                    onChange={(e) => updateStatus(selectedReport.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[selectedReport.status as keyof typeof STATUS_COLORS]}`}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Description</div>
                <div className="bg-gray-50 rounded-xl p-4 text-gray-900 whitespace-pre-wrap">
                  {selectedReport.description}
                </div>
              </div>

              {selectedReport.screenshot_url && (
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Screenshot</div>
                  <img
                    src={selectedReport.screenshot_url}
                    alt="Issue screenshot"
                    className="w-full rounded-xl border border-gray-200"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition"
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
