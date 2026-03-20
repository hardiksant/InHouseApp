import React, { useState, useEffect } from 'react';
import { Users, Phone, MapPin, DollarSign, Calendar, ShoppingBag, X } from 'lucide-react';
import { supabase, CRMCustomer, CRMLead } from '../../../lib/supabase';

export function Customers() {
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string>('');

  useEffect(() => {
    fetchCustomers();
    fetchConvertedLeads();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConvertedLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('status', 'converted')
        .is('id', null);

      if (!error && data) {
        const customerLeadIds = customers.map(c => c.lead_id);
        const unconvertedLeads = data.filter(lead => !customerLeadIds.includes(lead.id));
        setLeads(unconvertedLeads);
      }
    } catch (error) {
      console.error('Error fetching converted leads:', error);
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      const lead = leads.find(l => l.id === selectedLead);
      if (!lead) return;

      const { error } = await supabase
        .from('crm_customers')
        .insert({
          lead_id: lead.id,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          city: lead.city,
          products_purchased: [lead.product_interested],
          total_spent: 0,
          consultation_history: []
        });

      if (error) throw error;

      alert('Lead converted to customer successfully!');
      setShowConvertModal(false);
      setSelectedLead('');
      fetchCustomers();
      fetchConvertedLeads();
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Failed to convert lead');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
        <p className="text-slate-500">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-600">Converted leads and customer database</p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
          >
            <Users className="w-5 h-5" />
            Convert Lead
          </button>
        )}
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No customers yet. Convert leads to customers!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl shadow-lg border-2 border-green-100 p-6 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{customer.customer_name}</h3>
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mt-2">
                    Customer
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone_number}</span>
                </div>
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{customer.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <DollarSign className="w-4 h-4" />
                  <span>₹{customer.total_spent.toLocaleString()} spent</span>
                </div>
              </div>

              {customer.products_purchased.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                    <ShoppingBag className="w-3 h-3" />
                    <span className="font-medium">Products:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {customer.products_purchased.map((product, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-200">
                <Calendar className="w-3 h-3" />
                <span>Customer since {new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold">Convert Lead to Customer</h2>
              <button onClick={() => setShowConvertModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleConvertLead} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Converted Lead *
                </label>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Choose a lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.customer_name} - {lead.phone_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  This will create a customer record from the selected converted lead.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedLead}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg disabled:opacity-50"
                >
                  Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
