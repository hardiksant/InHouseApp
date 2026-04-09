import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, MapPin, Package, DollarSign, Calendar, User, MessageSquare, Clock, CheckCircle, CreditCard as Edit2, Save, X, ExternalLink } from 'lucide-react';
import { supabase, CRMLead, CRMLeadTimeline, CRMFollowUp, LEAD_STATUSES } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { ActivityTimeline } from '../../ActivityTimeline';

interface LeadDetailsProps {
  leadId: string;
  onBack: () => void;
  onLeadUpdated?: () => void;
}

export function LeadDetails({ leadId, onBack, onLeadUpdated }: LeadDetailsProps) {
  const { user, isAdmin, isModerator } = useAuth();
  const { showToast } = useToast();
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [timeline, setTimeline] = useState<CRMLeadTimeline[]>([]);
  const [followUps, setFollowUps] = useState<CRMFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<CRMLead>>({});
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionData, setConversionData] = useState({
    purchased_product: '',
    purchase_value: 0,
    purchase_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (leadId) {
      fetchLeadDetails();
      fetchTimeline();
      fetchFollowUps();
    }
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLead(data);
      setEditedLead(data);
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_lead_timeline')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTimeline(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_follow_ups')
        .select('*')
        .eq('lead_id', leadId)
        .order('follow_up_number', { ascending: true });

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    }
  };

  const handleSave = async () => {
    if (!lead) return;

    if (editedLead.status === 'sold' && lead.status !== 'sold') {
      showToast('To mark a lead as sold, please use the "Convert to Customer" button instead.', 'error');
      return;
    }

    try {
      const updates: any = {
        ...editedLead,
        updated_at: new Date().toISOString()
      };

      if (editedLead.status !== lead.status) {
        const oldStatus = LEAD_STATUSES.find(s => s.value === lead.status)?.label;
        const newStatus = LEAD_STATUSES.find(s => s.value === editedLead.status)?.label;

        await supabase.from('crm_lead_timeline').insert({
          lead_id: leadId,
          event_type: 'status_change',
          event_description: `Status changed from ${oldStatus} to ${newStatus}`,
          old_value: lead.status,
          new_value: editedLead.status,
          created_by: user!.id
        });
      }

      const { error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      showToast('Lead updated successfully!', 'success');
      setEditing(false);
      fetchLeadDetails();
      fetchTimeline();
      onLeadUpdated?.();
    } catch (error) {
      console.error('Error updating lead:', error);
      showToast('Failed to update lead', 'error');
    }
  };

  const handleConvertToCustomer = async () => {
    if (!lead) return;

    try {
      const { data: customer, error: customerError } = await supabase
        .from('crm_customers')
        .insert({
          lead_id: leadId,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          city: lead.city,
          products_purchased: [conversionData.purchased_product],
          total_spent: conversionData.purchase_value,
          first_purchase_date: conversionData.purchase_date,
          last_purchase_date: conversionData.purchase_date,
          consultation_history: [],
          purchased_product: conversionData.purchased_product,
          purchase_date: conversionData.purchase_date,
          purchase_value: conversionData.purchase_value,
          salesperson: lead.assigned_to
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: leadError } = await supabase
        .from('crm_leads')
        .update({
          status: 'sold',
          purchased_product: conversionData.purchased_product,
          purchase_value: conversionData.purchase_value,
          purchase_date: conversionData.purchase_date,
          converted_to_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

      await supabase.from('crm_lead_timeline').insert({
        lead_id: leadId,
        event_type: 'converted',
        event_description: `Lead converted to customer with purchase of ${conversionData.purchased_product}`,
        new_value: String(conversionData.purchase_value),
        created_by: user!.id
      });

      showToast('Lead converted to customer successfully!', 'success');
      setShowConvertModal(false);
      fetchLeadDetails();
      fetchTimeline();
      onLeadUpdated?.();
    } catch (error) {
      console.error('Error converting lead:', error);
      showToast('Failed to convert lead to customer', 'error');
    }
  };

  const openWhatsApp = () => {
    if (lead?.phone_number) {
      const cleanNumber = lead.phone_number.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'consultation_pending': return 'bg-purple-100 text-purple-800';
      case 'recommendation_sent': return 'bg-indigo-100 text-indigo-800';
      case 'interested': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_buy': return 'bg-orange-100 text-orange-800';
      case 'sold': return 'bg-emerald-100 text-emerald-800';
      case 'not_interested': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Leads
      </button>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  {lead.customer_name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
                  {LEAD_STATUSES.find(s => s.value === lead.status)?.label}
                </span>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {lead.status !== 'sold' && (
                      <button
                        onClick={() => setShowConvertModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Convert to Customer
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditedLead(lead);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{lead.phone_number}</p>
                    <button
                      onClick={openWhatsApp}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Open WhatsApp"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">City</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editedLead.city || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, city: e.target.value })}
                      className="px-2 py-1 border border-slate-300 rounded"
                    />
                  ) : (
                    <p className="font-medium text-slate-800">{lead.city || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Product Interested</p>
                  <p className="font-medium text-slate-800">{lead.product_interested}</p>
                </div>
              </div>

              {(isAdmin || lead.assigned_to === user?.id) && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Budget</p>
                    <p className="font-medium text-slate-800">
                      {lead.budget ? `₹${lead.budget.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Lead Source</p>
                  <p className="font-medium text-slate-800">{lead.lead_source}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600">Date Created</p>
                  <p className="font-medium text-slate-800">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {editing && (
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 mb-2">Status</label>
                  <select
                    value={editedLead.status}
                    onChange={(e) => setEditedLead({ ...editedLead, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {LEAD_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-1">Remark</p>
                    {editing ? (
                      <textarea
                        value={editedLead.remark || ''}
                        onChange={(e) => setEditedLead({ ...editedLead, remark: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-slate-800">{lead.remark}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-1">Customer Concerns</p>
                    <p className="text-slate-800">{lead.customer_concerns}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ActivityTimeline referenceId={leadId} referenceType="lead" />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Follow Ups</h3>
            <div className="space-y-3">
              {followUps.map((followUp) => (
                <div
                  key={followUp.id}
                  className={`p-3 rounded-lg border-2 ${
                    followUp.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : new Date(followUp.follow_up_date) < new Date()
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">
                      Follow Up #{followUp.follow_up_number}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      followUp.status === 'completed'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {followUp.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {new Date(followUp.follow_up_date).toLocaleDateString()}
                  </p>
                  {followUp.notes && (
                    <p className="text-sm text-slate-700 mt-2">{followUp.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Convert to Customer</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Purchased Product *
                </label>
                <input
                  type="text"
                  value={conversionData.purchased_product}
                  onChange={(e) => setConversionData({ ...conversionData, purchased_product: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              {(isAdmin || lead.assigned_to === user?.id) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Purchase Value (₹) *
                  </label>
                  <input
                    type="number"
                    value={conversionData.purchase_value}
                    onChange={(e) => setConversionData({ ...conversionData, purchase_value: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  value={conversionData.purchase_date}
                  onChange={(e) => setConversionData({ ...conversionData, purchase_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToCustomer}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
