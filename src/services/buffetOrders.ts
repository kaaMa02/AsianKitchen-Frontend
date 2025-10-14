import http, { ensureCsrf } from './http';
import { BuffetOrderReadDTO, BuffetOrderWriteDTO, OrderStatus } from '../types/api-types';

// Public
export async function createBuffetOrder(dto: BuffetOrderWriteDTO): Promise<BuffetOrderReadDTO> {
  await ensureCsrf();
  const { data } = await http.post<BuffetOrderReadDTO>('/api/buffet-orders', dto);
  return data;
}
export async function getBuffetOrder(id: string): Promise<BuffetOrderReadDTO> {
  const { data } = await http.get<BuffetOrderReadDTO>(`/api/buffet-orders/${id}`);
  return data;
}
export async function listBuffetOrdersByUser(userId: string): Promise<BuffetOrderReadDTO[]> {
  const { data } = await http.get<BuffetOrderReadDTO[]>('/api/buffet-orders', { params: { userId } });
  return data;
}
export async function trackBuffetOrder(orderId: string, email: string) {
  const { data } = await http.get<BuffetOrderReadDTO>("/api/buffet-orders/track", {
    params: { orderId, email },
    withCredentials: false,
  });
  return data;
}

// Admin
export async function listAllBuffetOrders(): Promise<BuffetOrderReadDTO[]> {
  const { data } = await http.get<BuffetOrderReadDTO[]>('/api/admin/buffet-orders');
  return data;
}
export async function updateBuffetOrderStatus(id: string, status: OrderStatus): Promise<BuffetOrderReadDTO> {
  const { data } = await http.patch<BuffetOrderReadDTO>(`/api/admin/buffet-orders/${id}/status`, { status });
  return data;
}