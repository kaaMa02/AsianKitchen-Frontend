// src/contexts/AuthContext.tsx
import React, { createContext, useEffect, useState, ReactNode, FC } from 'react';
import http from '../services/http';
import { notifyError } from '../services/toast';
import { Role } from '../types/api-types';

interface AuthContextType {
  role?: Role;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextType>({ login: async () => {}, logout: async () => {} });

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [role, setRole] = useState<Role>();

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me');
      const r = (data?.roles?.[0] as string | undefined) ?? undefined;
      setRole(r as Role | undefined);
    } catch {
      setRole(undefined);
    }
  };

  useEffect(() => {
    fetchMe();
    const onLogout = () => setRole(undefined);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await http.post('/api/auth/login', { username, password });
      await fetchMe();
    } catch (e:any) {
      notifyError(e?.response?.data?.message || 'Login failed');
      throw e;
    }
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout'); } finally { setRole(undefined); }
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
