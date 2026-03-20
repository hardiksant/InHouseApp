export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Digital Marketing': [
    'facebook',
    'meta',
    'facebook ads',
    'google ads',
    'instagram',
    'linkedin ads',
    'twitter ads',
    'advertising',
  ],
  'Software / SaaS': [
    'openai',
    'chatgpt',
    'canva',
    'adobe',
    'microsoft',
    'zoom',
    'slack',
    'notion',
    'software',
    'subscription',
    'saas',
  ],
  'Hosting & Domains': [
    'godaddy',
    'namecheap',
    'hostinger',
    'cloudflare',
    'aws',
    'azure',
    'digitalocean',
    'hosting',
    'domain',
  ],
  'Courier / Shipping': [
    'dtdc',
    'bluedart',
    'delhivery',
    'courier',
    'shipping',
    'fedex',
    'dhl',
    'delivery',
  ],
  'Telecom': [
    'wifi bill',
    'mobile bill',
    'airtel',
    'jio',
    'vodafone',
    'bsnl',
    'telecom',
    'internet',
    'broadband',
  ],
  'Utilities': [
    'electricity',
    'power bill',
    'water bill',
    'gas bill',
    'utility',
  ],
  'Travel': [
    'food',
    'hotel stay',
    'fuel',
    'petrol',
    'taxi',
    'uber',
    'ola',
    'flight',
    'train',
    'restaurant',
    'dining',
  ],
  'Office Supplies': [
    'amazon',
    'flipkart',
    'stationery',
    'printing',
    'paper',
    'office',
    'supplies',
  ],
  'Subscriptions': [
    'indiamart',
    'online service',
    'monthly',
    'yearly',
    'membership',
  ],
};

export function detectCategory(vendorName: string, description: string): string {
  const searchText = `${vendorName} ${description}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return 'Miscellaneous';
}
