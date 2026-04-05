export function shareOnWhatsApp(message: string, phone?: string) {
  const encodedMessage = encodeURIComponent(message);

  if (phone) {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  }
}

export function generateProductMessage(productName: string, description: string, imageUrl: string) {
  return `Check out this product!\n\n*${productName}*\n\n${description}\n\nView image: ${imageUrl}`;
}

export function generateCreativeMessage(creativeName: string, imageUrl: string) {
  return `Check out this creative!\n\n*${creativeName}*\n\nView: ${imageUrl}`;
}

export interface RudrakshaBeadDetails {
  mukhi: string;
  code: string;
  size_mm: number;
  weight_g: number;
  lab?: string;
  xray_report?: string;
  price: number;
}

export function generateBeadDetailsMessage(bead: RudrakshaBeadDetails): string {
  let message = `${bead.mukhi} - ${bead.code}\n`;
  message += `Size: ${bead.size_mm}mm\n`;
  message += `Weight: ${bead.weight_g}g\n`;

  if (bead.lab && bead.lab.trim()) {
    message += `Lab: ${bead.lab}\n`;
  }

  if (bead.xray_report && bead.xray_report.trim()) {
    message += `Certificate: ${bead.xray_report}\n`;
  }

  message += `Price: ₹${bead.price}`;

  return message;
}

export interface GeneralProductDetails {
  product_name: string;
  size?: string;
  material?: string;
  price: number;
}

export function generateGeneralProductMessage(product: GeneralProductDetails): string {
  let message = `${product.product_name}\n`;

  if (product.size && product.size.trim()) {
    message += `Size: ${product.size}\n`;
  }

  if (product.material && product.material.trim()) {
    message += `Material: ${product.material}\n`;
  }

  message += `Price: ₹${product.price}`;

  return message;
}
