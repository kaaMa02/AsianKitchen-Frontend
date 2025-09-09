import http from './http';
import { ensureCsrf } from './http';
import type {
  ReservationReadDTO,
  ReservationWriteDTO,
  ReservationStatus,
} from '../types/api-types';

// Public
export async function createReservation(dto: ReservationWriteDTO): Promise<ReservationReadDTO> {
  await ensureCsrf(); // CSRF is enforced on POST /api/reservations in your backend config
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

// “Admin-ish” (your controller exposes these at /api/reservations/*)
export async function listAllReservations(): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/reservations/all');
  return data;
}
export async function listPendingReservations(): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/reservations/pending');
  return data;
}