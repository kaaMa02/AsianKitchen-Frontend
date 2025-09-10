import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * Base URL:
 * - In prod, defaults to Render API subdomain
 * - Locally, http://localhost:8080
 */
const API_URL =
  (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://api.asian-kitchen.online"
    : "http://localhost:8080");

/**
 * Single axios instance used everywhere.
 * withCredentials=true so cookies (AK_AUTH, XSRF-TOKEN) are sent.
 */
const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN", // for completeness (axios won't auto-add cross-site)
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 12000,
} as any);

/** Small cookie reader (works cross-subdomain when cookie domain is .asian-kitchen.online) */
function readCookie(name: string) {
  return decodeURIComponent(
    document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] || ""
  );
}

/**
 * Ensure the CSRF cookie is present and set a default header for convenience.
 * We keep the name `ensureCsrf` because other files already import it.
 */
let csrfInitInFlight: Promise<void> | null = null;

export async function ensureCsrf(force = false): Promise<void> {
  const current = readCookie("XSRF-TOKEN");

  if (current && !force) {
    // keep a default header up-to-date
    (http.defaults.headers as any).common["X-XSRF-TOKEN"] = current;
    return;
  }

  if (!csrfInitInFlight) {
    csrfInitInFlight = http
      .get("/api/csrf", { withCredentials: true })
      .then(() => {
        const token = readCookie("XSRF-TOKEN");
        if (token) {
          (http.defaults.headers as any).common["X-XSRF-TOKEN"] = token;
        }
      })
      .finally(() => {
        csrfInitInFlight = null;
      });
  }

  await csrfInitInFlight;
}

/** Optional alias if you ever used a different name elsewhere */
export const bootstrapCsrf = ensureCsrf;

/**
 * Request interceptor:
 * For write methods, ensure we have a fresh CSRF cookie and inject the header.
 */
http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const m = (config.method || "get").toLowerCase();
    const isWrite = !["get", "head", "options"].includes(m);

    if (isWrite) {
      await ensureCsrf(); // make sure cookie exists
      const token = readCookie("XSRF-TOKEN");
      if (token) (config.headers as any)["X-XSRF-TOKEN"] = token;
    }

    return config;
  },
  (err) => Promise.reject(err)
);

/**
 * Response interceptor:
 * If the server rotated/invalidated the CSRF token and we get a 403,
 * refresh the token once and retry the request automatically.
 */
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const cfg = error.config as (InternalAxiosRequestConfig & {
      _csrfRetry?: boolean;
    });

    if (status === 403 && cfg && !cfg._csrfRetry) {
      cfg._csrfRetry = true;
      await ensureCsrf(true); // force refresh
      const token = readCookie("XSRF-TOKEN");
      if (token) (cfg.headers as any)["X-XSRF-TOKEN"] = token;
      return http(cfg);
    }

    return Promise.reject(error);
  }
);

export default http;
