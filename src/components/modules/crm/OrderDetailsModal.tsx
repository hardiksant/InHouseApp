import React, { useState, useEffect } from 'react';
import {
  X, Package, MapPin, Phone, Mail, Calendar, Truck, Upload,
  CheckCircle, Clock, Image as ImageIcon, FileText
} from 'lucide-react';
import { supabase, OrderBook, OrderStatusHistory } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { logActivity, ActivityTypes } from '../../../lib/activityLogger';
import { ActivityTimeline } from '../../ActivityTimeline';
import { notifyOrderApproval, notifyOrderDispatched, notifyTrackingAdded } from '../../../lib/notificationHelper';

interface OrderDetailsModalProps {
  order: OrderBook;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderDetailsModal({ order, onClose, onUpdate }: OrderDetailsModalProps) {
  const { user, userProfile, isAdmin, isModerator } = useAuth();
  const { showToast } = useToast();
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [trackingData, setTrackingData] = useState({
    courier_partner: order.courier_partner || '',
    tracking_id: order.tracking_id || '',
    dispatch_date: order.dispatch_date || ''
  });

  useEffect(() => {
    fetchStatusHistory();
  }, [order.id]);

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!user || !userProfile) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('order_book')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      await logActivity({
        userId: user.id,
        userName: userProfile.full_name,
        actionType: ActivityTypes.LEAD_UPDATED,
        actionDescription: `Updated order ${order.order_number} status to ${newStatus}`,
        entityType: 'order',
        entityId: order.id
      });

