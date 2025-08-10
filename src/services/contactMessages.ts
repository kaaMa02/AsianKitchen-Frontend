import { ContactMessageReadDTO, ContactMessageWriteDTO } from '../types/api-types';
import http from './http';

/** Public endpoint (matches your Flyway migration that created contact_messages) */
export const sendContactMessage = async (dto: ContactMessageWriteDTO): Promise<ContactMessageReadDTO> => {
  const { data } = await http.post<ContactMessageReadDTO>('/api/contact', dto);
  return data;
};

// Admin – list messages (optional, for dashboard)
export async function listContactMessages() {
  const { data } = await http.get<ContactMessageReadDTO[]>(
    '/api/admin/contact'
  );
  return data;
}