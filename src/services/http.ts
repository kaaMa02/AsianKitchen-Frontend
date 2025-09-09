import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL =
  (process.env.REACT_APP_API_URL?.replace(/\/+$/, '') ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api.asian-kitchen.online'
      : 'http://localhost:8080'));

const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: 12000,
});

let bootstrapped = false;
export async function ensureCsrf() {
  if (bootstrapped) return;
  try {
    await http.get('/api/csrf', { withCredentials: true });
  } finally {
    bootstrapped = true;
  }
}

// Use InternalAxiosRequestConfig for Axios v1
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const m = (config.method ?? 'get').toLowerCase();
    if (m === 'post' || m === 'put' || m === 'patch' || m === 'delete') {
      await ensureCsrf();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default http;
