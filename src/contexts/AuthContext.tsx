import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  ReactNode,
  FC,
} from 'react';
import http from '../services/http';
import { Role } from '../types/api-types';

export interface AuthContextType {
  username?: string;
  role?: Role;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  username: undefined,
  role: undefined,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [username, setUsername] = useState<string | undefined>();
  const [role,     setRole]     = useState<Role | undefined>();

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me'); // { username, role }
      setUsername(data?.username);
      setRole(data?.role as Role | undefined);
    } catch {
      setUsername(undefined);
      setRole(undefined);
    }
  };

  useEffect(() => {
    fetchMe();
    const onLogout = () => { setUsername(undefined); setRole(undefined); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (u: string, p: string) => {
    await http.post('/api/auth/login', { username: u, password: p });
    await fetchMe();
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout'); }
    finally { setUsername(undefined); setRole(undefined); }
  };

  return (
    <AuthContext.Provider value={{ username, role, isAdmin: role === Role.ADMIN, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Export a convenience hook
export const useAuth = () => useContext(AuthContext);
