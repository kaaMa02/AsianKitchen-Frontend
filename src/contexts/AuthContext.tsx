// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import http from '../services/http';

export type Role = 'ROLE_ADMIN' | 'ROLE_CUSTOMER' | undefined;

type AuthContextType = {
  loading: boolean;        // <— important to avoid redirect before /me finishes
  role?: Role;
  username?: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshMe: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState<string | undefined>();

  const refreshMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me'); // { username, role }
      setUsername(data?.username);
      setRole(data?.role as Role);
    } catch {
      setUsername(undefined);
      setRole(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
    const onLogout = () => {
      setUsername(undefined);
      setRole(undefined);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (u: string, p: string) => {
    await http.post('/api/auth/login', { username: u, password: p }, { withCredentials: true });
    await refreshMe();
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout'); } finally {
      setUsername(undefined);
      setRole(undefined);
    }
  };

  return (
    <AuthContext.Provider value={{ loading, role, username, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}
