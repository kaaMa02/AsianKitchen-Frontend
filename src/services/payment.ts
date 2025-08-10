import http from './http';
import type { PaymentIntentResponseDTO } from '../types/api-types';

export async function createIntentForCustomerOrder(orderId: string): Promise<PaymentIntentResponseDTO> {
  const { data } = await http.post<PaymentIntentResponseDTO>(`/api/payments/customer-orders/${orderId}/intent`);
  return data; // <-- return the DTO
}

export async function createIntentForBuffetOrder(orderId: string): Promise<PaymentIntentResponseDTO> {
  const { data } = await http.post<PaymentIntentResponseDTO>(`/api/payments/buffet-orders/${orderId}/intent`);
  return data; // <-- return the DTO
}
