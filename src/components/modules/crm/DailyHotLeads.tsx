import React, { useState, useEffect } from 'react';
import { UserPlus, X, Phone, MapPin, DollarSign, Tag, User, Calendar, ExternalLink } from 'lucide-react';
import { supabase, CRMLead, LEAD_SOURCES, PRODUCTS_LIST } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { LeadDetails } from './LeadDetails';
import { generateFollowUps, addTimelineEvent } from '../../../lib/crmHelpers';

interface DailyHotLeadsProps {
  onRefresh: () => void;
}

export function DailyHotLeads({ onRefresh }: DailyHotLeadsProps) {
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    city: '',
    product_interested: '',
    budget: '',
    lead_source: LEAD_SOURCES[0],
    remark: '',
    customer_concerns: '',
    assigned_to: user?.id || ''
  });

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('crm_leads')
        .select('*')
        .eq('is_hot_lead', true)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('assigned_to', user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (!error && users) {
        setTeamMembers(users);
      }
    } catch (error) {
      const { data, error: dbError } = await supabase.rpc('get_users');
      if (!dbError && data) {
        setTeamMembers(data);
      }
    }
  };

  const openWhatsApp = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          customer_name: formData.customer_name,
          phone_number: formData.phone_number,
          city: formData.city || null,
          product_interested: formData.product_interested,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          lead_source: formData.lead_source,
          remark: formData.remark,
          customer_concerns: formData.customer_concerns,
          assigned_to: formData.assigned_to,
          is_hot_lead: true,
          status: 'new',
          created_by: user!.id
        })
        .select()
        .single();

      if (leadError) throw leadError;

      await generateFollowUps(leadData.id, leadData.created_at);
      await addTimelineEvent(leadData.id, 'created', 'Lead created', user!.id);

      alert('Lead added successfully with 5 follow-ups scheduled!');
      setShowAddModal(false);
      setFormData({
        customer_name: '',
        phone_number: '',
        city: '',
        product_interested: '',
        budget: '',
        lead_source: LEAD_SOURCES[0],
        remark: '',
        customer_concerns: '',
        assigned_to: user?.id || ''
      });
      fetchLeads();
      onRefresh();
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-yellow-100 text-yellow-700';
      case 'interested': return 'bg-green-100 text-green-700';
      case 'not_interested': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (selectedLeadId) {
    return (
      <LeadDetails
        leadId={selectedLeadId}
        onBack={() => setSelectedLeadId(null)}
        onLeadUpdated={() => {
          fetchLeads();
          onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daily Hot Leads</h2>
          <p className="text-sm text-slate-600">Today's high-priority leads</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          Add Hot Lead
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
          <p className="text-slate-500">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
          <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hot leads today. Add your first lead!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-6 hover:shadow-xl hover:border-blue-300 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{lead.customer_name}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(lead.status)}`}>
                    {lead.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  HOT
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{lead.phone_number}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openWhatsApp(lead.phone_number);
                    }}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Open WhatsApp"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                {lead.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{lead.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Tag className="w-4 h-4" />
                  <span>{lead.product_interested}</span>
                </div>
                {lead.budget && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span>₹{lead.budget.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {lead.customer_concerns && (
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs font-medium text-orange-900 mb-1">Customer Concerns:</p>
                  <p className="text-xs text-orange-800">{lead.customer_concerns}</p>
                </div>
              )}

              {lead.remark && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-700 mb-1">Remark:</p>
                  <p className="text-xs text-slate-600">{lead.remark}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-200">
                <Calendar className="w-3 h-3" />
                <span>Added {new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Add Hot Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="₹"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Interested / Details *
                </label>
                <input
                  type="text"
                  value={formData.product_interested}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_interested: e.target.value }))}
                  placeholder="e.g., 5 Mukhi Rudraksha, Blue Sapphire Gemstone, etc."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Lead Source *
                </label>
                <select
                  value={formData.lead_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {LEAD_SOURCES.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assigned To *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={user?.id}>Myself</option>
                  {isAdmin && teamMembers.filter(m => m.id !== user?.id).map(member => (
                    <option key={member.id} value={member.id}>
                      {member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Concerns
                </label>
                <textarea
                  value={formData.customer_concerns}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_concerns: e.target.value }))}
                  rows={3}
                  placeholder="Any specific concerns or requirements raised by the customer..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Remark
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes or remarks..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> 5 follow-ups will be automatically scheduled: Same day, +2 days, +5 days, +10 days, +20 days
                </p>
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
