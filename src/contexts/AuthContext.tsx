import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  FC,
} from 'react';
import http from '../services/http';
import { notifyError } from '../services/toast';
import { Role } from '../types/api-types';

export interface AuthContextType {
  role?: Role;
  username?: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState<string>();

  const fetchMe = async () => {
    try {
      const { data } = await http.get('/api/auth/me', { withCredentials: true });
      setRole(data?.role as Role | undefined);
      setUsername(data?.username as string | undefined);
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

  const login = async (u: string, p: string) => {
    try {
      await http.post('/api/auth/login', { username: u, password: p }, { withCredentials: true });
      await fetchMe();
    } catch (e: any) {
      notifyError(e?.response?.data?.message || 'Login failed');
      throw e;
    }
  };

  const logout = async () => {
    try { await http.post('/api/auth/logout', undefined, { withCredentials: true }); }
    finally { setRole(undefined); setUsername(undefined); }
  };

  return (
    <AuthContext.Provider value={{ role, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Back-compat export so old imports don’t crash builds.
// (We still prefer using the useAuth() hook everywhere.)
export { AuthContext };
