import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Package, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardAlertsProps {
  className?: string;
}

interface AlertData {
  ordersPendingApproval: number;
  ordersReadyForDispatch: number;
  followUpsDueToday: number;
}

export function DashboardAlerts({ className = '' }: DashboardAlertsProps) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertData>({
    ordersPendingApproval: 0,
    ordersReadyForDispatch: 0,
    followUpsDueToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const fetchAlerts = async () => {
    try {
      const promises = [];

      if (userProfile?.role === 'moderator' || userProfile?.role === 'admin') {
        promises.push(
          supabase
            .from('order_book')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'payment_received')
        );

        promises.push(
          supabase
            .from('order_book')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ready_for_dispatch')
        );
      } else {
        promises.push(Promise.resolve({ count: 0 }));
        promises.push(Promise.resolve({ count: 0 }));
      }

      const today = new Date().toISOString().split('T')[0];
      promises.push(
        supabase
          .from('crm_follow_ups')
          .select('id', { count: 'exact', head: true })
          .eq('follow_up_date', today)
          .eq('status', 'pending')
      );

      const [pendingOrders, readyOrders, followUps] = await Promise.all(promises);

      setAlerts({
        ordersPendingApproval: pendingOrders.count || 0,
        ordersReadyForDispatch: readyOrders.count || 0,
        followUpsDueToday: followUps.count || 0
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = (alertType: string) => {
    if (alertType === 'orders-pending') {
      navigate('/crm', { state: { tab: 'order-book', filter: 'payment_received' } });
    } else if (alertType === 'orders-ready') {
      navigate('/crm', { state: { tab: 'moderator', view: 'dispatch' } });
    } else if (alertType === 'followups') {
      navigate('/crm', { state: { tab: 'follow-ups' } });
    }
  };

  const totalAlerts = alerts.ordersPendingApproval + alerts.ordersReadyForDispatch + alerts.followUpsDueToday;

  if (loading || totalAlerts === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-900">Action Required</h3>
      </div>

      {alerts.ordersPendingApproval > 0 && (userProfile?.role === 'moderator' || userProfile?.role === 'admin') && (
        <button
          onClick={() => handleAlertClick('orders-pending')}
          className="w-full bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg hover:bg-orange-100 transition text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Orders Pending Approval</p>
                <p className="text-sm text-gray-600">
                  {alerts.ordersPendingApproval} order{alerts.ordersPendingApproval !== 1 ? 's' : ''} awaiting your review
                </p>
              </div>
            </div>
            <span className="bg-orange-600 text-white text-sm font-bold px-3 py-1 rounded-full">
              {alerts.ordersPendingApproval}
            </span>
          </div>
        </button>
      )}

      {alerts.ordersReadyForDispatch > 0 && (userProfile?.role === 'moderator' || userProfile?.role === 'admin') && (
        <button
          onClick={() => handleAlertClick('orders-ready')}
          className="w-full bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg hover:bg-blue-100 transition text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Orders Ready for Dispatch</p>
                <p className="text-sm text-gray-600">
                  {alerts.ordersReadyForDispatch} order{alerts.ordersReadyForDispatch !== 1 ? 's' : ''} ready to ship
                </p>
              </div>
            </div>
            <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
              {alerts.ordersReadyForDispatch}
            </span>
          </div>
        </button>
      )}

      {alerts.followUpsDueToday > 0 && (
        <button
          onClick={() => handleAlertClick('followups')}
          className="w-full bg-green-50 border-l-4 border-green-500 p-4 rounded-lg hover:bg-green-100 transition text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Follow-ups Due Today</p>
                <p className="text-sm text-gray-600">
                  {alerts.followUpsDueToday} follow-up{alerts.followUpsDueToday !== 1 ? 's' : ''} scheduled for today
                </p>
              </div>
            </div>
            <span className="bg-green-600 text-white text-sm font-bold px-3 py-1 rounded-full">
              {alerts.followUpsDueToday}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
