import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Filter, Search, Calendar, Eye, Truck,
  CheckCircle, Clock, AlertCircle, X
} from 'lucide-react';
import { supabase, OrderBook as OrderBookType } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { CreateOrderModal } from './CreateOrderModal';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ModeratorDashboard } from './ModeratorDashboard';

export function OrderBook() {
  const { user, userProfile, isAdmin, isModerator } = useAuth();
  const [orders, setOrders] = useState<OrderBookType[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderBookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderBookType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModeratorDashboard, setShowModeratorDashboard] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase.from('order_book').select('*').order('created_at', { ascending: false });
      if (!isAdmin && !isModerator) { query = query.eq('created_by', user?.id); }
      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.mobile_number.includes(searchTerm)
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const displayOrders = filteredOrders;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      payment_received: {
        color: 'bg-blue-100 text-blue-800',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Payment Received'
      },
      pending_approval: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-3 h-3" />,
        label: 'Pending Approval'
      },
      approved: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Approved'
      },
      preparing_product: {
        color: 'bg-orange-100 text-orange-800',
        icon: <Package className="w-3 h-3" />,
        label: 'Preparing Product'
      },
      ready_for_dispatch: {
        color: 'bg-purple-100 text-purple-800',
        icon: <Package className="w-3 h-3" />,
        label: 'Ready for Dispatch'
      },
      dispatched: {
        color: 'bg-indigo-100 text-indigo-800',
        icon: <Truck className="w-3 h-3" />,
        label: 'Dispatched'
      },
      delivered: {
        color: 'bg-emerald-100 text-emerald-800',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Delivered'
      }
    };

    const config = statusConfig[status] || statusConfig.payment_received;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1 w-fit`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isAdmin || isModerator ? 'All Order Books' : `Order Book - ${userProfile?.full_name}`}
          </h2>
          <p className="text-slate-600 mt-1">
            {displayOrders.length} {displayOrders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>
        <div className="flex gap-3">
          {(isModerator || isAdmin) && (
            <button
              onClick={() => setShowModeratorDashboard(!showModeratorDashboard)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              <Package className="w-5 h-5" />
              {showModeratorDashboard ? 'View All Orders' : 'Moderator Dashboard'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Order
          </button>
        </div>
      </div>

      {showModeratorDashboard && (isModerator || isAdmin) ? (
        <ModeratorDashboard orders={orders} onRefresh={fetchOrders} onViewOrder={setSelectedOrder} />
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order number, customer name, or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-600" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="payment_received">Payment Received</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="preparing_product">Preparing Product</option>
                  <option value="ready_for_dispatch">Ready for Dispatch</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading orders...</p>
              </div>
            ) : displayOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchTerm || statusFilter !== 'all' ? 'No orders found matching your filters' : 'No orders yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Order #</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Product</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Created By</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-4">
                          <span className="font-mono font-semibold text-blue-600">
                            {order.order_number}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{order.customer_name}</p>
                            <p className="text-sm text-slate-600">{order.mobile_number}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{order.product}</p>
                            <p className="text-sm text-slate-600">Qty: {order.quantity}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-slate-800">₹{order.product_amount.toFixed(2)}</p>
                            {order.final_due > 0 && (
                              <p className="text-sm text-orange-600">Due: ₹{order.final_due.toFixed(2)}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-slate-600">{order.created_by_name}</p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrders();
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
}
