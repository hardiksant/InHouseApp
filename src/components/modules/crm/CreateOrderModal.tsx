import React from 'react';
import { CreateOrderForm } from './CreateOrderForm';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrderModal({ onClose, onSuccess }: CreateOrderModalProps) {
  return <CreateOrderForm onClose={onClose} onSuccess={onSuccess} />;
}
