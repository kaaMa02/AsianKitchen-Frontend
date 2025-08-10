import http from '../services/http';
import { AuthRequestDTO, RegisterRequestDTO, UserReadDTO } from '../types/api-types';

export const login = (body: AuthRequestDTO) =>
  http.post<{ token: string }>('api/auth/login', body);

export const register = (body: RegisterRequestDTO) =>
  http.post<UserReadDTO>('api/auth/register', body);
