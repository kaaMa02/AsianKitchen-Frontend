import http from "../services/http";

// What backend returns from /api/auth/me
export type MeResponse = { username: string; role: string | null };

// Login (backend sets HttpOnly cookie; response includes username/role)
export async function login(username: string, password: string) {
  const { data } = await http.post<{ username: string; role: string; expiresInMs: number }>(
    '/api/auth/login',
    { username, password }
  );
  return data;
}

export async function logout() {
  await http.post('/api/auth/logout');
  // optional: nothing else, cookie is cleared by server
}

export async function me(): Promise<MeResponse | null> {
  try {
    const { data } = await http.get<MeResponse>('/api/auth/me');
    return data;
  } catch {
    return null;
  }
}

// Optional register passthrough if you were using it elsewhere
export async function register(body: { username: string; password: string; firstName: string; lastName: string; email?: string; phoneNumber?: string; }) {
  const { data } = await http.post('/api/auth/register', body);
  return data;
}
