import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const API_BASE =
  (typeof window !== "undefined" ? import.meta.env.VITE_API_URL : undefined) ||
  (typeof process !== "undefined" ? process.env.VITE_API_URL : undefined) ||
  "http://localhost:8090";

/**
 * Sessions live in an HttpOnly cookie set by the API, so scripts never see the token. The API also
 * sets a readable "acz_session=1" hint cookie; when the frontend and API are on different sites that
 * cookie isn't visible here, so a localStorage copy of the hint is kept as a fallback.
 */
const SESSION_HINT = "acz_session";

/** The browser's cookies on the client; the incoming request's Cookie header during SSR. */
const readCookieHeader = createIsomorphicFn()
  .server(() => getRequestHeader("cookie") ?? "")
  .client(() => document.cookie);

function hintCookiePresent() {
  return readCookieHeader()
    .split(";")
    .some((c) => c.trim() === `${SESSION_HINT}=1`);
}

/** Whether a sign-in session (probably) exists. Cheap and synchronous; the API remains the authority. */
export function hasSession(): boolean {
  if (hintCookiePresent()) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SESSION_HINT) === "1";
  } catch {
    return false;
  }
}

/** Records sign-in/sign-out locally and tells the app to refresh anything user-specific. */
export function setSessionHint(signedIn: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (signedIn) window.localStorage.setItem(SESSION_HINT, "1");
    else window.localStorage.removeItem(SESSION_HINT);
    // Tokens used to live here before cookie sessions; make sure no stale copy lingers.
    window.localStorage.removeItem("auth_token");
  } catch {
    // storage unavailable (private mode): the cookie hint still works
  }
  if (!signedIn) document.cookie = `${SESSION_HINT}=; Max-Age=0; path=/`;
  window.dispatchEvent(new Event("auth-changed"));
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const forwardedCookie = typeof window === "undefined" ? readCookieHeader() : "";
  const headers: Record<string, string> = {
    // Required by the API for cookie-authenticated writes (CSRF protection).
    "X-Requested-With": "fetch",
    ...(!isFormData && options.body ? { "Content-Type": "application/json" } : {}),
    ...(forwardedCookie ? { Cookie: forwardedCookie } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    // The session expired or was revoked elsewhere: reflect that everywhere in the app.
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      hasSession() &&
      !path.startsWith("/api/auth/")
    ) {
      setSessionHint(false);
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<T>(path, { method: "POST", body: fd });
  },
};
