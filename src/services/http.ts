import axios, { InternalAxiosRequestConfig } from "axios";

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://api.asian-kitchen.online"
    : "http://localhost:8080");

const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 12000,
} as any);

// --- CSRF bootstrap + header injection (works cross-subdomain) ---
let bootstrapped = false;

function readCookie(name: string) {
  return decodeURIComponent(
    document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] || ""
  );
}

export async function ensureCsrf() {
  if (bootstrapped) return;
  try {
    // hit the endpoint so Spring drops the XSRF-TOKEN cookie for .asian-kitchen.online
    await http.get("/api/csrf", { withCredentials: true });
    const token = readCookie("XSRF-TOKEN");
    if (token) {
      http.defaults.headers.common["X-XSRF-TOKEN"] = token;
    }
  } finally {
    bootstrapped = true;
  }
}

http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const m = (config.method || "get").toLowerCase();
    if (m !== "get" && m !== "head" && m !== "options") {
      await ensureCsrf();
      // safety: if default header wasn’t set yet, inject per-request
      const token = readCookie("XSRF-TOKEN");
      if (token) (config.headers as any)["X-XSRF-TOKEN"] = token;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

export default http;
