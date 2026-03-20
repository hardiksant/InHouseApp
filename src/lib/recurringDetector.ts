const RECURRING_VENDORS = [
  'facebook',
  'meta',
  'google ads',
  'google workspace',
  'airtel',
  'jio',
  'vodafone',
  'vi',
  'chatgpt',
  'openai',
  'canva',
  'notion',
  'netflix',
  'amazon prime',
  'spotify',
  'youtube premium',
  'microsoft 365',
  'adobe',
  'github',
  'aws',
  'azure',
  'digitalocean',
  'godaddy',
  'namecheap',
  'hostinger',
  'bluehost',
  'cloudflare',
  'slack',
  'zoom',
  'dropbox',
  'evernote',
  'grammarly',
];

const RECURRING_CATEGORIES = [
  'Subscription',
  'Software',
  'Internet',
  'Phone',
  'Advertising',
  'Marketing',
];

export interface RecurringAnalysis {
  isRecurring: boolean;
  vendor?: string;
  frequency?: 'monthly' | 'yearly' | 'unknown';
}

export function detectRecurringExpense(
  vendorName: string,
  category: string,
  description?: string
): RecurringAnalysis {
  const lowerVendor = vendorName.toLowerCase();
  const lowerDescription = (description || '').toLowerCase();
  const combinedText = `${lowerVendor} ${lowerDescription}`;

  for (const recurringVendor of RECURRING_VENDORS) {
    if (combinedText.includes(recurringVendor)) {
      return {
        isRecurring: true,
        vendor: vendorName,
        frequency: detectFrequency(combinedText),
      };
    }
  }

  if (RECURRING_CATEGORIES.includes(category)) {
    return {
      isRecurring: true,
      vendor: vendorName,
      frequency: detectFrequency(combinedText),
    };
  }

  if (
    combinedText.includes('subscription') ||
    combinedText.includes('monthly') ||
    combinedText.includes('yearly') ||
    combinedText.includes('annual') ||
    combinedText.includes('renewal')
  ) {
    return {
      isRecurring: true,
      vendor: vendorName,
      frequency: detectFrequency(combinedText),
    };
  }

  return {
    isRecurring: false,
  };
}

function detectFrequency(text: string): 'monthly' | 'yearly' | 'unknown' {
  if (text.includes('monthly') || text.includes('month')) {
    return 'monthly';
  }
  if (
    text.includes('yearly') ||
    text.includes('annual') ||
    text.includes('year')
  ) {
    return 'yearly';
  }
  return 'unknown';
}

export async function analyzeRecurringPatterns(
  expenses: any[]
): Promise<Map<string, RecurringAnalysis>> {
  const vendorFrequency = new Map<string, number>();

  expenses.forEach((expense) => {
    if (expense.vendor_name) {
      const count = vendorFrequency.get(expense.vendor_name) || 0;
      vendorFrequency.set(expense.vendor_name, count + 1);
    }
  });

  const recurringVendors = new Map<string, RecurringAnalysis>();

  vendorFrequency.forEach((count, vendor) => {
    if (count >= 2) {
      recurringVendors.set(vendor, {
        isRecurring: true,
        vendor,
        frequency: 'unknown',
      });
    }
  });

  return recurringVendors;
}
