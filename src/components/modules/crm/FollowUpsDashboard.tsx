import React, { useState, useEffect } from 'react';
import { Calendar, Phone, CheckCircle, X, AlertCircle, Clock } from 'lucide-react';
import { supabase, CRMFollowUp, CRMLead, LEAD_STATUSES } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface FollowUpsDashboardProps {
  onRefresh: () => void;
}

interface FollowUpWithLead extends CRMFollowUp {
  lead?: CRMLead;
}

export function FollowUpsDashboard({ onRefresh }: FollowUpsDashboardProps) {
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [todayFollowUps, setTodayFollowUps] = useState<FollowUpWithLead[]>([]);
  const [tomorrowFollowUps, setTomorrowFollowUps] = useState<FollowUpWithLead[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUpWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpWithLead | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    followUpStatus: 'pending' as 'pending' | 'completed' | 'skipped',
    leadStatus: '' as string,
    notes: ''
  });

  useEffect(() => { fetchFollowUps(); }, []);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      let followUpsData: FollowUpWithLead[] = [];

      if (isAdmin) {
        // Admin: fetch all follow-ups with joined lead
        const { data, error } = await supabase
          .from('crm_follow_ups')
          .select('*, lead:crm_leads(*)')
          .eq('status', 'pending');
        if (error) throw error;
        followUpsData = (data || []) as FollowUpWithLead[];
      } else {
        // FIX: first get this user's lead IDs, then filter follow-ups
        const { data: myLeads, error: leadsError } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('assigned_to', user!.id);

        if (leadsError) throw leadsError;

        const leadIds = (myLeads || []).map(l => l.id);

        if (leadIds.length === 0) {
          setTodayFollowUps([]);
          setTomorrowFollowUps([]);
          setOverdueFollowUps([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('crm_follow_ups')
          .select('*, lead:crm_leads(*)')
          .in('lead_id', leadIds)
          .eq('status', 'pending');

        if (error) throw error;
        followUpsData = (data || []) as FollowUpWithLead[];
      }

      setTodayFollowUps(followUpsData.filter(f => f.follow_up_date.startsWith(today)));
      setTomorrowFollowUps(followUpsData.filter(f => f.follow_up_date.startsWith(tomorrowDate)));
      setOverdueFollowUps(followUpsData.filter(f => f.follow_up_date.split('T')[0] < today));
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;

    try {
      // FIX: use correct follow-up statuses: pending | completed | skipped
      const { error: followUpError } = await supabase
        .from('crm_follow_ups')
        .update({
          status: updateForm.followUpStatus,
          notes: updateForm.notes,
          completed_at: updateForm.followUpStatus !== 'pending' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFollowUp.id);

      if (followUpError) throw followUpError;

      // Separately update lead status if changed
      if (updateForm.leadStatus && selectedFollowUp.lead_id) {
        await supabase
          .from('crm_leads')
          .update({ status: updateForm.leadStatus, updated_at: new Date().toISOString() })
          .eq('id', selectedFollowUp.lead_id);
      }

      alert('Follow-up updated successfully!');
      setShowUpdateModal(false);
      setSelectedFollowUp(null);
      fetchFollowUps();
      onRefresh();
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert('Failed to update follow-up');
    }
  };

  const openUpdateModal = (followUp: FollowUpWithLead) => {
    setSelectedFollowUp(followUp);
    setUpdateForm({
      followUpStatus: followUp.status as any,
      leadStatus: followUp.lead?.status || '',
      notes: followUp.notes
    });
    setShowUpdateModal(true);
  };

  const renderFollowUpCard = (followUp: FollowUpWithLead) => (
    <div key={followUp.id}
      className="bg-white rounded-xl border-2 border-slate-100 p-4 hover:shadow-md transition cursor-pointer"
      onClick={() => openUpdateModal(followUp)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-slate-900">{followUp.lead?.customer_name}</h4>
          <p className="text-sm text-slate-600">{followUp.lead?.phone_number}</p>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          Follow-up #{followUp.follow_up_number}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4" />
          <span>{new Date(followUp.follow_up_date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="w-4 h-4" />
          <span>{followUp.lead?.product_interested}</span>
        </div>
      </div>
      {followUp.notes && (
        <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600">{followUp.notes}</div>
      )}
    </div>
  );

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
      <p className="text-slate-500">Loading follow-ups...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Follow-ups Dashboard</h2>

      {overdueFollowUps.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">{overdueFollowUps.length} Overdue Follow-ups</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overdueFollowUps.map(renderFollowUpCard)}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-orange-600" />
          <h3 className="text-lg font-bold text-slate-900">Today's Follow-ups ({todayFollowUps.length})</h3>
        </div>
        {todayFollowUps.length === 0
          ? <p className="text-slate-500 text-center py-8">No follow-ups scheduled for today</p>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{todayFollowUps.map(renderFollowUpCard)}</div>
        }
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Tomorrow's Follow-ups ({tomorrowFollowUps.length})</h3>
        </div>
        {tomorrowFollowUps.length === 0
          ? <p className="text-slate-500 text-center py-8">No follow-ups scheduled for tomorrow</p>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{tomorrowFollowUps.map(renderFollowUpCard)}</div>
        }
      </div>

      {showUpdateModal && selectedFollowUp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold">Update Follow-up</h2>
              <button onClick={() => setShowUpdateModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateFollowUp} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900">{selectedFollowUp.lead?.customer_name}</h3>
                <p className="text-sm text-slate-600">{selectedFollowUp.lead?.phone_number}</p>
                <p className="text-sm text-slate-600">{selectedFollowUp.lead?.product_interested}</p>
              </div>

              {/* FIX: correct follow-up statuses */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Status *</label>
                <select value={updateForm.followUpStatus}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, followUpStatus: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" required>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>

              {/* Separate lead status update */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Update Lead Status (optional)</label>
                <select value={updateForm.leadStatus}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, leadStatus: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">— No change —</option>
                  {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea value={updateForm.notes}
                  onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4} placeholder="Add notes about this follow-up..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-red-700 transition shadow-lg">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}