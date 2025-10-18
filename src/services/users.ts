import http from "./http";
import {
  UserReadDTO,
  UserWriteDTO,
  AdminUserUpdateDTO,
  UserProfileUpdateDTO,
} from "../types/api-types";

// Admin
export async function listAllUsers(): Promise<UserReadDTO[]> {
  const { data } = await http.get<UserReadDTO[]>("/api/admin/users");
  return data;
}
export async function getUser(id: string): Promise<UserReadDTO> {
  const { data } = await http.get<UserReadDTO>(`/api/admin/users/${id}`);
  return data;
}
export async function createUser(dto: UserWriteDTO): Promise<UserReadDTO> {
  const { data } = await http.post<UserReadDTO>("/api/admin/users", dto);
  return data;
}
export async function updateUser(
  id: string,
  dto: AdminUserUpdateDTO
): Promise<UserReadDTO> {
  const { data } = await http.put<UserReadDTO>(`/api/admin/users/${id}`, dto);
  return data;
}
export async function deleteUser(id: string): Promise<void> {
  await http.delete(`/api/admin/users/${id}`);
}

// Public profile
export async function getMyProfile(id: string): Promise<UserReadDTO> {
  const { data } = await http.get<UserReadDTO>(`/api/users/${id}`);
  return data;
}
export async function updateMyProfile(
  id: string,
  dto: UserProfileUpdateDTO
): Promise<UserReadDTO> {
  const { data } = await http.put<UserReadDTO>(`/api/users/${id}/profile`, dto);
  return data;
}
