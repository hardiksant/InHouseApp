import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Tier1Recommendation, Tier3Recommendation, getMukhiBenefits, RASHI_MAPPINGS } from './astroRecommendation';

interface CustomerData {
  name: string;
  gender: string;
  dob?: string;
  rashi: string;
  problem: string;
  budgetPreference: string;
}

interface RecommendationData {
  tier1: Tier1Recommendation[];
  tier2: string;
  tier3: Tier3Recommendation[];
}

interface ConsultantInfo {
  name: string;
  phone: string;
}

interface InventoryBead {
  code: string;
  mukhi: string;
  size_mm: number;
  lab: string;
  status: string;
}

function drawWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  const radius = 40;

  doc.setDrawColor(184, 134, 11);
  doc.setFillColor(184, 134, 11);
  doc.setGState(doc.GState({ opacity: 0.06 }));

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    doc.circle(x, y, 8, 'F');
  }

  doc.circle(centerX, centerY, 15, 'S');
  doc.circle(centerX, centerY, 25, 'S');
  doc.circle(centerX, centerY, 35, 'S');

  doc.setGState(doc.GState({ opacity: 1.0 }));
}

function drawPremiumWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.setDrawColor(184, 134, 11);
  doc.setFillColor(184, 134, 11);
  doc.setGState(doc.GState({ opacity: 0.05 }));

  const layers = [20, 30, 40, 50];
  layers.forEach(radius => {
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      doc.circle(x, y, 3, 'F');
    }
  });

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = centerX + Math.cos(angle) * 15;
    const y1 = centerY + Math.sin(angle) * 15;
    const x2 = centerX + Math.cos(angle) * 55;
    const y2 = centerY + Math.sin(angle) * 55;
    doc.setLineWidth(0.5);
    doc.line(x1, y1, x2, y2);
  }

  doc.setGState(doc.GState({ opacity: 1.0 }));
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number, consultant: ConsultantInfo) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  doc.text(consultant.name, pageWidth / 2, pageHeight - 20, { align: 'center' });
  doc.text(consultant.phone, pageWidth / 2, pageHeight - 16, { align: 'center' });

  doc.setFontSize(7);
  doc.text('Nepali Rudraksh Wala Beads & Mala LLP', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Authentic Nepali Rudraksha Specialists', pageWidth / 2, pageHeight - 9, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.text('Recommendation Based on Traditional Vedic Rudraksha Principles', pageWidth / 2, pageHeight - 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 3, { align: 'center' });
}

function getPlanetForRashi(rashi: string): string {
  const mapping = RASHI_MAPPINGS.find(r => r.rashi === rashi);
  return mapping ? mapping.planet : 'Planetary Energy';
}

function getPlanetForMukhi(mukhi: string, rashi: string): string {
  const mukhiPlanetMap: Record<string, string> = {
    '1': 'Sun',
    '2': 'Moon',
    '3': 'Mars',
    '4': 'Mercury',
    '5': 'Jupiter',
    '6': 'Venus',
    '7': 'Saturn'
  };

  const rashiPlanet = getPlanetForRashi(rashi);
  const mapping = RASHI_MAPPINGS.find(r => r.rashi === rashi);

  if (mukhi === mapping?.primaryMukhi) {
    return rashiPlanet;
  }

  return mukhiPlanetMap[mukhi] || 'Universal';
}

function getBenefitForMukhi(mukhi: string): string {
  const benefits: Record<string, string> = {
    '1': 'Enhances leadership and confidence.',
    '2': 'Brings emotional balance and harmony.',
    '3': 'Boosts self-confidence and removes obstacles.',
    '4': 'Enhances communication and intellectual clarity.',
    '5': 'Promotes balance, peace, and spiritual wellbeing.',
    '6': 'Brings wisdom and family harmony.',
    '7': 'Supports prosperity and stability.'
  };

  return benefits[mukhi] || 'Spiritual and material benefits.';
}

