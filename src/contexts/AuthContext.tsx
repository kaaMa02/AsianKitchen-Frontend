import React, { createContext, useContext, useEffect, useState } from 'react';
import http from '../services/http';
import { Role } from '../types/api-types';

export interface AuthContextType {
  role?: Role;
  username?: string;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  ready: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Map various backend role strings to your Role enum
function normalizeRole(raw?: string): Role | undefined {
  if (!raw) return undefined;
  const r = String(raw).toUpperCase();
  if (r === 'ADMIN' || r === 'ROLE_ADMIN') return Role.ADMIN;
  if (r === 'CUSTOMER' || r === 'ROLE_CUSTOMER' || r === 'USER' || r === 'ROLE_USER') return Role.CUSTOMER;
  return undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me', { withCredentials: true });
      setRole(normalizeRole(data?.role));
      setUsername(data?.username);
    } catch {
      setRole(undefined);
      setUsername(undefined);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    fetchMe();
    const onLogout = () => { setRole(undefined); setUsername(undefined); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (u: string, p: string) => {
    await http.post('/api/auth/login', { username: u, password: p }, { withCredentials: true });
    setReady(false);
    await fetchMe();
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout', undefined, { withCredentials: true }); }
    finally { setRole(undefined); setUsername(undefined); }
  };

  return (
    <AuthContext.Provider value={{ role, username, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
