import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Package, Award } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface SalespersonStats {
  user_id: string;
  user_name: string;
  total_orders: number;
  total_sales: number;
  average_order_value: number;
}

interface TopPerformer extends SalespersonStats {
  rank: number;
}

export function SalesAnalytics() {
  const { user, userProfile } = useAuth();
  const [myStats, setMyStats] = useState<SalespersonStats | null>(null);
  const [allSalesStats, setAllSalesStats] = useState<SalespersonStats[]>([]);
  const [topPerformer, setTopPerformer] = useState<TopPerformer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('order_book')
        .select('created_by, created_by_name, final_due, status')
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['payment_received', 'approved', 'preparing_product', 'ready_for_dispatch', 'dispatched', 'delivered']);

      if (error) throw error;

      const statsMap = new Map<string, SalespersonStats>();

      orders?.forEach((order) => {
        const userId = order.created_by;
        const userName = order.created_by_name;

        if (!statsMap.has(userId)) {
          statsMap.set(userId, {
            user_id: userId,
            user_name: userName,
            total_orders: 0,
            total_sales: 0,
            average_order_value: 0
          });
        }

        const stats = statsMap.get(userId)!;
        stats.total_orders += 1;
        stats.total_sales += order.final_due || 0;
      });

      statsMap.forEach((stats) => {
        stats.average_order_value = stats.total_orders > 0 ? stats.total_sales / stats.total_orders : 0;
      });

      const allStats = Array.from(statsMap.values()).sort((a, b) => b.total_sales - a.total_sales);

      setAllSalesStats(allStats);

      const myStatData = allStats.find((s) => s.user_id === user.id);
      setMyStats(myStatData || null);

      if (allStats.length > 0) {
        setTopPerformer({
          ...allStats[0],
          rank: 1
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Sales Analytics - This Month</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">Total Orders</p>
          <p className="text-3xl font-bold">{myStats?.total_orders || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">Total Sales Value</p>
          <p className="text-3xl font-bold">₹{myStats?.total_sales.toFixed(0) || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-sm opacity-90 mb-1">Average Order Value</p>
          <p className="text-3xl font-bold">₹{myStats?.average_order_value.toFixed(0) || 0}</p>
        </div>
      </div>

      {topPerformer && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 rounded-full p-4">
              <Award className="w-8 h-8 text-yellow-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Top Performer This Month</h3>
              <p className="text-2xl font-bold text-yellow-900">{topPerformer.user_name}</p>
              <p className="text-sm text-gray-700 mt-2">
                Total Sales: <span className="font-bold text-yellow-900">₹{topPerformer.total_sales.toFixed(0)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Team Performance</h3>
        <p className="text-sm text-gray-600 mb-4">Order count for all salespeople this month</p>

        <div className="space-y-3">
          {allSalesStats.map((stats, index) => (
            <div
              key={stats.user_id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                stats.user_id === user?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {stats.user_name}
                    {stats.user_id === user?.id && (
                      <span className="ml-2 text-xs text-blue-600 font-normal">(You)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
                <p className="text-xs text-gray-600">orders</p>
              </div>
            </div>
          ))}

          {allSalesStats.length === 0 && (
            <p className="text-center text-gray-500 py-8">No sales data this month</p>
          )}
        </div>
      </div>
    </div>
  );
}
