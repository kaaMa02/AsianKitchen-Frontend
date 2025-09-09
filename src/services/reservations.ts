import http from './http';
import { ensureCsrf } from './http';
import type {
  ReservationReadDTO,
  ReservationStatus,
  ReservationWriteDTO
} from '../types/api-types';

// Public create
export async function createReservation(dto: ReservationWriteDTO): Promise<ReservationReadDTO> {
  await ensureCsrf();
  const { data } = await http.post<ReservationReadDTO>('/api/reservations', dto);
  return data;
}

// Public: list by user
export async function listReservationsByUser(userId: string): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/reservations', { params: { userId } });
  return data;
}

// Public: track by id+email
export async function trackReservation(id: string, email: string): Promise<ReservationReadDTO> {
  const { data } = await http.get<ReservationReadDTO>(`/api/reservations/${id}/track`, { params: { email } });
  return data;
}

export async function listReservations(): Promise<ReservationReadDTO[]> {
  const { data } = await http.get<ReservationReadDTO[]>('/api/admin/reservations');
  return data;
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<ReservationReadDTO> {
  const { data } = await http.patch<ReservationReadDTO>(`/api/admin/reservations/${id}/status`, { status });
  return data;
}

export async function deleteReservation(id: string): Promise<void> {
  await http.delete(`/api/admin/reservations/${id}`);
}