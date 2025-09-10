// src/services/http.ts
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://api.asian-kitchen.online"
    : "http://localhost:8080");

/**
 * Single Axios instance used across the app.
 * withCredentials=true so the browser sends/receives cookies for the API host.
 */
const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 12000,
});

/**
 * CSRF bootstrap via JSON (NOT via document.cookie).
 * We read the token from GET /api/csrf response body and set it as default header.
 * Spring's CookieCsrfTokenRepository will also set the XSRF-TOKEN cookie on the API host.
 */
let csrfInitPromise: Promise<void> | null = null;

export async function ensureCsrf(): Promise<void> {
  if (!csrfInitPromise) {
    csrfInitPromise = http
      .get<{ token: string }>("/api/csrf")
      .then(({ data }) => {
        if (data?.token) {
          http.defaults.headers.common["X-XSRF-TOKEN"] = data.token;
        }
      })
      .catch(() => {
        // swallow – we'll try again on demand below
      });
  }
  return csrfInitPromise;
}

/**
 * Request interceptor:
 * For mutating methods, make sure we have an X-XSRF-TOKEN header
 * (fetching it first if needed).
 */
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = (config.method || "get").toLowerCase();
    const isMutating =
      method === "post" ||
      method === "put" ||
      method === "patch" ||
      method === "delete";

    if (isMutating) {
      // Ensure we’ve fetched /api/csrf at least once
      await ensureCsrf();

      // If for any reason the default wasn’t set, try once more and inject per request
      const headerName = "X-XSRF-TOKEN";
      const current = (config.headers as any)[headerName];
      const fallback = (http.defaults.headers.common as any)[headerName];

      if (!current && fallback) {
        (config.headers as any)[headerName] = fallback;
      }
    }

    return config;
  },
  (err) => Promise.reject(err)
);

/**
 * Response interceptor:
 * If a write fails with 403 due to a missing/invalid CSRF token, refresh once and retry.
 */
http.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError<any>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    const status = error.response?.status;
    const msg =
      (error.response?.data as any)?.message ||
      (error.response?.data as any)?.error ||
      "";

    const looksLikeCsrf =
      status === 403 &&
      typeof msg === "string" &&
      /csrf|xsrf|forgery/i.test(msg) &&
      !original?._retried;

    if (looksLikeCsrf && original) {
      original._retried = true;
      await ensureCsrf();
      // inject latest header before retry
      const token = (http.defaults.headers.common as any)["X-XSRF-TOKEN"];
      if (token) {
        (original.headers as any)["X-XSRF-TOKEN"] = token;
      }
      return http(original);
    }

    return Promise.reject(error);
  }
);

export default http;
