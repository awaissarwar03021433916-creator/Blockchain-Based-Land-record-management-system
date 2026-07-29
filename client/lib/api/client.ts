import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { useAuthStore } from "@/stores/auth.store";
import { AuthError, normalizeApiError } from "./error";

/**
 * Singleton Axios instance — the ONLY place HTTP is configured.
 *
 * Conventions enforced here:
 *   • baseURL is sourced from validated env (no scattered string concat).
 *   • Every request carries the user's JWT if one is present.
 *   • Every response failure is funnelled through `normalizeApiError` so
 *     downstream code branches on TYPED CLASSES instead of HTTP codes.
 *   • A 401 silently clears the persisted session — guards / middleware
 *     handle the redirect on the next render, so the axios layer never
 *     reaches into the router (keeping it framework-agnostic and testable).
 *
 * The bare `axios.create` instance is also exported as `rawApi` for the
 * (very rare) case where a feature needs the un-intercepted client, e.g.
 * a third-party endpoint that returns a non-standard error shape.
 */
const TIMEOUT_MS = 15_000;

export const rawApi: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/* ----------------------------- Request --------------------------------- */

rawApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read the token directly from the zustand store. `getState()` is the
    // store-outside-React API — no hook rules to violate, no React tree
    // dependency. The token may be null (anonymous request); that's fine.
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  // Request-side failures (e.g. config errors) are rare; surface normalized.
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);

/* ----------------------------- Response -------------------------------- */

rawApi.interceptors.response.use(
  // Success — let the body through untouched.
  (response) => response,
  // Failure — normalize. Side-effect on 401: drop the persisted session.
  (error: unknown) => {
    const normalized = normalizeApiError(error);
    if (normalized instanceof AuthError) {
      // The token is invalid/expired. Clearing the store causes the
      // `selectIsAuthenticated` selector to flip to false; any layout
      // guard reading it on the next render redirects to /login.
      // (We do NOT call router.push() here — the axios layer must not
      // know about routing.)
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(normalized);
  },
);

/* --------------------------- Typed helpers ------------------------------- */
/* Thin wrappers that unwrap `response.data` so services don't repeat the
 * `.then(r => r.data)` pattern at every call site. The service layer is
 * what feature code imports — this client is its single dependency. */

export interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

export const api: ApiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await rawApi.get<T>(url, config)).data,
  post: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => (await rawApi.post<T>(url, body, config)).data,
  put: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => (await rawApi.put<T>(url, body, config)).data,
  patch: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => (await rawApi.patch<T>(url, body, config)).data,
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await rawApi.delete<T>(url, config)).data,
};
