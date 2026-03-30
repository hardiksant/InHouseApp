import React, { useState, useEffect } from 'react';
import { Filter, Search, Phone, MapPin, DollarSign, Trash2 } from 'lucide-react';
import { supabase, CRMLead, LEAD_SOURCES, LEAD_STATUSES } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

export function AllLeads() {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const isAdmin = userProfile?.role === 'admin';

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    leadSource: ''
  });

  useEffect(() => { fetchLeads(); }, []);
  useEffect(() => { applyFilters(); }, [leads, filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
      if (!isAdmin) query = query.eq('assigned_to', user!.id);
      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...leads];
    if (filters.search) {
      filtered = filtered.filter(lead =>
        lead.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        lead.phone_number.includes(filters.search) ||
        (lead.city && lead.city.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    if (filters.dateFrom) filtered = filtered.filter(lead => new Date(lead.created_at) >= new Date(filters.dateFrom));
    if (filters.dateTo) filtered = filtered.filter(lead => new Date(lead.created_at) <= new Date(filters.dateTo));
    if (filters.status) filtered = filtered.filter(lead => lead.status === filters.status);
    if (filters.leadSource) filtered = filtered.filter(lead => lead.lead_source === filters.leadSource);
    setFilteredLeads(filtered);
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const { error } = await supabase.from('crm_leads').delete().eq('id', leadId);
      if (error) throw error;
      showToast('Lead deleted successfully', 'success');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      showToast('Failed to delete lead', 'error');
    }
  };

  // FIX: matches actual statuses from supabase.ts
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'consultation_pending': return 'bg-purple-100 text-purple-700';
      case 'recommendation_sent': return 'bg-indigo-100 text-indigo-700';
      case 'interested': return 'bg-green-100 text-green-700';
      case 'follow_up': return 'bg-yellow-100 text-yellow-700';
      case 'ready_to_buy': return 'bg-orange-100 text-orange-700';
      case 'sold': return 'bg-emerald-100 text-emerald-700';
      case 'not_interested': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
      <p className="text-slate-500">Loading leads...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">All Leads</h2>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search name, phone, city..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input type="date" value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

          {/* FIX: use LEAD_STATUSES from supabase.ts instead of hardcoded wrong values */}
          <select value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <select value={filters.leadSource}
            onChange={(e) => setFilters(prev => ({ ...prev, leadSource: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(source => <option key={source} value={source}>{source}</option>)}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">Showing {filteredLeads.length} of {leads.length} leads</span>
          <button onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '', status: '', leadSource: '' })}
            className="text-blue-600 hover:text-blue-700 font-medium">Clear Filters</button>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
          <p className="text-slate-500">No leads found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                  {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{lead.customer_name}</div>
                      {lead.is_hot_lead && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">HOT</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone_number}</div>
                        {lead.city && <div className="flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{lead.city}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{lead.product_interested}</div>
                      {lead.budget && (
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />₹{lead.budget.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{lead.lead_source}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {LEAD_STATUSES.find(s => s.value === lead.status)?.label || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(lead.created_at).toLocaleDateString()}</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <button onClick={() => handleDelete(lead.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}