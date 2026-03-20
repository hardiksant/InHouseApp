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
