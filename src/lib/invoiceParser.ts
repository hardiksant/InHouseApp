import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { detectCategory } from './categoryMatcher';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface InvoiceData {
  company_name?: string;
  company_gstin?: string;
  vendor_name?: string;
  vendor_gstin?: string;
  invoice_number?: string;
  invoice_date?: string;
  description?: string;
  taxable_amount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  gst_total?: number;
  total_amount?: number;
  category?: string;
  rawText: string;
}

const COMPANY_GSTIN = '08AAXFN0754D1Z1';
const COMPANY_NAME = 'Nepali Rudraksh wala Beads and mala llp';

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: (m) => console.log(m),
    });
    return text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function parseInvoice(file: File): Promise<InvoiceData> {
  try {
    let rawText = '';

    if (file.type === 'application/pdf') {
      rawText = await extractTextFromPDF(file);
    } else {
      rawText = await extractTextFromImage(file);
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    const invoiceData: InvoiceData = {
      rawText,
    };

  const gstins = extractAllGSTINs(rawText);
  assignGSTINs(invoiceData, gstins);

  invoiceData.company_name = COMPANY_NAME;

  invoiceData.vendor_name = extractVendorName(rawText);
  invoiceData.invoice_number = extractInvoiceNumber(rawText);
  invoiceData.invoice_date = extractInvoiceDate(rawText);
  invoiceData.description = extractDescription(rawText);

  const gstData = extractGSTDetails(rawText);
  invoiceData.cgst = gstData.cgst;
  invoiceData.sgst = gstData.sgst;
  invoiceData.igst = gstData.igst;
  invoiceData.gst_total = gstData.gst_total;
  invoiceData.taxable_amount = gstData.taxable_amount;
  invoiceData.total_amount = gstData.total_amount;

  if (invoiceData.vendor_name || invoiceData.description) {
    invoiceData.category = detectCategory(
      invoiceData.vendor_name || '',
      invoiceData.description || ''
    );
  }

  return invoiceData;
  } catch (error) {
    console.error('Invoice parsing error:', error);
    throw error;
  }
}

function extractVendorName(text: string): string | undefined {
  const lines = text.split('\n').filter(line => line.trim().length > 3);

  const vendorPatterns = [
    /([A-Za-z]+(?:MART|mart)[\s]+InterMESH[\s]+Ltd\.?)/i,
    /([A-Za-z]+(?:MART|mart))/i,
    /(?:from|seller|vendor|bill\s+from|issued\s+by)[\s:]+([A-Za-z\s&.,()]+(?:Pvt\.?\s*Ltd\.?|Limited|Inc\.?|LLC|LLP)?)/i,
    /^([A-Z][A-Za-z\s&.,()]+(?:Pvt\.?\s*Ltd\.?|Limited|Inc\.?|LLC|LLP))/m,
  ];

  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 3 && match[1].trim().length < 100) {
      return match[1].trim();
    }
  }

  for (const line of lines.slice(0, 10)) {
    if (line.length > 3 && line.length < 100 && /^[A-Z]/.test(line)) {
      const cleanLine = line.trim();
      if (!cleanLine.match(/^(TAX|INVOICE|BILL|RECEIPT|DATE|NUMBER|CUSTOMER)/i)) {
        return cleanLine;
      }
    }
  }

  return undefined;
}

