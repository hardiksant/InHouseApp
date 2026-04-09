import React, { useState, useEffect } from 'react';
import { supabase, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Upload, Loader2, CreditCard as Edit3, Camera, FileText, RefreshCw } from 'lucide-react';
import { ReceiptScanner } from './ReceiptScanner';
import { InvoiceUploader } from './InvoiceUploader';
import { ExtractedReceiptData } from '../lib/ocr';
import { InvoiceData } from '../lib/invoiceParser';
import { formatCurrency } from '../lib/currency';
import { detectRecurringExpense } from '../lib/recurringDetector';
import { convertHeicToJpg } from '../lib/fileConverter';

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editExpense?: any;
}

export function ExpenseForm({ onClose, onSuccess, editExpense }: ExpenseFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [entryMode, setEntryMode] = useState<'select' | 'manual' | 'scan' | 'invoice'>(
    editExpense ? 'manual' : 'select'
  );

  const [formData, setFormData] = useState({
    date: editExpense?.date || new Date().toISOString().split('T')[0],
    title: editExpense?.title || '',
    category: editExpense?.category || EXPENSE_CATEGORIES[0],
    amount: editExpense?.amount || '',
    payment_method: editExpense?.payment_method || PAYMENT_METHODS[0],
    notes: editExpense?.notes || '',
    company_name: editExpense?.company_name || '',
    company_gstin: editExpense?.company_gstin || '',
    vendor_name: editExpense?.vendor_name || '',
    vendor_gstin: editExpense?.vendor_gstin || '',
    invoice_number: editExpense?.invoice_number || '',
    invoice_date: editExpense?.invoice_date || '',
    description: editExpense?.description || '',
    taxable_amount: editExpense?.taxable_amount || '',
    cgst: editExpense?.cgst || '',
    sgst: editExpense?.sgst || '',
    igst: editExpense?.igst || '',
    gst_total: editExpense?.gst_total || '',
    total_amount: editExpense?.total_amount || '',
  });

  const [billImage, setBillImage] = useState<File | null>(null);
  const [existingBillImage, setExistingBillImage] = useState(editExpense?.bill_image || editExpense?.invoice_file || null);
  const [scannedData, setScannedData] = useState<ExtractedReceiptData | InvoiceData | null>(null);
  const [isInvoiceMode, setIsInvoiceMode] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editExpense?.is_recurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>(editExpense?.recurring_frequency || 'unknown');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (formData.vendor_name && formData.category) {
      const analysis = detectRecurringExpense(
        formData.vendor_name,
        formData.category,
        formData.description
      );
      setIsRecurring(analysis.isRecurring);
      if (analysis.frequency) {
        setRecurringFrequency(analysis.frequency);
      }
    }
  }, [formData.vendor_name, formData.category, formData.description]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];

      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        try {
          setUploading(true);
          file = await convertHeicToJpg(file);
        } catch (err) {
          console.error('HEIC conversion error:', err);
          setError('Failed to convert HEIC image. Please try a different format.');
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      setBillImage(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      let file = e.dataTransfer.files[0];

      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        try {
          setUploading(true);
          file = await convertHeicToJpg(file);
        } catch (err) {
          console.error('HEIC conversion error:', err);
          setError('Failed to convert HEIC image. Please try a different format.');
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      setBillImage(file);
    }
  };

  const uploadBillImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('expense-bills')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('expense-bills')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Failed to upload bill image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleReceiptScanned = (data: ExtractedReceiptData, imageFile: File) => {
    setScannedData(data);
    setBillImage(imageFile);
    setIsInvoiceMode(false);

    setFormData({
      ...formData,
      date: data.date || formData.date,
      title: data.title || formData.title,
      amount: data.amount?.toString() || formData.amount,
      notes: data.rawText ? `Scanned from receipt\n\n${data.rawText.substring(0, 200)}` : formData.notes,
    });

    setEntryMode('manual');
  };

  const handleInvoiceProcessed = (data: InvoiceData, file: File) => {
    setScannedData(data);
    setBillImage(file);
    setIsInvoiceMode(true);

    setFormData({
      ...formData,
      date: data.invoice_date || formData.date,
      title: data.vendor_name || data.description || formData.title,
      category: data.category || formData.category,
      amount: data.total_amount?.toString() || formData.amount,
      company_name: data.company_name || '',
      company_gstin: data.company_gstin || '',
      vendor_name: data.vendor_name || '',
      vendor_gstin: data.vendor_gstin || '',
      invoice_number: data.invoice_number || '',
      invoice_date: data.invoice_date || '',
      description: data.description || '',
      taxable_amount: data.taxable_amount?.toString() || '',
      cgst: data.cgst?.toString() || '',
      sgst: data.sgst?.toString() || '',
      igst: data.igst?.toString() || '',
      gst_total: data.gst_total?.toString() || '',
      total_amount: data.total_amount?.toString() || '',
    });

    setEntryMode('manual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let billImageUrl = existingBillImage;

      if (billImage) {
        billImageUrl = await uploadBillImage(billImage);
        if (!billImageUrl && billImage) {
          setLoading(false);
          return;
        }
      }

      const expenseData: any = {
        date: formData.date,
        title: formData.title,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        notes: formData.notes,
        added_by: editExpense?.added_by || user!.id,
      };

      if (isInvoiceMode || formData.vendor_name) {
        expenseData.company_name = formData.company_name || null;
        expenseData.company_gstin = formData.company_gstin || null;
        expenseData.vendor_name = formData.vendor_name || null;
        expenseData.vendor_gstin = formData.vendor_gstin || null;
        expenseData.invoice_number = formData.invoice_number || null;
        expenseData.invoice_date = formData.invoice_date || null;
        expenseData.description = formData.description || null;
        expenseData.taxable_amount = parseFloat(formData.taxable_amount) || 0;
        expenseData.cgst = parseFloat(formData.cgst) || 0;
        expenseData.sgst = parseFloat(formData.sgst) || 0;
        expenseData.igst = parseFloat(formData.igst) || 0;
        expenseData.gst_total = parseFloat(formData.gst_total) || 0;
        expenseData.total_amount = parseFloat(formData.total_amount) || parseFloat(formData.amount) || 0;
        expenseData.invoice_file = billImageUrl;
      } else {
        expenseData.bill_image = billImageUrl;
      }

      expenseData.is_recurring = isRecurring;
      if (isRecurring) {
        expenseData.recurring_vendor = formData.vendor_name || formData.title;
        expenseData.recurring_frequency = recurringFrequency;
      } else {
        expenseData.recurring_vendor = null;
        expenseData.recurring_frequency = null;
      }

      if (editExpense) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editExpense.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (entryMode === 'scan') {
    return (
      <ReceiptScanner
        onDataExtracted={handleReceiptScanned}
        onCancel={() => setEntryMode('select')}
      />
    );
  }

  if (entryMode === 'invoice') {
    return (
      <InvoiceUploader
        onDataExtracted={handleInvoiceProcessed}
        onCancel={() => setEntryMode('select')}
      />
    );
  }

  if (entryMode === 'select') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-gray-600 mb-6">Choose how you want to add your expense:</p>

            <div className="space-y-4">
              <button
                onClick={() => setEntryMode('invoice')}
                className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Upload Invoice PDF
                    </h3>
                    <p className="text-sm text-gray-600">
                      Upload PDF/image invoice with GST auto-extraction
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setEntryMode('scan')}
                className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition">
                    <Camera className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Scan Receipt Image
                    </h3>
                    <p className="text-sm text-gray-600">
                      Quick receipt scan for basic expenses
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setEntryMode('manual')}
                className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition">
                    <Edit3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Manual Entry
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter expense details manually
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            {scannedData && (
              <p className="text-sm text-green-600 mt-1">
                {isInvoiceMode
                  ? '✓ Invoice processed - Review GST details below'
                  : '✓ Receipt scanned - Review and edit details below'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Office printer paper"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isInvoiceMode && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Your company name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company GSTIN
                    </label>
                    <input
                      type="text"
                      value={formData.company_gstin}
                      onChange={(e) => setFormData({ ...formData, company_gstin: e.target.value })}
                      placeholder="Your company GST number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                      placeholder="Vendor/Supplier name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor GSTIN
                    </label>
                    <input
                      type="text"
                      value={formData.vendor_gstin}
                      onChange={(e) => setFormData({ ...formData, vendor_gstin: e.target.value })}
                      placeholder="Vendor GST number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="Invoice/Bill number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxable Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxable_amount}
                      onChange={(e) => setFormData({ ...formData, taxable_amount: e.target.value })}
                      placeholder="Base amount before tax"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CGST (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cgst}
                      onChange={(e) => setFormData({ ...formData, cgst: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SGST (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sgst}
                      onChange={(e) => setFormData({ ...formData, sgst: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IGST (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.igst}
                      onChange={(e) => setFormData({ ...formData, igst: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total GST (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gst_total}
                      onChange={(e) => setFormData({ ...formData, gst_total: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Invoice description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {isRecurring && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Recurring Expense Detected
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    This appears to be a recurring {recurringFrequency !== 'unknown' ? recurringFrequency : ''} expense.
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Mark as recurring</span>
                    </label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="unknown">Unknown frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional details about this expense..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice / Receipt Attachment {!isInvoiceMode && '(Recommended)'}
            </label>
            <div className="mt-2">
              {existingBillImage && !billImage && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Current attachment:</p>
                  {existingBillImage.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-300">
                      <FileText className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">PDF Invoice</p>
                        <a
                          href={existingBillImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View PDF
                        </a>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={existingBillImage}
                      alt="Bill"
                      className="max-w-xs h-32 object-cover rounded-lg border border-gray-300"
                    />
                  )}
                </div>
              )}
              {billImage && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Selected file:</p>
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-300">
                    {billImage.type === 'application/pdf' ? (
                      <FileText className="w-8 h-8 text-red-600" />
                    ) : (
                      <Upload className="w-8 h-8 text-green-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{billImage.name}</p>
                      <p className="text-xs text-gray-600">{(billImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                </div>
              )}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative ${dragActive ? 'bg-blue-50 border-blue-400' : ''}`}
              >
                <label className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}>
                  <div className="text-center">
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-sm text-gray-600">
                      {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG, HEIC up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,.heic,.heif"
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {(loading || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Uploading...' : loading ? 'Saving...' : editExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
