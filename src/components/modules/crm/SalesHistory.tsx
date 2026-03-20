import React, { useState, useEffect } from 'react';
import { Receipt, DollarSign, Calendar, User, Package, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SalesBill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  items: any[];
  total_amount: number;
  payment_method: string;
  created_by: string;
  created_at: string;
}

export function SalesHistory() {
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<SalesBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchSalesBills();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bills, searchQuery, dateFilter]);

  const fetchSalesBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching sales bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    if (searchQuery) {
      filtered = filtered.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.customer_phone.includes(searchQuery)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(bill =>
        new Date(bill.created_at).toISOString().split('T')[0] === dateFilter
      );
    }

    setFilteredBills(filtered);
  };

  const getTotalSales = () => {
    return filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
        <p className="text-slate-500">Loading sales history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Sales History</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Sales</p>
              <p className="text-3xl font-bold mt-1">₹{getTotalSales().toLocaleString()}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Bills</p>
              <p className="text-3xl font-bold mt-1">{filteredBills.length}</p>
            </div>
            <Receipt className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Average Bill</p>
              <p className="text-3xl font-bold mt-1">
                ₹{filteredBills.length > 0 ? Math.round(getTotalSales() / filteredBills.length).toLocaleString() : 0}
              </p>
            </div>
            <Package className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bill number, customer..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Showing {filteredBills.length} of {bills.length} bills
          </span>
          <button
            onClick={() => {
              setSearchQuery('');
              setDateFilter('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-12 text-center">
          <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No sales bills found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{bill.bill_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{bill.customer_name}</div>
                      <div className="text-xs text-slate-600">{bill.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-green-600">₹{bill.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{bill.payment_method}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </td>
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
