import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

interface ProductRow {
  id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
}

interface CreateOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrderForm({ onClose, onSuccess }: CreateOrderFormProps) {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [repeatBuyerDetected, setRepeatBuyerDetected] = useState(false);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customer_name: '',
    mobile_number: '',
    full_address: '',
    city: '',
    state: '',
    pin_code: '',
    order_type: 'prepaid',
    courier_charge: 0,
    advance_payment: 0,
    remark: '',
    payment_screenshot_url: ''
  });

  const [products, setProducts] = useState<ProductRow[]>([
    { id: crypto.randomUUID(), product_name: '', quantity: 1, price_per_unit: 0, subtotal: 0 }
  ]);

  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const calculateProductAmount = () => {
    return products.reduce((sum, product) => sum + product.subtotal, 0);
  };

  const calculateFinalDue = () => {
    const productAmount = calculateProductAmount();
    return productAmount + formData.courier_charge - formData.advance_payment;
  };

  const handleAddProduct = () => {
    setProducts([...products, {
      id: crypto.randomUUID(),
      product_name: '',
      quantity: 1,
      price_per_unit: 0,
      subtotal: 0
    }]);
  };

  const handleRemoveProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleProductChange = (id: string, field: keyof ProductRow, value: any) => {
    setProducts(products.map(product => {
      if (product.id === id) {
        const updated = { ...product, [field]: value };
        if (field === 'quantity' || field === 'price_per_unit') {
          updated.subtotal = updated.quantity * updated.price_per_unit;
        }
        return updated;
      }
      return product;
    }));
  };

  const parseAddress = (address: string) => {
    let mobile = '';
    let pincode = '';
    let cleanedAddress = address;

    const mobilePatterns = [
      /(?:Mo|Mobile|Phone|Contact|Ph)[\s:.-]*(\d{10})/gi,
      /\b(\d{10})\b/g
    ];

    for (const pattern of mobilePatterns) {
      const match = address.match(pattern);
      if (match) {
        const numbers = match[0].match(/\d{10}/);
        if (numbers) {
          mobile = numbers[0];
          cleanedAddress = cleanedAddress.replace(match[0], '').trim();
          break;
        }
      }
    }

    const pincodeMatch = address.match(/\b(\d{6})\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[1];
      cleanedAddress = cleanedAddress.replace(pincodeMatch[0], '').trim();
    }

    cleanedAddress = cleanedAddress
      .replace(/\s+/g, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .trim();

    return { mobile, pincode, cleanedAddress };
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, full_address: value }));

    if (value.length > 20) {
      const { mobile, pincode, cleanedAddress } = parseAddress(value);

      if (mobile && !formData.mobile_number) {
        setFormData(prev => ({ ...prev, mobile_number: mobile }));
      }
      if (pincode && !formData.pin_code) {
        setFormData(prev => ({ ...prev, pin_code: pincode }));
      }
      if (cleanedAddress !== value) {
        setFormData(prev => ({ ...prev, full_address: cleanedAddress }));
      }
    }
  };

  const checkRepeatBuyer = async () => {
    if (!formData.mobile_number && !formData.customer_name) return;

    try {
      let query = supabase
        .from('order_book')
        .select('*')
        .limit(5);

      if (formData.mobile_number) {
        query = query.eq('mobile_number', formData.mobile_number);
      } else if (formData.customer_name) {
        query = query.ilike('customer_name', `%${formData.customer_name}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setRepeatBuyerDetected(true);
        setPreviousOrders(data);
      } else {
        setRepeatBuyerDetected(false);
        setPreviousOrders([]);
      }
    } catch (error) {
      console.error('Error checking repeat buyer:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkRepeatBuyer();
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.mobile_number, formData.customer_name]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `payment-screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, payment_screenshot_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      showToast('Failed to upload screenshot', 'error');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productAmount = calculateProductAmount();
      const finalDue = calculateFinalDue();

      const orderNumber = `ORD-${Date.now()}`;

      const { data: orderData, error: orderError } = await supabase
        .from('order_book')
        .insert({
          order_number: orderNumber,
          customer_name: formData.customer_name,
          mobile_number: formData.mobile_number,
          full_address: formData.full_address,
          city: formData.city,
          state: formData.state,
          pin_code: formData.pin_code,
          product: products.map(p => p.product_name).join(', '),
          quantity: products.reduce((sum, p) => sum + p.quantity, 0),
          price: productAmount,
          order_type: formData.order_type,
          courier_charge: formData.courier_charge,
          product_amount: productAmount,
          advance_payment: formData.advance_payment,
          final_due: finalDue,
          remark: formData.remark,
          payment_screenshot_url: formData.payment_screenshot_url,
          status: 'payment_received',
          is_repeat_buyer: repeatBuyerDetected,
          created_by: user?.id,
          created_by_name: userProfile?.full_name || user?.email || 'Unknown'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const productsToInsert = products.map(product => ({
        order_id: orderData.id,
        product_name: product.product_name,
        quantity: product.quantity,
        price_per_unit: product.price_per_unit,
        subtotal: product.subtotal
      }));

      const { error: productsError } = await supabase
        .from('order_products')
        .insert(productsToInsert);

      if (productsError) throw productsError;

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderData.id,
          status: 'payment_received',
          changed_by: user?.id,
          changed_by_name: userProfile?.full_name || user?.email || 'Unknown',
          notes: 'Order created'
        });

      if (historyError) throw historyError;

      showToast('Order created successfully!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating order:', error);
      showToast('Failed to create order: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create New Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {repeatBuyerDetected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">Repeat Buyer Detected!</p>
                <p className="text-sm text-yellow-700">
                  This customer has {previousOrders.length} previous order(s).
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.full_address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Paste full address here. Mobile and pincode will be auto-detected."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code *</label>
                <input
                  type="text"
                  required
                  value={formData.pin_code}
                  onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
              <button
                type="button"
                onClick={handleAddProduct}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price per Unit</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subtotal</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-gray-200">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          required
                          value={product.product_name}
                          onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter product name"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          required
                          min="1"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(product.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={product.price_per_unit}
                          onChange={(e) => handleProductChange(product.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">₹{product.subtotal.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          disabled={products.length === 1}
                          className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Product Amount:</span>
                <span className="text-blue-600">₹{calculateProductAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Type *</label>
                <select
                  value={formData.order_type}
                  onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prepaid">Prepaid</option>
                  <option value="cod">COD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Courier Charge</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.courier_charge}
                  onChange={(e) => setFormData({ ...formData, courier_charge: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advance_payment}
                  onChange={(e) => setFormData({ ...formData, advance_payment: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  disabled={uploadingScreenshot}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Product Amount:</span>
                  <span className="font-semibold">₹{calculateProductAmount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Courier Charge:</span>
                  <span className="font-semibold">₹{formData.courier_charge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Advance Payment:</span>
                  <span className="font-semibold">- ₹{formData.advance_payment.toFixed(2)}</span>
                </div>
                <div className="h-px bg-blue-200 my-2"></div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Final Due:</span>
                  <span className="text-blue-600">₹{calculateFinalDue().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
            <textarea
              rows={3}
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingScreenshot}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
