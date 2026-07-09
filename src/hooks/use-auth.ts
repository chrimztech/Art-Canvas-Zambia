import { useCallback, useEffect, useState } from "react";
import { api, getAuthToken, setAuthToken } from "@/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

async function fetchMe(): Promise<AuthUser | null> {
  if (!getAuthToken()) return null;
  try {
    return await api.get<AuthUser>("/api/me");
  } catch {
    setAuthToken(null);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchMe().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("auth-changed", refresh);
    return () => window.removeEventListener("auth-changed", refresh);
  }, [refresh]);

  return { user, loading, roles: user?.roles ?? [] };
}

export async function login(email: string, password: string) {
  const res = await api.post<AuthUser & { token: string }>("/api/auth/login", { email, password });
  setAuthToken(res.token);
  return res;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  intendedRole?: string,
  extra?: { phone?: string; location?: string; bio?: string },
) {
  const res = await api.post<AuthUser & { token: string }>("/api/auth/register", {
    email,
    password,
    displayName,
    intendedRole,
    phone: extra?.phone,
    location: extra?.location,
    bio: extra?.bio,
  });
  setAuthToken(res.token);
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
    // token may already be invalid/expired - still clear it locally
  } finally {
    setAuthToken(null);
  }
}
