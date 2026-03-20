import Tesseract from 'tesseract.js';

export interface ExtractedReceiptData {
  date?: string;
  amount?: number;
  title?: string;
  rawText: string;
}

export async function extractReceiptData(imageFile: File): Promise<ExtractedReceiptData> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => console.log(m),
    });

  const extractedData: ExtractedReceiptData = {
    rawText: text,
  };

  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.date = parseDate(match[0]);
      break;
    }
  }

  const amountPatterns = [
    /(?:total|amount|sum|Rs\.?|INR|₹)\s*:?\s*([0-9,]+\.?\d{0,2})/i,
    /₹\s*([0-9,]+\.?\d{0,2})/,
    /Rs\.?\s*([0-9,]+\.?\d{0,2})/i,
    /INR\s*([0-9,]+\.?\d{0,2})/i,
    /\b([0-9,]+\.\d{2})\b/,
  ];

  const amounts: number[] = [];
  for (const pattern of amountPatterns) {
    const matches = text.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const cleanAmount = match[1].replace(/,/g, '');
      const amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        amounts.push(amount);
      }
    }
  }

  if (amounts.length > 0) {
    extractedData.amount = Math.max(...amounts);
  }

  const lines = text.split('\n').filter(line => line.trim().length > 3);
  const merchantPatterns = [
    /^([A-Z][A-Za-z\s&]+(?:Store|Shop|Mart|Market|Restaurant|Cafe|Hotel|Ltd|Limited|Pvt))/i,
    /^([A-Z][A-Za-z\s&]{3,30})/,
  ];

  for (const line of lines.slice(0, 5)) {
    for (const pattern of merchantPatterns) {
      const match = line.match(pattern);
      if (match && match[1].length > 3 && match[1].length < 50) {
        extractedData.title = match[1].trim();
        break;
      }
    }
    if (extractedData.title) break;
  }

  if (!extractedData.title && lines.length > 0) {
    extractedData.title = lines[0].trim().substring(0, 50);
  }

  return extractedData;
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseDate(dateString: string): string {
  try {
    const cleanDate = dateString.trim();

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

    const monthNameMatch = cleanDate.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i);
    if (monthNameMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const day = parseInt(monthNameMatch[1]);
      const month = monthNames.indexOf(monthNameMatch[2].toLowerCase().substring(0, 3));
      let year = parseInt(monthNameMatch[3]);

      if (year < 100) {
        year += 2000;
      }

      const parsedDate = new Date(year, month, day);
      return parsedDate.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date().toISOString().split('T')[0];
  }
}
