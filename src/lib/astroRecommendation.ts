export interface RashiMapping {
  rashi: string;
  planet: string;
  primaryMukhi: string;
}

export const RASHI_MAPPINGS: RashiMapping[] = [
  { rashi: 'Aries', planet: 'Mars', primaryMukhi: '3' },
  { rashi: 'Taurus', planet: 'Venus', primaryMukhi: '6' },
  { rashi: 'Gemini', planet: 'Mercury', primaryMukhi: '4' },
  { rashi: 'Cancer', planet: 'Moon', primaryMukhi: '2' },
  { rashi: 'Leo', planet: 'Sun', primaryMukhi: '1' },
  { rashi: 'Virgo', planet: 'Mercury', primaryMukhi: '4' },
  { rashi: 'Libra', planet: 'Venus', primaryMukhi: '6' },
  { rashi: 'Scorpio', planet: 'Mars', primaryMukhi: '3' },
  { rashi: 'Sagittarius', planet: 'Jupiter', primaryMukhi: '5' },
  { rashi: 'Capricorn', planet: 'Saturn', primaryMukhi: '7' },
  { rashi: 'Aquarius', planet: 'Saturn', primaryMukhi: '7' },
  { rashi: 'Pisces', planet: 'Jupiter', primaryMukhi: '5' }
];

export const PROBLEM_OPTIONS = [
  'General Wellbeing',
  'Finance',
  'Career',
  'Health',
  'Protection',
  'Relationship',
  'Mental Peace'
];

export const BUDGET_OPTIONS = ['Low', 'Medium', 'High'];

export const PREMIUM_MUKHIS = ['14', '15', '17', '21'];

export interface Tier1Recommendation {
  mukhi: string;
  purpose: string;
}

export interface Tier3Recommendation {
  mukhi: string;
  benefit: string;
}

export function getTier1Recommendations(rashi: string): Tier1Recommendation[] {
  const mapping = RASHI_MAPPINGS.find(m => m.rashi === rashi);
  const primaryMukhi = mapping?.primaryMukhi || '5';

  return [
    { mukhi: primaryMukhi, purpose: `Ruling planet (${mapping?.planet || 'Universal'})` },
    { mukhi: '5', purpose: 'Universal wellbeing and balance' },
    { mukhi: '7', purpose: 'Spiritual growth and prosperity' }
  ];
}

export function getTier2Kavach(rashi: string): string {
  const tier1 = getTier1Recommendations(rashi);
  const mukhis = tier1.map(t => t.mukhi);
  const uniqueMukhis = Array.from(new Set(mukhis)).sort((a, b) => parseInt(a) - parseInt(b));
  return uniqueMukhis.join(' + ') + ' Mukhi Kavach';
}

export function getTier3Recommendations(): Tier3Recommendation[] {
  return [
    { mukhi: '14', benefit: 'Divine intuition and foresight' },
    { mukhi: '15', benefit: 'Spiritual awakening and prosperity' },
    { mukhi: '17', benefit: 'Sudden wealth and abundance' },
    { mukhi: '21', benefit: 'Supreme power and fulfillment' }
  ];
}

export function getMukhiBenefits(mukhi: string): string {
  const benefits: Record<string, string> = {
    '1': 'Enhances concentration, confidence, and leadership qualities',
    '2': 'Brings harmony in relationships and emotional balance',
    '3': 'Removes past life karmas and boosts self-confidence',
    '4': 'Enhances knowledge, creativity, and communication',
    '5': 'Promotes overall health, peace, and prosperity',
    '6': 'Brings wisdom, willpower, and family harmony',
    '7': 'Attracts wealth, health, and spiritual growth',
    '12': 'Provides administrative abilities and radiance',
    '14': 'Awakens sixth sense and provides divine intuition',
    '15': 'Brings sudden wealth and spiritual awakening',
    '17': 'Fulfills desires and brings unexpected gains',
    '21': 'Grants all worldly desires and spiritual elevation'
  };

  return benefits[mukhi] || 'Provides spiritual and material benefits';
}

export function getWearingInstructions(): string {
  return `Wearing Instructions:

1. Purification: Clean the Rudraksha in clean water or milk

2. Energization: Chant "Om Namah Shivaya" 108 times while holding the bead

3. Wearing Time: Wear on Monday morning after bath

4. Thread: Use silk, cotton, or gold/silver chain

5. Touching Skin: The bead should touch your skin for maximum benefit

6. Maintenance: Clean regularly with water and oil occasionally

7. Remove When: During intimate moments and while visiting cemetery

8. Prayer: Offer regular prayers and maintain positive intentions`;
}
