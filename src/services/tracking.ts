import http from "./http";
import type { CustomerOrderReadDTO, BuffetOrderReadDTO } from "../types/api-types";

/** Track a regular menu order (public) */
export async function trackMenuOrder(orderId: string, email: string): Promise<CustomerOrderReadDTO> {
  const { data } = await http.get<CustomerOrderReadDTO>(`/api/orders/${orderId}/track`, {
    params: { email },
  });
  return data;
}

/** Track a buffet order (public) */
export async function trackBuffetOrder(orderId: string, email: string): Promise<BuffetOrderReadDTO> {
  const { data } = await http.get<BuffetOrderReadDTO>(`/api/buffet-orders/${orderId}/track`, {
    params: { email },
  });
  return data;
}