      showToast('Order status updated successfully!', 'success');
      onUpdate();
      fetchStatusHistory();
    } catch (error: any) {
      console.error('Error updating status:', error);
      showToast(`Failed to update status: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!user || !userProfile) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('order_book')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_by_name: userProfile.full_name,
          approved_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      await logActivity({
        userId: user.id,
        userName: userProfile.full_name,
        actionType: ActivityTypes.LEAD_UPDATED,
        actionDescription: `Approved order ${order.order_number}`,
        entityType: 'order',
        entityId: order.id
      });

      if (order.created_by) {
        await notifyOrderApproval(order.id, order.order_number, order.created_by);
      }

      showToast('Order approved successfully!', 'success');
      onUpdate();
      fetchStatusHistory();
    } catch (error: any) {
      console.error('Error approving order:', error);
      showToast(`Failed to approve order: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `products/${order.order_number}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('order-documents')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('order_book')
        .update({ product_preparation_photo_url: publicUrl })
        .eq('id', order.id);

      if (updateError) throw updateError;

      showToast('Product photo uploaded successfully!', 'success');
      onUpdate();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      showToast(`Failed to upload photo: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTrackingUpdate = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('order_book')
        .update(trackingData)
        .eq('id', order.id);

      if (error) throw error;

      await logActivity({
        userId: user!.id,
        userName: userProfile!.full_name,
        actionType: ActivityTypes.LEAD_UPDATED,
        actionDescription: `Added tracking details for order ${order.order_number}`,
        entityType: 'order',
        entityId: order.id
      });

      if (order.created_by && trackingData.tracking_id) {
        await notifyTrackingAdded(order.id, order.order_number, trackingData.tracking_id, order.created_by);
      }

      if (trackingData.tracking_id && order.status === 'ready_for_dispatch') {
        const { error: statusError } = await supabase
          .from('order_book')
          .update({ status: 'dispatched', dispatch_date: trackingData.dispatch_date })
          .eq('id', order.id);

        if (!statusError && order.created_by) {
          await notifyOrderDispatched(order.id, order.order_number, trackingData.tracking_id, order.created_by);
        }
      }

      showToast('Tracking details updated successfully!', 'success');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating tracking:', error);
      showToast(`Failed to update tracking: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      payment_received: 'bg-blue-100 text-blue-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      preparing_product: 'bg-orange-100 text-orange-800',
      ready_for_dispatch: 'bg-purple-100 text-purple-800',
      dispatched: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const canModerateOrder = isAdmin || isModerator;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Order Details</h2>
            <p className="text-blue-100 text-sm">#{order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <div className="text-sm text-slate-600">
              Created by {order.created_by_name} on {new Date(order.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Customer Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Name:</span>
                  <p className="font-medium text-slate-800">{order.customer_name}</p>
                </div>
                <div>
                  <span className="text-slate-600">Mobile:</span>
                  <p className="font-medium text-slate-800">{order.mobile_number}</p>
                </div>
                <div>
                  <span className="text-slate-600">Address:</span>
                  <p className="font-medium text-slate-800">{order.full_address}</p>
                </div>
                <div>
                  <span className="text-slate-600">City:</span>
                  <p className="font-medium text-slate-800">{order.city}, {order.state} - {order.pin_code}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Product:</span>
                  <p className="font-medium text-slate-800">{order.product}</p>
                </div>
                <div>
                  <span className="text-slate-600">Quantity:</span>
                  <p className="font-medium text-slate-800">{order.quantity}</p>
                </div>
                <div>
                  <span className="text-slate-600">Price:</span>
                  <p className="font-medium text-slate-800">₹{order.price.toFixed(2)} per unit</p>
                </div>
                {order.gift && (
                  <div>
                    <span className="text-slate-600">Gift:</span>
                    <p className="font-medium text-slate-800">{order.gift}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <h3 className="font-bold text-slate-800 mb-3">Payment Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(isAdmin || order.created_by === user?.id) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Product Amount:</span>
                    <span className="font-semibold">₹{order.product_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Advance Payment:</span>
                    <span className="font-semibold">₹{order.advance_payment.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Courier Charge:</span>
                <span className="font-semibold">₹{order.courier_charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Order Type:</span>
                <span className="font-semibold uppercase">{order.order_type}</span>
              </div>
              {(isAdmin || order.created_by === user?.id) && (
                <div className="flex justify-between col-span-2 border-t pt-2">
                  <span className="text-slate-800 font-bold">Final Due:</span>
                  <span className="font-bold text-blue-600">₹{order.final_due.toFixed(2)}</span>
                </div>
              )}
            </div>

            {order.payment_screenshot_url && (
              <div className="mt-3">
                <a
                  href={order.payment_screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  View Payment Screenshot
                </a>
              </div>
            )}
          </div>

          {order.remark && (
            <div className="bg-slate-50 p-4 rounded-xl">
              <h3 className="font-bold text-slate-800 mb-2">Remark</h3>
              <p className="text-sm text-slate-600">{order.remark}</p>
            </div>
          )}

          {canModerateOrder && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl space-y-4">
              <h3 className="font-bold text-slate-800 mb-3">Moderator Actions</h3>

              {order.status === 'payment_received' && (
                <button
                  onClick={handleApproveOrder}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Order
                </button>
              )}

              {order.status === 'approved' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('preparing_product')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    Start Preparing Product
                  </button>
                </>
              )}

              {order.status === 'preparing_product' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload Product Preparation Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductPhotoUpload}
                      className="w-full"
                      disabled={uploading}
                    />
                    {order.product_preparation_photo_url && (
                      <a
                        href={order.product_preparation_photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm mt-2 inline-block"
                      >
                        View uploaded photo
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleStatusUpdate('ready_for_dispatch')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Mark Ready for Dispatch
                  </button>
                </>
              )}

              {order.status === 'ready_for_dispatch' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Courier Partner
                      </label>
                      <input
                        type="text"
                        value={trackingData.courier_partner}
                        onChange={(e) => setTrackingData(prev => ({ ...prev, courier_partner: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tracking ID
                      </label>
                      <input
                        type="text"
                        value={trackingData.tracking_id}
                        onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_id: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Dispatch Date
                      </label>
                      <input
                        type="date"
                        value={trackingData.dispatch_date}
                        onChange={(e) => setTrackingData(prev => ({ ...prev, dispatch_date: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={handleTrackingUpdate}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Update Tracking Details
                    </button>
                  </div>
                  <button
                    onClick={() => handleStatusUpdate('dispatched')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Mark as Dispatched
                  </button>
                </>
              )}

              {order.status === 'dispatched' && (
                <button
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark as Delivered
                </button>
              )}
            </div>
          )}

          {(order.courier_partner || order.tracking_id) && (
            <div className="bg-indigo-50 p-4 rounded-xl">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Information
              </h3>
              <div className="space-y-2 text-sm">
                {order.courier_partner && (
                  <div>
                    <span className="text-slate-600">Courier Partner:</span>
                    <p className="font-medium text-slate-800">{order.courier_partner}</p>
                  </div>
                )}
                {order.tracking_id && (
                  <div>
                    <span className="text-slate-600">Tracking ID:</span>
                    <p className="font-medium text-slate-800">{order.tracking_id}</p>
                  </div>
                )}
                {order.dispatch_date && (
                  <div>
                    <span className="text-slate-600">Dispatch Date:</span>
                    <p className="font-medium text-slate-800">
                      {new Date(order.dispatch_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <ActivityTimeline referenceId={order.id} referenceType="order" />
        </div>

        <div className="px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-600 text-white rounded-xl font-medium hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
