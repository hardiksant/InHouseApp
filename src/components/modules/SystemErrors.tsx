import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Filter, Search, X, Monitor, Smartphone, Tablet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SystemError {
  id: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  module: string;
  page_url: string;
  error_message: string;
  error_stack: string | null;
  error_type: string;
  severity: string;
  browser: string | null;
  device_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const ERROR_TYPES = ['JavaScript', 'API', 'Unhandled', 'Form', 'Network'];
const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS = ['New', 'Investigating', 'Resolved'];

const SEVERITY_COLORS = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-blue-100 text-blue-700'
};

const STATUS_COLORS = {
  New: 'bg-purple-100 text-purple-700',
  Investigating: 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700'
};

export function SystemErrors() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    module: 'All',
    severity: 'All',
    status: 'All',
    errorType: 'All'
  });

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      navigate('/platform');
      return;
    }
    fetchErrors();
  }, [userProfile, navigate]);

  useEffect(() => {
    applyFilters();
  }, [errors, filters, searchTerm]);

  const fetchErrors = async () => {
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Error fetching system errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...errors];

    if (filters.module !== 'All') {
      filtered = filtered.filter(e => e.module === filters.module);
    }
    if (filters.severity !== 'All') {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }
    if (filters.status !== 'All') {
      filtered = filtered.filter(e => e.status === filters.status);
    }
    if (filters.errorType !== 'All') {
      filtered = filtered.filter(e => e.error_type === filters.errorType);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.user_name?.toLowerCase().includes(term) ||
        e.user_email?.toLowerCase().includes(term) ||
        e.error_message.toLowerCase().includes(term) ||
        e.module.toLowerCase().includes(term)
      );
    }

    setFilteredErrors(filtered);
  };

  const updateStatus = async (errorId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('system_errors')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', errorId);

      if (error) throw error;

      setErrors(errors.map(e =>
        e.id === errorId ? { ...e, status: newStatus } : e
      ));

      if (selectedError?.id === errorId) {
        setSelectedError({ ...selectedError, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getModules = () => {
    const modules = new Set(errors.map(e => e.module));
    return ['All', ...Array.from(modules).sort()];
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (!deviceType) return <Monitor className="w-4 h-4" />;
    if (deviceType === 'Mobile') return <Smartphone className="w-4 h-4" />;
    if (deviceType === 'Tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const stats = {
    total: errors.length,
    new: errors.filter(e => e.status === 'New').length,
    critical: errors.filter(e => e.severity === 'Critical').length,
    resolved: errors.filter(e => e.status === 'Resolved').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading errors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">System Errors</h1>
              <p className="text-red-100 mt-1">Monitor and resolve application errors</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium mb-1">Total Errors</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium mb-1">New</div>
              <div className="text-3xl font-bold">{stats.new}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium mb-1">Critical</div>
              <div className="text-3xl font-bold">{stats.critical}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-red-100 text-sm font-medium mb-1">Resolved</div>
              <div className="text-3xl font-bold">{stats.resolved}</div>
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
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {getModules().map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>

              <select
                value={filters.errorType}
                onChange={(e) => setFilters({ ...filters, errorType: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="All">All Types</option>
                {ERROR_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="All">All Severities</option>
                {SEVERITY_LEVELS.map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {(filters.module !== 'All' || filters.severity !== 'All' || filters.status !== 'All' || filters.errorType !== 'All' || searchTerm) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Showing {filteredErrors.length} of {errors.length} errors</span>
              <button
                onClick={() => {
                  setFilters({ module: 'All', severity: 'All', status: 'All', errorType: 'All' });
                  setSearchTerm('');
                }}
                className="ml-2 text-red-600 hover:text-red-700 font-medium"
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Error Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredErrors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No errors found
                    </td>
                  </tr>
                ) : (
                  filteredErrors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(error.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{error.user_name || 'Anonymous'}</div>
                        <div className="text-xs text-gray-500">{error.user_role || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{error.module}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{error.error_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SEVERITY_COLORS[error.severity as keyof typeof SEVERITY_COLORS]}`}>
                          {error.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {getDeviceIcon(error.device_type)}
                          <span>{error.browser || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={error.status}
                          onChange={(e) => updateStatus(error.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[error.status as keyof typeof STATUS_COLORS]}`}
                        >
                          {STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedError(error)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          View Details
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

      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Error Details</h2>
              <button
                onClick={() => setSelectedError(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">User</div>
                  <div className="text-gray-900">{selectedError.user_name || 'Anonymous'}</div>
                  <div className="text-sm text-gray-500">{selectedError.user_email || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{selectedError.user_role || 'Unknown Role'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Date</div>
                  <div className="text-gray-900">
                    {new Date(selectedError.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Module</div>
                  <div className="text-gray-900">{selectedError.module}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Error Type</div>
                  <div className="text-gray-900">{selectedError.error_type}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Severity</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${SEVERITY_COLORS[selectedError.severity as keyof typeof SEVERITY_COLORS]}`}>
                    {selectedError.severity}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Status</div>
                  <select
                    value={selectedError.status}
                    onChange={(e) => updateStatus(selectedError.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${STATUS_COLORS[selectedError.status as keyof typeof STATUS_COLORS]}`}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Browser</div>
                  <div className="text-gray-900">{selectedError.browser || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">Device</div>
                  <div className="flex items-center gap-2 text-gray-900">
                    {getDeviceIcon(selectedError.device_type)}
                    <span>{selectedError.device_type || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Page URL</div>
                <div className="bg-gray-50 rounded-xl p-4 text-gray-900 text-sm break-all">
                  {selectedError.page_url}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Error Message</div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-900 whitespace-pre-wrap">
                  {selectedError.error_message}
                </div>
              </div>

              {selectedError.error_stack && (
                <div>
                  <div className="text-sm font-semibold text-gray-600 mb-2">Stack Trace</div>
                  <div className="bg-gray-900 rounded-xl p-4 text-gray-100 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap">
                    {selectedError.error_stack}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedError(null)}
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
