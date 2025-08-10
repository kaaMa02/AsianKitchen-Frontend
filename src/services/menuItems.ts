import http from './http';
import { MenuItemDTO, MenuItemWriteDTO } from '../types/api-types';

// Admin
export async function listAllMenuItems(): Promise<MenuItemDTO[]> {
  const { data } = await http.get<MenuItemDTO[]>('/api/admin/menu-items');
  return data;
}
export async function getMenuItem(id: string): Promise<MenuItemDTO> {
  const { data } = await http.get<MenuItemDTO>(`/api/admin/menu-items/${id}`);
  return data;
}
export async function createMenuItem(dto: MenuItemWriteDTO): Promise<MenuItemDTO> {
  const { data } = await http.post<MenuItemDTO>('/api/admin/menu-items', dto);
  return data;
}
export async function updateMenuItem(id: string, dto: MenuItemWriteDTO): Promise<MenuItemDTO> {
  const { data } = await http.put<MenuItemDTO>(`/api/admin/menu-items/${id}`, dto);
  return data;
}
export async function deleteMenuItem(id: string): Promise<void> {
  await http.delete(`/api/admin/menu-items/${id}`);
}

// Public
export async function listAvailableMenuItems(): Promise<MenuItemDTO[]> {
  const { data } = await http.get<MenuItemDTO[]>('/api/menu-items');
  return data;
}
