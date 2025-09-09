import React, { createContext, useEffect, useState, ReactNode, FC } from 'react';
import http from '../services/http';
import { notifyError } from '../services/toast';
import { Role } from '../types/api-types';

interface AuthContextType {
  role?: Role;
  username?: string;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextType>({
  loading: true,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState<string>();
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me');
      // backend returns { username, role }
      setUsername(data?.username);
      setRole(data?.role as Role | undefined);
    } catch {
      setUsername(undefined);
      setRole(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    const onLogout = () => { setRole(undefined); setUsername(undefined); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (user: string, pass: string) => {
    try {
      await http.post('/api/auth/login', { username: user, password: pass });
      setLoading(true);
      await fetchMe();
    } catch (e:any) {
      notifyError(e?.response?.data?.error || e?.response?.data?.message || 'Login failed');
      throw e;
    }
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout'); } finally {
      setRole(undefined);
      setUsername(undefined);
    }
  };

  return (
    <AuthContext.Provider value={{ role, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
