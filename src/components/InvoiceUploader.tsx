import React, { useState, useRef } from 'react';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { parseInvoice, InvoiceData } from '../lib/invoiceParser';
import { processUploadedFile } from '../lib/fileConverter';
import { useToast } from '../contexts/ToastContext';

interface InvoiceUploaderProps {
  onDataExtracted: (data: InvoiceData, file: File) => void;
  onCancel: () => void;
}

export function InvoiceUploader({ onDataExtracted, onCancel }: InvoiceUploaderProps) {
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/heic',
        'image/heif',
      ];

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isHeic = fileExtension === 'heic' || fileExtension === 'heif';

      if (!validTypes.includes(file.type) && !isHeic) {
        showToast('Please upload a PDF, JPG, PNG, or HEIC file', 'warning');
        return;
      }

      const processedFile = await processUploadedFile(file);
      setSelectedFile(processedFile);

      if (processedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(processedFile);
      } else {
        setPreview(null);
      }
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to process file: ${errorMessage}`, 'error');
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const invoiceData = await parseInvoice(selectedFile);
      onDataExtracted(invoiceData, selectedFile);
    } catch (error) {
      console.error('Invoice parsing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to process invoice: ${errorMessage}. Please try again or enter details manually.`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Invoice</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Upload your invoice (PDF, JPG, PNG, HEIC). We'll extract all details including GST.
          </p>

          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition ${
                dragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-500 bg-gray-50'
              }`}
            >
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {dragActive
                    ? 'Drop your invoice here'
                    : 'Drag & drop invoice or click to upload'}
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG, HEIC up to 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Invoice preview"
                    className="w-full h-64 object-contain rounded-lg border border-gray-300 bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      setPreview(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative p-8 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-4">
                    <FileText className="w-12 h-12 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setSelectedFile(null);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {processing && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Processing invoice...
                      </p>
                      <p className="text-xs text-green-700">
                        Extracting GST details and invoice data
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing || !selectedFile}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Process Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
