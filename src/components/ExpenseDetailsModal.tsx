import React from 'react';
import { X, Download, FileText, Calendar, DollarSign, CreditCard, Tag, FileImage } from 'lucide-react';
import { Expense } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { useToast } from '../contexts/ToastContext';

interface ExpenseDetailsModalProps {
  expense: Expense;
  onClose: () => void;
}

export function ExpenseDetailsModal({ expense, onClose }: ExpenseDetailsModalProps) {
  const { showToast } = useToast();
  const hasAttachment = expense.bill_image || (expense as any).invoice_file;
  const attachmentUrl = expense.bill_image || (expense as any).invoice_file;

  const handleDownloadAttachment = async () => {
    if (!attachmentUrl) return;

    try {
      const response = await fetch(attachmentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const fileExtension = attachmentUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${expense.title.replace(/[^a-z0-9]/gi, '_')}_${expense.date}.${fileExtension}`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file. Please try again.', 'error');
    }
  };

  const isInvoiceExpense = (expense as any).invoice_number || (expense as any).vendor_name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Expense Details</h2>
              <p className="text-blue-100 text-sm">Complete expense information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                    <p className="text-lg font-bold text-gray-900 mt-1">{expense.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Date
                      </label>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Amount
                      </label>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatCurrency(parseFloat(expense.amount.toString()))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                      <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {expense.category}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Payment Method
                      </label>
                      <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold capitalize">
                        {expense.payment_method}
                      </span>
                    </div>
                  </div>

                  {expense.notes && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                      <p className="text-sm text-gray-700 mt-1 bg-white p-3 rounded-lg border border-gray-200">
                        {expense.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isInvoiceExpense && (
                <div className="bg-amber-50 rounded-xl p-5 border-2 border-amber-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Invoice Information
                  </h3>

                  <div className="space-y-3">
                    {(expense as any).vendor_name && (
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-600">Vendor:</span>
                        <span className="text-sm font-bold text-gray-900">{(expense as any).vendor_name}</span>
                      </div>
                    )}

                    {(expense as any).invoice_number && (
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-600">Invoice Number:</span>
                        <span className="text-sm font-bold text-gray-900">{(expense as any).invoice_number}</span>
                      </div>
                    )}

                    {(expense as any).invoice_date && (
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-600">Invoice Date:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {new Date((expense as any).invoice_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {(expense as any).vendor_gstin && (
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-600">Vendor GSTIN:</span>
                        <span className="text-sm font-mono text-gray-900">{(expense as any).vendor_gstin}</span>
                      </div>
                    )}

                    {(expense as any).description && (
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Description:</span>
                        <p className="text-sm text-gray-700 mt-1">{(expense as any).description}</p>
                      </div>
                    )}

                    {((expense as any).cgst || (expense as any).sgst || (expense as any).igst) && (
                      <div className="border-t border-amber-300 pt-3 mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">GST Breakdown</p>
                        <div className="space-y-2">
                          {(expense as any).taxable_amount && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Taxable Amount:</span>
                              <span className="font-semibold">{formatCurrency((expense as any).taxable_amount)}</span>
                            </div>
                          )}
                          {(expense as any).cgst > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">CGST:</span>
                              <span className="font-semibold">{formatCurrency((expense as any).cgst)}</span>
                            </div>
                          )}
                          {(expense as any).sgst > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">SGST:</span>
                              <span className="font-semibold">{formatCurrency((expense as any).sgst)}</span>
                            </div>
                          )}
                          {(expense as any).igst > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">IGST:</span>
                              <span className="font-semibold">{formatCurrency((expense as any).igst)}</span>
                            </div>
                          )}
                          {(expense as any).gst_total > 0 && (
                            <div className="flex justify-between text-sm font-bold border-t border-amber-300 pt-2">
                              <span className="text-gray-900">Total GST:</span>
                              <span className="text-amber-700">{formatCurrency((expense as any).gst_total)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(expense as any).is_recurring && (
                <div className="bg-purple-50 rounded-xl p-5 border-2 border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-600" />
                    Recurring Expense
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-600">Vendor:</span>
                      <span className="text-sm font-bold text-gray-900">{(expense as any).recurring_vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-600">Frequency:</span>
                      <span className="text-sm font-bold text-purple-700 capitalize">{(expense as any).recurring_frequency}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {hasAttachment && (
                <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-blue-600" />
                      Attachment
                    </h3>
                    <button
                      onClick={handleDownloadAttachment}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                    {attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="p-8 text-center">
                        <FileText className="w-16 h-16 text-red-500 mx-auto mb-3" />
                        <p className="font-semibold text-gray-900 mb-2">PDF Document</p>
                        <p className="text-sm text-gray-600 mb-4">Click download to view the PDF</p>
                        <button
                          onClick={handleDownloadAttachment}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                        >
                          Download PDF
                        </button>
                      </div>
                    ) : (
                      <img
                        src={attachmentUrl}
                        alt={expense.title}
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="18" fill="%23666" text-anchor="middle" dominant-baseline="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {!hasAttachment && (
                <div className="bg-gray-50 rounded-xl p-8 border-2 border-dashed border-gray-300 text-center">
                  <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No attachment available</p>
                  <p className="text-sm text-gray-500 mt-1">This expense was added without a bill image or PDF</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(expense.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expense ID:</span>
                    <span className="font-mono text-xs text-gray-700">{expense.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-bold shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
