import http from './http';

export function logoutSilently() {
  // clear any legacy token
  try { localStorage.removeItem('token'); } catch {}
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

export async function apiLogout() {
  try { await http.post('/api/auth/logout'); } finally { logoutSilently(); }
}
