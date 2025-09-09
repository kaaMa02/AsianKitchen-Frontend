import { FoodItemDTO } from '../types/api-types';
import http from './http';

// Admin
export async function listFoodItems(): Promise<FoodItemDTO[]> {
  const { data } = await http.get<FoodItemDTO[]>('/api/admin/food-items'); return data;
}
export async function getFoodItem(id: string): Promise<FoodItemDTO> {
  const { data } = await http.get<FoodItemDTO>(`/api/admin/food-items/${id}`); return data;
}
export async function createFoodItem(item: Omit<FoodItemDTO,'id'>): Promise<FoodItemDTO> {
  const { data } = await http.post<FoodItemDTO>('/api/admin/food-items', item); return data;
}
export async function updateFoodItem(id: string, item: Omit<FoodItemDTO,'id'>): Promise<FoodItemDTO> {
  const { data } = await http.put<FoodItemDTO>(`/api/admin/food-items/${id}`, item); return data;
}
export async function deleteFoodItem(id: string): Promise<void> {
  await http.delete(`/api/admin/food-items/${id}`);
}

// Public
export async function listPublicFoodItems(): Promise<FoodItemDTO[]> {
  const { data } = await http.get<FoodItemDTO[]>('/api/food-items'); return data;
}
export async function getPublicFoodItem(id: string): Promise<FoodItemDTO> {
  const { data } = await http.get<FoodItemDTO>(`/api/food-items/${id}`); return data;
}