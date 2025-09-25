import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/** -------- Base URL -------- */
const API_URL =
  (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production"
    ? "https://api.asian-kitchen.online"
    : "http://localhost:8080");

/** -------- Axios instance -------- */
const http = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send AK_AUTH + XSRF-TOKEN cookies
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 12000,
} as any);

/** -------- Cookie utils (RegExp.exec to satisfy Sonar) -------- */
function readCookie(name: string) {
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const m = re.exec(document.cookie);
  return decodeURIComponent(m?.[1] ?? "");
}

/** We tag our own CSRF bootstrap request to avoid recursion in interceptors */
type Cfg = InternalAxiosRequestConfig & {
  __skipCsrf?: boolean;
  _csrfRetry?: boolean;
};

/** -------- CSRF bootstrap -------- */
let csrfInitInFlight: Promise<void> | null = null;

export async function ensureCsrf(force = false): Promise<void> {
  const current = readCookie("XSRF-TOKEN");
  if (current && !force) {
    (http.defaults.headers as any).common["X-XSRF-TOKEN"] = current;
    return;
  }

  csrfInitInFlight ??= http
    .get("/api/csrf", {
      withCredentials: true,
      headers: { "X-REQUEST-CSRF-BOOT": "1" },
      __skipCsrf: true as any,
    } as any)
    .then(() => {
      const token = readCookie("XSRF-TOKEN");
      if (token) (http.defaults.headers as any).common["X-XSRF-TOKEN"] = token;
    })
    .finally(() => {
      csrfInitInFlight = null;
    });

  await csrfInitInFlight;
}

export const bootstrapCsrf = ensureCsrf;

/** -------- Interceptors -------- */
http.interceptors.request.use(async (config: Cfg) => {
  const method = (config.method || "get").toLowerCase();
  const needsCsrf =
    !config.__skipCsrf && ["post", "put", "patch", "delete"].includes(method);
  if (needsCsrf) {
    await ensureCsrf();
    const token = readCookie("XSRF-TOKEN");
    if (token) (config.headers as any)["X-XSRF-TOKEN"] = token;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const cfg = error.config as Cfg | undefined;

    if (status === 403 && cfg && !cfg._csrfRetry) {
      cfg._csrfRetry = true;
      await ensureCsrf(true);
      const token = readCookie("XSRF-TOKEN");
      if (token) (cfg.headers as any)["X-XSRF-TOKEN"] = token;
      return http(cfg);
    }

    return Promise.reject(error);
  }
);

export default http;
