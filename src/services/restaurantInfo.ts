import { RestaurantInfoReadDTO, RestaurantInfoWriteDTO } from '../types/api-types';
import http from './http';

export const getCurrentRestaurantInfo = async (): Promise<RestaurantInfoReadDTO> => {
  const { data } = await http.get<RestaurantInfoReadDTO>('/api/restaurant-info/current');
  return data;
};

// Admin (kept if you need CMS-style editing)
export const listRestaurantInfo = async () => (await http.get<RestaurantInfoReadDTO[]>('/api/admin/restaurant-info')).data;
export const getRestaurantInfo = async (id: string) => (await http.get<RestaurantInfoReadDTO>(`/api/admin/restaurant-info/${id}`)).data;
export const createRestaurantInfo = async (dto: RestaurantInfoWriteDTO) => (await http.post<RestaurantInfoReadDTO>('/api/admin/restaurant-info', dto)).data;
export const updateRestaurantInfo = async (id: string, dto: RestaurantInfoWriteDTO) => (await http.put<RestaurantInfoReadDTO>(`/api/admin/restaurant-info/${id}`, dto)).data;
export const deleteRestaurantInfo = async (id: string) => { await http.delete(`/api/admin/restaurant-info/${id}`); };
