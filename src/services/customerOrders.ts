import http, { ensureCsrf } from './http';
import { CustomerOrderReadDTO, CustomerOrderWriteDTO, OrderStatus } from '../types/api-types';

export async function createCustomerOrder(dto: CustomerOrderWriteDTO): Promise<CustomerOrderReadDTO> {
  await ensureCsrf();
  const { data } = await http.post<CustomerOrderReadDTO>('/api/orders', dto);
  return data;
}
export async function getCustomerOrder(id: string): Promise<CustomerOrderReadDTO> {
  const { data } = await http.get<CustomerOrderReadDTO>(`/api/orders/${id}`);
  return data;
}
export async function listCustomerOrdersByUser(userId: string): Promise<CustomerOrderReadDTO[]> {
  const { data } = await http.get<CustomerOrderReadDTO[]>('/api/orders', { params: { userId } });
  return data;
}
export async function trackCustomerOrder(orderId: string, email: string): Promise<CustomerOrderReadDTO> {
  const { data } = await http.get<CustomerOrderReadDTO>('/api/orders/track', { params: { orderId, email } });
  return data;
}

// Admin
export async function listAllCustomerOrders(): Promise<CustomerOrderReadDTO[]> {
  const { data } = await http.get<CustomerOrderReadDTO[]>('/api/admin/orders');
  return data;
}
export async function updateCustomerOrderStatus(id: string, status: OrderStatus): Promise<CustomerOrderReadDTO> {
  const { data } = await http.patch<CustomerOrderReadDTO>(`/api/admin/orders/${id}/status`, { status });
  return data;
}