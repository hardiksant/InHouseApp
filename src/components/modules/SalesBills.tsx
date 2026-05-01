import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Download, Eye, Search, X, Filter, ArrowLeft } from 'lucide-react';
import { SalesBillsHeader } from './SalesBillsHeader';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReportIssueButton from '../ReportIssueButton';
import { getCompanySettings, type CompanySettings } from '../../lib/companySettings';
import { useToast } from '../../contexts/ToastContext';

interface SalesBill {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  product_name: string;
  quantity: number;
  price: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  created_at: string;
}

const MONTHS = [
  'All Months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function SalesBills() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin, isModerator } = useAuth();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [previewBill, setPreviewBill] = useState<SalesBill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    product_name: '',
    quantity: 1,
    price: 0,
    gst_percent: 18
  });

  useEffect(() => {
    fetchBills();
    loadCompanySettings();
  }, [user]);

  const loadCompanySettings = async () => {
    if (!user) return;
    const settings = await getCompanySettings(user.id);
    setCompanySettings(settings);
  };

  const fetchBills = async () => {
    if (!user) return;

    let query = supabase
      .from('sales_bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('created_by', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setBills(data);
    }
  };

  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const unique = Date.now().toString().slice(-6);
    return `INV-${year}${month}-${unique}`;
  };

  const calculateAmounts = () => {
    const subtotal = formData.quantity * formData.price;
    const gstAmount = (subtotal * formData.gst_percent) / 100;
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { gstAmount, total } = calculateAmounts();
      const billNumber = generateBillNumber();

      const { data, error } = await supabase
        .from('sales_bills')
        .insert({
          bill_number: billNumber,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_address: formData.customer_address,
          product_name: formData.product_name,
          quantity: formData.quantity,
          price: formData.price,
          gst_percent: formData.gst_percent,
          gst_amount: gstAmount,
          total_amount: total,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setBills([data, ...bills]);
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        product_name: '',
        quantity: 1,
        price: 0,
        gst_percent: 18
      });
      setShowForm(false);
      setPreviewBill(data);
      setShowPreview(true);
    } catch (error: any) {
      showToast('Failed to create bill: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = (bill: SalesBill) => {
    if (!companySettings) return;

    const subtotal = bill.quantity * bill.price;
    const currencySymbol = companySettings.currency_symbol;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${bill.bill_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .logo { max-width: 150px; max-height: 100px; margin: 0 auto 15px; }
          .company-name { font-size: 24px; font-weight: bold; color: #059669; margin: 10px 0; }
          .company-details { color: #666; font-size: 13px; margin: 5px 0; }
          .gstin { color: #666; font-size: 14px; font-weight: bold; }
          .invoice-details { margin: 30px 0; display: flex; justify-content: space-between; }
          .section-title { font-weight: bold; color: #059669; margin-bottom: 10px; font-size: 16px; }
          .customer-info { margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px; }
          .customer-info div { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #d1d5db; }
          th { background: #10b981; color: white; }
          .totals { margin-top: 30px; }
          .total-row { display: flex; justify-content: flex-end; padding: 8px 0; }
          .total-label { width: 200px; font-weight: bold; text-align: right; padding-right: 20px; }
          .total-value { width: 150px; text-align: right; }
          .grand-total { font-size: 18px; color: #059669; border-top: 2px solid #10b981; padding-top: 10px; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${companySettings.company_logo ? `<img src="${companySettings.company_logo}" alt="Company Logo" class="logo" />` : ''}
          <div class="company-name">${companySettings.company_name}</div>
          ${companySettings.company_address ? `<div class="company-details">${companySettings.company_address}</div>` : ''}
          ${companySettings.company_phone ? `<div class="company-details">Phone: ${companySettings.company_phone}</div>` : ''}
          ${companySettings.company_email ? `<div class="company-details">Email: ${companySettings.company_email}</div>` : ''}
          <div class="gstin">GSTIN: ${companySettings.company_gstin}</div>
        </div>

        <div class="invoice-details">
          <div><strong>Invoice Number:</strong> ${bill.bill_number}</div>
          <div><strong>Date:</strong> ${new Date(bill.created_at).toLocaleDateString()}</div>
        </div>

        <div class="customer-info">
          <div class="section-title">Customer Details</div>
          <div><strong>Name:</strong> ${bill.customer_name}</div>
          <div><strong>Phone:</strong> ${bill.customer_phone}</div>
          <div><strong>Address:</strong> ${bill.customer_address}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${bill.product_name}</td>
              <td>${bill.quantity}</td>
              <td>${currencySymbol}${bill.price.toFixed(2)}</td>
              <td>${currencySymbol}${subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-value">${currencySymbol}${subtotal.toFixed(2)}</div>
          </div>
          <div class="total-row">
            <div class="total-label">GST (${bill.gst_percent}%):</div>
            <div class="total-value">${currencySymbol}${bill.gst_amount.toFixed(2)}</div>
          </div>
          <div class="total-row grand-total">
            <div class="total-label">Total Amount:</div>
            <div class="total-value">${currencySymbol}${bill.total_amount.toFixed(2)}</div>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>${companySettings.company_name}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to download the invoice', 'warning');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch =
      bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedMonth === 'All Months') return true;

    const billDate = new Date(bill.created_at);
    const monthIndex = MONTHS.indexOf(selectedMonth) - 1;
    return billDate.getMonth() === monthIndex;
  });

  const { subtotal, gstAmount, total } = calculateAmounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <SalesBillsHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Sales Bills</h1>
            <p className="text-lg text-slate-600">
              Generate invoices and manage sales
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Generate Bill
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, phone, bill number, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white cursor-pointer"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Bill Number</th>
                  <th className="px-6 py-4 text-left font-semibold">Customer</th>
                  <th className="px-6 py-4 text-left font-semibold">Product</th>
                  <th className="px-6 py-4 text-left font-semibold">Date</th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No bills found. Create your first invoice!</p>
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-green-50 transition">
                      <td className="px-6 py-4 font-medium text-green-700">{bill.bill_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{bill.customer_name}</div>
                        <div className="text-sm text-slate-500">{bill.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{bill.product_name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-700">
                        {companySettings?.currency_symbol || '₹'}{bill.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setPreviewBill(bill);
                              setShowPreview(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Preview"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(bill)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Generate Sales Bill</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {companySettings && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h3 className="font-bold text-green-900 mb-2">Company Information</h3>
                  <p className="text-sm text-green-800">{companySettings.company_name}</p>
                  <p className="text-sm text-green-700">GSTIN: {companySettings.company_gstin}</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Customer Details</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Address *
                  </label>
                  <textarea
                    required
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Product Details</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      GST (%) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.gst_percent}
                      onChange={(e) => setFormData({ ...formData, gst_percent: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">GST ({formData.gst_percent}%):</span>
                  <span className="font-semibold">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-300 mt-2 pt-2">
                  <span className="text-lg font-bold text-green-700">Total Amount:</span>
                  <span className="text-lg font-bold text-green-700">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && previewBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold">Invoice Preview</h2>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
              {companySettings && (
                <div className="text-center mb-8 border-b-2 border-green-600 pb-6">
                  {companySettings.company_logo && (
                    <img
                      src={companySettings.company_logo}
                      alt="Company Logo"
                      className="w-24 h-24 mx-auto mb-4 object-contain"
                    />
                  )}
                  <h1 className="text-3xl font-bold text-green-700 mb-2">{companySettings.company_name}</h1>
                  {companySettings.company_address && (
                    <p className="text-sm text-slate-600 mb-1">{companySettings.company_address}</p>
                  )}
                  {companySettings.company_phone && (
                    <p className="text-sm text-slate-600 mb-1">Phone: {companySettings.company_phone}</p>
                  )}
                  {companySettings.company_email && (
                    <p className="text-sm text-slate-600 mb-1">Email: {companySettings.company_email}</p>
                  )}
                  <p className="text-slate-600 font-semibold mt-2">GSTIN: {companySettings.company_gstin}</p>
                </div>
              )}

              <div className="flex justify-between mb-6">
                <div>
                  <p className="font-bold text-slate-900">Invoice Number</p>
                  <p className="text-green-700">{previewBill.bill_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Date</p>
                  <p className="text-slate-600">{new Date(previewBill.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-xl mb-6">
                <h3 className="font-bold text-green-900 mb-3">Customer Details</h3>
                <p className="text-slate-800"><strong>Name:</strong> {previewBill.customer_name}</p>
                <p className="text-slate-800"><strong>Phone:</strong> {previewBill.customer_phone}</p>
                <p className="text-slate-800"><strong>Address:</strong> {previewBill.customer_address}</p>
              </div>

              <table className="w-full mb-6">
                <thead className="bg-green-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Product Name</th>
                    <th className="px-4 py-3 text-center">Quantity</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border border-slate-200">
                  <tr>
                    <td className="px-4 py-3 border-b">{previewBill.product_name}</td>
                    <td className="px-4 py-3 border-b text-center">{previewBill.quantity}</td>
                    <td className="px-4 py-3 border-b text-right">{companySettings?.currency_symbol || '₹'}{previewBill.price.toFixed(2)}</td>
                    <td className="px-4 py-3 border-b text-right">{companySettings?.currency_symbol || '₹'}{(previewBill.quantity * previewBill.price).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">{companySettings?.currency_symbol || '₹'}{(previewBill.quantity * previewBill.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">GST ({previewBill.gst_percent}%):</span>
                  <span className="font-semibold">{companySettings?.currency_symbol || '₹'}{previewBill.gst_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-green-600 mt-2 pt-2">
                  <span className="text-xl font-bold text-green-700">Total Amount:</span>
                  <span className="text-xl font-bold text-green-700">{companySettings?.currency_symbol || '₹'}{previewBill.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownloadPDF(previewBill)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ReportIssueButton moduleName="Sales Bills" />
    </div>
  );
}
