import { useLoaderData } from "@tanstack/react-router";
import { api, hasSession, setSessionHint } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

/**
 * The signed-in user, or null. Used by the root route's loader, which runs during server rendering
 * (forwarding the visitor's session cookie) and again on the client whenever auth changes.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!hasSession()) return null;
  try {
    return await api.get<AuthUser>("/api/me");
  } catch {
    return null;
  }
}

/** The current user from the root loader: identical on the server render and the client's first render. */
export function useAuth() {
  const { user } = useLoaderData({ from: "__root__" }) as { user: AuthUser | null };
  return { user, loading: false, roles: user?.roles ?? [] };
}

export async function login(email: string, password: string) {
  const res = await api.post<AuthUser>("/api/auth/login", { email, password });
  setSessionHint(true);
  return res;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  intendedRole?: string,
  extra?: { phone?: string; location?: string; bio?: string },
) {
  const res = await api.post<AuthUser>("/api/auth/register", {
    email,
    password,
    displayName,
    intendedRole,
    phone: extra?.phone,
    location: extra?.location,
    bio: extra?.bio,
  });
  setSessionHint(true);
  return res;
}

export async function becomeArtist() {
  await api.post("/api/me/become-artist");
  window.dispatchEvent(new Event("auth-changed"));
}

export async function logout() {
  try {
    await api.post("/api/auth/logout");
  } catch {
    // the session may already be gone — still clear local state
  } finally {
    setSessionHint(false);
  }
}
