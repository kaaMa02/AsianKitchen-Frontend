// services/http.ts
import axios from 'axios';

const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || window.location.origin,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: 12000,
});

let csrfBootstrapped = false;
export async function ensureCsrf() {
  if (csrfBootstrapped) return;
  await http.get('/api/csrf'); // sets the cookie
  csrfBootstrapped = true;
}

export default http;
