// src/contexts/AuthContext.tsx
import React, { createContext, useEffect, useState, useContext } from 'react';
import http, { ensureCsrf } from '../services/http';

type Role = 'ROLE_ADMIN' | 'ROLE_CUSTOMER' | undefined;

type AuthContextType = {
  role?: Role;
  username?: string;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState<string>();

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me'); // expects { username, role }
      setRole(data?.role as Role);
      setUsername(data?.username as string);
    } catch {
      setRole(undefined);
      setUsername(undefined);
    }
  };

  useEffect(() => {
    fetchMe();
    const onLogout = () => { setRole(undefined); setUsername(undefined); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (username: string, password: string) => {
    // (after step #1 this is not required, but harmless and useful if you re-enable CSRF later)
    await ensureCsrf();
    await http.post('/api/auth/login', { username, password }); // Set-Cookie happens here
    await fetchMe(); // must succeed if cookie was stored
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout'); } finally {
      setRole(undefined);
      setUsername(undefined);
    }
  };

  return (
    <AuthContext.Provider value={{ role, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
