import http from './http';
import { ReservationReadDTO, ReservationWriteDTO, ReservationStatus } from '../types/api-types';

// Public
export async function createReservation(dto: ReservationWriteDTO): Promise<ReservationReadDTO> {
  const { data } = await http.post<ReservationReadDTO>('/api/reservations', dto);
  return data;
}
export async function getReservation(id: string): Promise<ReservationReadDTO> {
  const { data } = await http.get<ReservationReadDTO>(`/api/reservations/${id}`);
  return data;
}
export async function listReservationsByUser(userId: string): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/reservations', { params: { userId } });
  return data;
}
export async function updateReservationStatus(id: string, status: ReservationStatus): Promise<ReservationReadDTO> {
  const { data } = await http.patch<ReservationReadDTO>(`/api/reservations/${id}/status`, { status });
  return data;
}
export async function deleteReservation(id: string): Promise<void> {
  await http.delete(`/api/reservations/${id}`);
}

// Admin
export async function listAllReservations(): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/admin/reservations');
  return data;
}
export async function adminUpdateReservationStatus(id: string, status: ReservationStatus): Promise<ReservationReadDTO> {
  const { data } = await http.patch<ReservationReadDTO>(`/api/admin/reservations/${id}/status`, { status });
  return data;
}
export async function adminDeleteReservation(id: string): Promise<void> {
  await http.delete(`/api/admin/reservations/${id}`);
}
