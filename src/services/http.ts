import axios from 'axios';
import { notifyError } from './toast';
import { logoutSilently } from './auth-helpers';

export const TOKEN_KEY = 'token'; // legacy; we won’t use it with cookies

const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || window.location.origin,
  withCredentials: true, // send/receive cookies
  xsrfCookieName: 'XSRF-TOKEN',        // must match Spring's cookie name
  xsrfHeaderName: 'X-XSRF-TOKEN',      // header Axios will send back
  timeout: 12000,
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) logoutSilently();
    if (status && status >= 500) notifyError('Server error. Please try again.');
    else if (!status) notifyError('Network error. Check your connection.');
    return Promise.reject(err);
  }
);

export default http;