function extractInvoiceNumber(text: string): string | undefined {
  const patterns = [
    /invoice\s*(?:no|number|#|num)?[\s:]+([A-Z0-9\-\/]+)/i,
    /bill\s*(?:no|number|#|num)?[\s:]+([A-Z0-9\-\/]+)/i,
    /inv\s*(?:no|number|#|num)?[\s:]+([A-Z0-9\-\/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length > 2 && match[1].length < 30) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractInvoiceDate(text: string): string | undefined {
  const datePatterns = [
    /(?:invoice\s+date|bill\s+date|date)[\s:]+(\d{1,2}[\/\-.]?\d{1,2}[\/\-.]?\d{2,4})/i,
    /(\d{1,2}[\/\-.]?\d{1,2}[\/\-.]?\d{2,4})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseDate(match[1]);
    }
  }

  return undefined;
}

function extractDescription(text: string): string | undefined {
  const patterns = [
    /Description[\s\S]*?1[\s]+([^\n]+?)(?:\s+Taxable|\s+\d+,|\s+₹|\s+Rs)/i,
    /(?:description|particulars|items?)[\s:]+([^\n]{10,200})/i,
    /(?:for|service|product)[\s:]+([^\n]{10,200})/i,
    /S\.No\.?\s+Description\s+.*?\n\s*1\s+([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const description = match[1].trim();
      if (description.length > 3 && description.length < 200) {
        return description;
      }
    }
  }

  const lines = text.split('\n').filter(line => line.length > 10 && line.length < 200);
  if (lines.length > 2) {
    return lines[2].trim();
  }

  return undefined;
}

function extractGSTDetails(text: string): {
  cgst: number;
  sgst: number;
  igst: number;
  gst_total: number;
  taxable_amount: number;
  total_amount: number;
} {
  const result = {
    cgst: 0,
    sgst: 0,
    igst: 0,
    gst_total: 0,
    taxable_amount: 0,
    total_amount: 0,
  };

  const cgstMatch = text.match(/cgst[\s:@]*(\d+\.?\d*)%?[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i);
  if (cgstMatch) {
    result.cgst = parseFloat(cgstMatch[2].replace(/,/g, ''));
  }

  const sgstMatch = text.match(/sgst[\s:@]*(\d+\.?\d*)%?[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i);
  if (sgstMatch) {
    result.sgst = parseFloat(sgstMatch[2].replace(/,/g, ''));
  }

  const igstMatch = text.match(/(?:igst|gst)[\s:@]*(\d+\.?\d*)%?[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i);
  if (igstMatch) {
    result.igst = parseFloat(igstMatch[2].replace(/,/g, ''));
  }

  result.gst_total = result.cgst + result.sgst + result.igst;

  const taxableMatch = text.match(/(?:taxable\s+amount|taxable\s+value|base\s+amount)[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i);
  if (taxableMatch) {
    result.taxable_amount = parseFloat(taxableMatch[1].replace(/,/g, ''));
  }

  const totalPatterns = [
    /(?:total\s+amount|grand\s+total|amount\s+payable|net\s+amount|final\s+amount)[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i,
    /Amount\s*\([₹₨]\)\s*([0-9,]+\.?\d{0,2})/i,
    /(?:total)[\s:]*(?:rs\.?|₹|inr)?[\s]*([0-9,]+\.?\d{0,2})/i,
  ];

  const amounts: number[] = [];
  for (const pattern of totalPatterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
      }
    }
  }

  if (amounts.length > 0) {
    result.total_amount = Math.max(...amounts);
  }

  if (result.total_amount === 0 && result.taxable_amount > 0 && result.gst_total > 0) {
    result.total_amount = result.taxable_amount + result.gst_total;
  }

  if (result.taxable_amount === 0 && result.total_amount > 0 && result.gst_total > 0) {
    result.taxable_amount = result.total_amount - result.gst_total;
  }

  return result;
}

function extractAllGSTINs(text: string): string[] {
  const gstinPattern = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/g;
  const matches = Array.from(text.matchAll(gstinPattern));
  return matches.map(match => match[1]);
}

function assignGSTINs(invoiceData: InvoiceData, gstins: string[]): void {
  if (gstins.length === 0) {
    return;
  }

  const companyGstinIndex = gstins.findIndex(gstin => gstin === COMPANY_GSTIN);

  if (companyGstinIndex !== -1) {
    invoiceData.company_gstin = COMPANY_GSTIN;
    const vendorGstins = gstins.filter(gstin => gstin !== COMPANY_GSTIN);
    if (vendorGstins.length > 0) {
      invoiceData.vendor_gstin = vendorGstins[0];
    }
  } else {
    invoiceData.vendor_gstin = gstins[0];
  }
}

function parseDate(dateString: string): string {
  try {
    const cleanDate = dateString.replace(/[^\d\/\-\.]/g, '');

    const ddmmyyyyMatch = cleanDate.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (ddmmyyyyMatch) {
      let day = parseInt(ddmmyyyyMatch[1]);
      let month = parseInt(ddmmyyyyMatch[2]);
      let year = parseInt(ddmmyyyyMatch[3]);

      if (year < 100) {
        year += 2000;
      }

      if (day > 12 && month <= 12) {
        const parsedDate = new Date(year, month - 1, day);
        return parsedDate.toISOString().split('T')[0];
      } else if (month > 12) {
        const parsedDate = new Date(year, day - 1, month);
        return parsedDate.toISOString().split('T')[0];
      } else {
        const parsedDate = new Date(year, month - 1, day);
        return parsedDate.toISOString().split('T')[0];
      }
    }

    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date().toISOString().split('T')[0];
  }
}
