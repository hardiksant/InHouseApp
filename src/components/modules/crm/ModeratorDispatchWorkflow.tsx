import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Upload, Printer, Package, Truck, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  mobile_number: string;
  full_address: string;
  city: string;
  state: string;
  pin_code: string;
  product: string;
  product_amount: number;
  courier_charge: number;
  final_due: number;
  status: string;
  is_repeat_buyer: boolean;
  payment_screenshot_url: string;
  product_preparation_photo_url: string;
  packing_note: string;
  created_by_name: string;
  order_type: string;
  slip_printed_at: string;
  tracking_id: string;
  courier_partner: string;
  dispatch_date: string;
}

interface CourierPartner {
  id: string;
  name: string;
}

export function ModeratorDispatchWorkflow() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'packing' | 'dispatched'>('new');
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [packingOrders, setPackingOrders] = useState<Order[]>([]);
  const [dispatchedOrders, setDispatchedOrders] = useState<Order[]>([]);
  const [courierPartners, setCourierPartners] = useState<CourierPartner[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const [packingDetails, setPackingDetails] = useState<{
    [key: string]: {
      photo_url: string;
      note: string;
      uploading: boolean;
    };
  }>({});

  const [dispatchDetails, setDispatchDetails] = useState<{
    [key: string]: {
      courier_partner: string;
      tracking_id: string;
      dispatch_date: string;
    };
  }>({});

  useEffect(() => {
    fetchOrders();
    fetchCourierPartners();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: newData } = await supabase
        .from('order_book')
        .select('*')
        .eq('status', 'payment_received')
        .order('created_at', { ascending: false });

      const { data: packingData } = await supabase
        .from('order_book')
        .select('*')
        .in('status', ['approved', 'preparing_product', 'ready_for_dispatch'])
        .order('created_at', { ascending: false });

      const { data: dispatchedData } = await supabase
        .from('order_book')
        .select('*')
        .eq('status', 'dispatched')
        .order('dispatch_date', { ascending: false })
        .limit(50);

      setNewOrders(newData || []);
      setPackingOrders(packingData || []);
      setDispatchedOrders(dispatchedData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchCourierPartners = async () => {
    try {
      const { data } = await supabase
        .from('courier_partners')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCourierPartners(data || []);
    } catch (error) {
      console.error('Error fetching courier partners:', error);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('order_book')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_by_name: userProfile?.full_name,
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'approved',
        changed_by: user?.id,
        changed_by_name: userProfile?.full_name,
        notes: 'Order approved by moderator'
      });

      alert('Order approved successfully!');
      fetchOrders();
    } catch (error: any) {
      alert('Failed to approve order: ' + error.message);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('order_book')
        .update({ status: 'rejected' })
        .eq('id', orderId);

      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'rejected',
        changed_by: user?.id,
        changed_by_name: userProfile?.full_name,
        notes: `Rejected: ${reason}`
      });

      alert('Order rejected');
      fetchOrders();
    } catch (error: any) {
      alert('Failed to reject order: ' + error.message);
    }
  };

  const handlePackingPhotoUpload = async (orderId: string, file: File) => {
    setPackingDetails(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], uploading: true }
    }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `packing/${orderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(fileName);

      setPackingDetails(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          photo_url: publicUrl,
          uploading: false
        }
      }));
    } catch (error: any) {
      alert('Failed to upload photo: ' + error.message);
      setPackingDetails(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], uploading: false }
      }));
    }
  };

  const handleSavePackingDetails = async (orderId: string) => {
    const details = packingDetails[orderId];
    if (!details) return;

    try {
      const { error } = await supabase
        .from('order_book')
        .update({
          product_preparation_photo_url: details.photo_url,
          packing_note: details.note,
          status: 'ready_for_dispatch'
        })
        .eq('id', orderId);

      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'ready_for_dispatch',
        changed_by: user?.id,
        changed_by_name: userProfile?.full_name,
        notes: details.note || 'Ready for dispatch'
      });

      alert('Packing details saved!');
      fetchOrders();
    } catch (error: any) {
      alert('Failed to save packing details: ' + error.message);
    }
  };

  const handlePrintSlips = () => {
    if (selectedOrders.size === 0) {
      alert('Please select at least one order');
      return;
    }

    const ordersToPrint = packingOrders.filter(o => selectedOrders.has(o.id));
    printOrderSlips(ordersToPrint);

    supabase
      .from('order_book')
      .update({ slip_printed_at: new Date().toISOString() })
      .in('id', Array.from(selectedOrders));

    setSelectedOrders(new Set());
  };

  const printOrderSlips = (orders: Order[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const slipsHTML = orders.map(order => `
      <div class="slip">
        <div class="to-section">
          <strong>TO:</strong><br/>
          ${order.customer_name}<br/><br/>
          <strong>Address:</strong><br/>
          ${order.full_address}<br/>
          ${order.city}, ${order.state}<br/><br/>
          <strong>Pin:</strong> ${order.pin_code}<br/>
          <strong>Mo:</strong> ${order.mobile_number}
        </div>
        <div class="return-section">
          <strong>Return Address:</strong><br/>
          Nepali Rudraksh Wala<br/>
          FF/3/23 Housing Board Colony<br/>
          Near Water Tank<br/>
          Pratapgarh Rajasthan<br/>
          Pincode: 312605<br/>
          Mobile: 6376315465
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Slips</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .slip {
              width: 10cm;
              height: 9cm;
              border: 2px solid #000;
              padding: 8mm;
              margin: 5mm;
              float: left;
              box-sizing: border-box;
              page-break-inside: avoid;
              font-size: 11pt;
              line-height: 1.4;
            }
            .to-section {
              margin-bottom: 10mm;
            }
            .return-section {
              border-top: 1px solid #ccc;
              padding-top: 5mm;
              font-size: 9pt;
            }
            strong {
              font-weight: bold;
            }
            @media print {
              .slip {
                margin: 0;
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          ${slipsHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDispatchOrder = async (orderId: string) => {
    const details = dispatchDetails[orderId];
    if (!details || !details.courier_partner || !details.tracking_id || !details.dispatch_date) {
      alert('Please fill all dispatch details');
      return;
    }

    try {
      const { error } = await supabase
        .from('order_book')
        .update({
          status: 'dispatched',
          courier_partner: details.courier_partner,
          tracking_id: details.tracking_id,
          dispatch_date: details.dispatch_date
        })
        .eq('id', orderId);

      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'dispatched',
        changed_by: user?.id,
        changed_by_name: userProfile?.full_name,
        notes: `Dispatched via ${details.courier_partner}, Tracking: ${details.tracking_id}`
      });

      alert('Order dispatched successfully!');
      fetchOrders();
      setDispatchDetails(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    } catch (error: any) {
      alert('Failed to dispatch order: ' + error.message);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  if (userProfile?.role !== 'admin' && userProfile?.role !== 'moderator') {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">You do not have permission to access this section.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dispatch Workflow</h2>
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'new'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            New Orders ({newOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('packing')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'packing'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Packing / Ready ({packingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('dispatched')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'dispatched'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dispatched ({dispatchedOrders.length})
          </button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="space-y-4">
          {newOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No new orders</p>
          ) : (
            newOrders.map(order => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-600">Customer: {order.customer_name}</p>
                    {order.is_repeat_buyer && (
                      <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        Repeat Buyer
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Salesperson: {order.created_by_name}</p>
                    <p className="text-sm font-semibold text-gray-900">₹{order.final_due.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{order.order_type.toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Products:</p>
                    <p className="font-semibold">{order.product}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile:</p>
                    <p className="font-semibold">{order.mobile_number}</p>
                  </div>
                </div>

                {order.payment_screenshot_url && (
                  <div className="mb-4">
                    <a
                      href={order.payment_screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Payment Screenshot
                    </a>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveOrder(order.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectOrder(order.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'packing' && (
        <div>
          {selectedOrders.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-900">
                {selectedOrders.size} order(s) selected for printing
              </p>
              <button
                onClick={handlePrintSlips}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer className="w-5 h-5" />
                Print Selected Slips
              </button>
            </div>
          )}

          <div className="space-y-4">
            {packingOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No orders in packing</p>
            ) : (
              packingOrders.map(order => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                          <p className="text-sm text-gray-600">{order.customer_name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'ready_for_dispatch'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Preparation Photo
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePackingPhotoUpload(order.id, file);
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {packingDetails[order.id]?.photo_url && (
                          <p className="mt-1 text-sm text-green-600">Photo uploaded</p>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Packing Note
                        </label>
                        <textarea
                          value={packingDetails[order.id]?.note || ''}
                          onChange={(e) => setPackingDetails(prev => ({
                            ...prev,
                            [order.id]: { ...prev[order.id], note: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Add packing notes..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSavePackingDetails(order.id)}
                          disabled={!packingDetails[order.id]?.photo_url}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Package className="w-5 h-5" />
                          Mark Ready for Dispatch
                        </button>

                        {order.status === 'ready_for_dispatch' && (
                          <div className="flex-1 border-t pt-4 mt-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Dispatch Details</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Courier Partner *
                                </label>
                                <select
                                  value={dispatchDetails[order.id]?.courier_partner || ''}
                                  onChange={(e) => setDispatchDetails(prev => ({
                                    ...prev,
                                    [order.id]: { ...prev[order.id], courier_partner: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Courier</option>
                                  {courierPartners.map(cp => (
                                    <option key={cp.id} value={cp.name}>{cp.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tracking ID *
                                </label>
                                <input
                                  type="text"
                                  value={dispatchDetails[order.id]?.tracking_id || ''}
                                  onChange={(e) => setDispatchDetails(prev => ({
                                    ...prev,
                                    [order.id]: { ...prev[order.id], tracking_id: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter tracking ID"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Dispatch Date *
                                </label>
                                <input
                                  type="date"
                                  value={dispatchDetails[order.id]?.dispatch_date || ''}
                                  onChange={(e) => setDispatchDetails(prev => ({
                                    ...prev,
                                    [order.id]: { ...prev[order.id], dispatch_date: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleDispatchOrder(order.id)}
                              className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <Truck className="w-5 h-5" />
                              Mark as Dispatched
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'dispatched' && (
        <div className="space-y-4">
          {dispatchedOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No dispatched orders</p>
          ) : (
            dispatchedOrders.map(order => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    Dispatched
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Courier Partner:</p>
                    <p className="font-semibold">{order.courier_partner}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tracking ID:</p>
                    <p className="font-semibold">{order.tracking_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Dispatch Date:</p>
                    <p className="font-semibold">{new Date(order.dispatch_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