export async function generateRecommendationPDF(
  customer: CustomerData,
  recommendations: RecommendationData,
  consultant: ConsultantInfo = { name: 'Consultant', phone: '+91-XXXXXXXXXX' },
  inventoryBeads: InventoryBead[] = []
): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);

  // PAGE 1: Customer Profile, Tier 1, Tier 2
  drawWatermark(doc, pageWidth, pageHeight);
  let yPos = 25;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Nepali Rudraksh Wala Beads & Mala LLP', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authentic Nepali Rudraksha Specialists', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ASTROLOGICAL RUDRAKSHA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.text('RECOMMENDATION REPORT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Based on Traditional Vedic Rudraksha Principles', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Customer Profile
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Customer Spiritual Profile', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const profileData = [
    ['Customer Name', customer.name],
    ['Date of Birth', customer.dob || 'Not provided'],
    ['Rashi', customer.rashi],
    ['Consultation Focus', customer.problem],
    ['Budget Preference', customer.budgetPreference],
    ['Report Date', new Date().toLocaleDateString('en-GB')]
  ];

  const tableStartY = yPos;
  const colWidth = contentWidth / 2;
  const rowHeight = 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.setFillColor(250, 245, 235);

  doc.line(margin, tableStartY, pageWidth - margin, tableStartY);
  doc.line(margin, tableStartY, margin, tableStartY + (rowHeight * profileData.length));
  doc.line(margin + colWidth, tableStartY, margin + colWidth, tableStartY + (rowHeight * profileData.length));
  doc.line(pageWidth - margin, tableStartY, pageWidth - margin, tableStartY + (rowHeight * profileData.length));

  profileData.forEach((row, index) => {
    const currentY = tableStartY + (index * rowHeight);

    if (index % 2 === 0) {
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(row[0], margin + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(row[1], margin + colWidth + 2, currentY + 5);

    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
  });

  yPos = tableStartY + (rowHeight * profileData.length);

  yPos += 8;

  // Spiritual Analysis
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Spiritual Analysis', margin, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);

  const planet = getPlanetForRashi(customer.rashi);
  const analysisText = `Based on your ${customer.rashi} Rashi, the ruling planet influencing your life energy is ${planet}. Strengthening this planetary energy through Rudraksha can support emotional balance, clarity of thought, and stability in important areas of life.\n\nTo create spiritual harmony, a balanced combination of Rudraksha beads has been recommended through traditional Vedic Rudraksha principles.`;

  const analysisLines = doc.splitTextToSize(analysisText, contentWidth);
  doc.text(analysisLines, margin, yPos);
  yPos += (analysisLines.length * 4.5) + 8;

  // Tier 1 Recommendations
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Tier 1 - Basic Rudraksha Recommendation', margin, yPos);
  yPos += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('(Wear Any One Bead)', margin, yPos);
  yPos += 8;

  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 28;
  let xPos = margin;

  recommendations.tier1.forEach((rec) => {
    doc.setDrawColor(220, 180, 100);
    doc.setFillColor(255, 252, 245);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 69, 19);
    const beadName = `${rec.mukhi} Mukhi Rudraksha`;
    doc.text(beadName, xPos + cardWidth / 2, yPos + 5, { align: 'center' });

    const planet = getPlanetForMukhi(rec.mukhi, customer.rashi);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(`Planet: ${planet}`, xPos + cardWidth / 2, yPos + 10, { align: 'center' });

    const benefit = getBenefitForMukhi(rec.mukhi);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const benefitText = `Benefit: ${benefit}`;
    const benefitLines = doc.splitTextToSize(benefitText, cardWidth - 6);
    doc.text(benefitLines, xPos + cardWidth / 2, yPos + 15, { align: 'center', maxWidth: cardWidth - 6 });

    xPos += cardWidth + 5;
  });

  yPos += cardHeight + 10;

  // Tier 2 Kavach
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Tier 2 - Rudraksha Kavach', margin, yPos);
  yPos += 8;

  const tier2Parts = recommendations.tier2.replace(' Mukhi Kavach', '').split(' + ');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(184, 134, 11);

  if (tier2Parts.length >= 2) {
    const combinationText = tier2Parts.join(' + ') + ' Mukhi Kavach';
    doc.text(combinationText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 69, 19);
    doc.text('Rudraksha Kavach Combination', pageWidth / 2, yPos, { align: 'center' });
  } else {
    doc.text(recommendations.tier2, pageWidth / 2, yPos, { align: 'center' });
  }
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const kavachDesc = 'Wearing these three Rudraksha beads together creates a powerful spiritual combination known as a Rudraksha Kavach, enhancing the benefits of all recommended beads.';
  const kavachLines = doc.splitTextToSize(kavachDesc, contentWidth - 20);
  doc.text(kavachLines, pageWidth / 2, yPos, { align: 'center' });

  addFooter(doc, 1, 3, consultant);

  // PAGE 2: Premium Recommendations
  doc.addPage();
  drawPremiumWatermark(doc, pageWidth, pageHeight);
  yPos = 25;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Advanced Spiritual Rudraksha Recommendations', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Premium Rudraksha for Higher Spiritual Growth', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
  yPos += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const premiumIntroText = 'Higher Mukhi Rudraksha are rare sacred beads traditionally recommended for individuals seeking deeper spiritual growth, strong leadership energy, and life transformation. These beads carry powerful spiritual vibrations and are highly valued in Vedic traditions.';
  const premiumIntroLines = doc.splitTextToSize(premiumIntroText, contentWidth - 20);
  doc.text(premiumIntroLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += (premiumIntroLines.length * 4.5) + 10;

  if (recommendations.tier3.length > 0) {
    const primaryRec = recommendations.tier3[0];

    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 69, 19);
    doc.text('Primary Premium Recommendation', pageWidth / 2, yPos + 6, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(184, 134, 11);
    doc.text(`${primaryRec.mukhi} Mukhi Rudraksha`, pageWidth / 2, yPos + 16, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const primaryBenefit = getMukhiBenefits(primaryRec.mukhi);
    const primaryLines = doc.splitTextToSize(primaryBenefit, contentWidth - 15);
    doc.text(primaryLines, pageWidth / 2, yPos + 24, { align: 'center' });

    yPos += 42;
  }

  if (recommendations.tier3.length > 1) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 69, 19);
    doc.text('Additional Premium Options', margin, yPos);
    yPos += 8;

    const additionalRecs = recommendations.tier3.slice(1);
    const boxWidth = (contentWidth - 10) / 2;
    const boxHeight = 28;

    additionalRecs.forEach((rec, index) => {
      const xOffset = (index % 2) * (boxWidth + 10);
      const currentX = margin + xOffset;

      doc.setDrawColor(220, 180, 100);
      doc.setFillColor(255, 252, 245);
      doc.setLineWidth(0.5);
      doc.roundedRect(currentX, yPos, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 69, 19);
      doc.text(`${rec.mukhi} Mukhi Rudraksha`, currentX + boxWidth / 2, yPos + 8, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const benefit = getMukhiBenefits(rec.mukhi);
      const benefitLines = doc.splitTextToSize(benefit, boxWidth - 8);
      doc.text(benefitLines, currentX + boxWidth / 2, yPos + 15, { align: 'center', maxWidth: boxWidth - 8 });

      if (index % 2 === 1 || index === additionalRecs.length - 1) {
        yPos += boxHeight + 6;
      }
    });
  }

  addFooter(doc, 2, 3, consultant);

  // PAGE 3: Wearing Instructions & Guidance
  doc.addPage();
  drawPremiumWatermark(doc, pageWidth, pageHeight);
  yPos = 25;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Rudraksha Wearing & Spiritual Guidance', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Traditional Vedic Rudraksha Wearing Instructions', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos);
  yPos += 12;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Wearing Instructions', margin, yPos);
  yPos += 8;

  const wearingSteps = [
    {
      step: '1. Purification',
      text: 'Clean the Rudraksha using clean water or milk before wearing.'
    },
    {
      step: '2. Energization',
      text: 'Chant Om Namah Shivaya 108 times while holding the bead.'
    },
    {
      step: '3. Auspicious Day',
      text: 'The best day to wear Rudraksha is Monday morning after bath.'
    },
    {
      step: '4. Thread or Chain',
      text: 'Wear using silk thread, cotton thread, or gold/silver chain.'
    },
    {
      step: '5. Skin Contact',
      text: 'Ensure the bead touches your skin for maximum benefit.'
    },
    {
      step: '6. Regular Care',
      text: 'Clean occasionally with water and apply natural oil.'
    },
    {
      step: '7. Spiritual Respect',
      text: 'Maintain positive thoughts and offer regular prayers.'
    }
  ];

  wearingSteps.forEach((item) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 69, 19);
    doc.text(item.step, margin + 2, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const stepLines = doc.splitTextToSize(item.text, contentWidth - 4);
    doc.text(stepLines, margin + 2, yPos);
    yPos += (stepLines.length * 4.5) + 3;
  });

  yPos += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Spiritual Guidance', margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const guidanceText = 'Rudraksha beads are sacred seeds known for their spiritual and healing properties. When worn with faith and respect, they help balance planetary energies and support inner peace, clarity, and protection.\n\nThe recommendations in this report are based on traditional Vedic Rudraksha knowledge.';
  const guidanceLines = doc.splitTextToSize(guidanceText, contentWidth);
  doc.text(guidanceLines, margin, yPos);
  yPos += (guidanceLines.length * 4.5) + 10;

  doc.setFillColor(255, 250, 235);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, contentWidth, 26, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Authenticity Commitment', margin + 5, yPos + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const authenticityText = 'Nepali Rudraksh Wala Beads & Mala LLP provides natural and authentic Nepali Rudraksha beads sourced from the Himalayan region. Every recommendation is prepared based on traditional Rudraksha principles.';
  const authenticityLines = doc.splitTextToSize(authenticityText, contentWidth - 10);
  doc.text(authenticityLines, margin + 5, yPos + 11);

  yPos += 32;

  doc.setFillColor(245, 250, 255);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 30, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('Consultation Contact', margin + 5, yPos + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const contactText = 'For guidance on selecting your recommended Rudraksha, connect with your consultant.';
  const contactLines = doc.splitTextToSize(contactText, contentWidth - 60);
  doc.text(contactLines, margin + 5, yPos + 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text(consultant.name, margin + 5, yPos + 21);
  doc.text(consultant.phone, margin + 5, yPos + 26);

  const whatsappNumber = consultant.phone.replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hello%2C%20I%20would%20like%20to%20discuss%20my%20Rudraksha%20recommendation`;

  const qrSize = 24;
  const qrX = pageWidth - margin - qrSize - 8;
  const qrY = yPos + 3;

  try {
    const qrDataUrl = await QRCode.toDataURL(whatsappLink, {
      width: 200,
      margin: 1,
      color: {
        dark: '#8B4513',
        light: '#FFFFFF'
      }
    });

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Scan to connect with', qrX + qrSize / 2, qrY - 2, { align: 'center' });
    doc.text('your consultant', qrX + qrSize / 2, qrY - 5, { align: 'center' });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }

  addFooter(doc, 3, 3, consultant);

  return doc.output('blob');
}
