import axios from 'axios';

const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || window.location.origin,
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

export default http;
