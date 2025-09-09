import { BuffetItemReadDTO, BuffetItemWriteDTO } from '../types/api-types';
import http from './http';

// Admin
export async function listAllBuffetItems(): Promise<BuffetItemReadDTO[]> {
  const { data } = await http.get<BuffetItemReadDTO[]>('/api/admin/buffet-items');
  return data;
}
export async function createBuffetItem(dto: BuffetItemWriteDTO): Promise<BuffetItemReadDTO> {
  const { data } = await http.post<BuffetItemReadDTO>('/api/admin/buffet-items', dto);
  return data;
}
export async function updateBuffetItem(id: string, dto: BuffetItemWriteDTO): Promise<BuffetItemReadDTO> {
  const { data } = await http.put<BuffetItemReadDTO>(`/api/admin/buffet-items/${id}`, dto);
  return data;
}
export async function deleteBuffetItem(id: string): Promise<void> {
  await http.delete(`/api/admin/buffet-items/${id}`);
}

// Public
export async function listAvailableBuffetItems(): Promise<BuffetItemReadDTO[]> {
  const { data } = await http.get<BuffetItemReadDTO[]>('/api/buffet-items');
  return data;
}

export async function listBuffetItems(): Promise<BuffetItemReadDTO[]> {
  const { data } = await http.get('/api/admin/buffet-items'); return data;
}