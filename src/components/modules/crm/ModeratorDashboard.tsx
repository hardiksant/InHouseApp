import React from 'react';
import {
  Clock, Package, CheckCircle, Truck, Eye, AlertCircle
} from 'lucide-react';
import { OrderBook } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ModeratorDashboardProps {
  orders: OrderBook[];
  onRefresh: () => void;
  onViewOrder: (order: OrderBook) => void;
}

export function ModeratorDashboard({ orders, onRefresh, onViewOrder }: ModeratorDashboardProps) {
  const { isAdmin } = useAuth();
  const pendingApproval = orders.filter(o => o.status === 'pending_approval' || o.status === 'payment_received');
  const preparing = orders.filter(o => o.status === 'preparing_product');
  const readyForDispatch = orders.filter(o => o.status === 'ready_for_dispatch');
  const dispatched = orders.filter(o => o.status === 'dispatched');

  const OrderCard = ({ order, icon, iconColor }: { order: OrderBook; icon: React.ReactNode; iconColor: string }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconColor} rounded-lg`}>
            {icon}
          </div>
          <div>
            <p className="font-mono font-semibold text-blue-600">{order.order_number}</p>
            <p className="text-sm text-slate-600">{order.customer_name}</p>
          </div>
        </div>
        <button
          onClick={() => onViewOrder(order)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Product:</span>
          <span className="font-medium text-slate-800">{order.product}</span>
        </div>
        {isAdmin && (
          <div className="flex justify-between">
            <span className="text-slate-600">Amount:</span>
            <span className="font-medium text-slate-800">₹{order.product_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600">Created by:</span>
          <span className="font-medium text-slate-800">{order.created_by_name}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{pendingApproval.length}</p>
              <p className="text-yellow-100 text-sm">Pending Approval</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Package className="w-8 h-8" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{preparing.length}</p>
              <p className="text-orange-100 text-sm">Preparing</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{readyForDispatch.length}</p>
              <p className="text-purple-100 text-sm">Ready for Dispatch</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Truck className="w-8 h-8" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{dispatched.length}</p>
              <p className="text-indigo-100 text-sm">Dispatched</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-bold text-slate-800">Pending Approval</h3>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {pendingApproval.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingApproval.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No orders pending approval</p>
            ) : (
              pendingApproval.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  icon={<AlertCircle className="w-5 h-5 text-yellow-600" />}
                  iconColor="bg-yellow-100"
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-slate-800">Preparing Orders</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {preparing.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {preparing.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No orders being prepared</p>
            ) : (
              preparing.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  icon={<Package className="w-5 h-5 text-orange-600" />}
                  iconColor="bg-orange-100"
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-slate-800">Ready for Dispatch</h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {readyForDispatch.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {readyForDispatch.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No orders ready for dispatch</p>
            ) : (
              readyForDispatch.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  icon={<CheckCircle className="w-5 h-5 text-purple-600" />}
                  iconColor="bg-purple-100"
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-800">Dispatched Orders</h3>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              {dispatched.length}
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {dispatched.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No dispatched orders</p>
            ) : (
              dispatched.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  icon={<Truck className="w-5 h-5 text-indigo-600" />}
                  iconColor="bg-indigo-100"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
