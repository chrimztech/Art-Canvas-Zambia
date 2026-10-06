import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { hasSession } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  // Server-render protected pages when the SSR server can see the visitor's session cookie
  // (same-site deployments). Otherwise render on the client, where the guard below decides.
  ssr: () => hasSession(),
  component: AuthGuard,
});

function AuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth(); // re-render when auth changes (sign-out elsewhere, expired session)
  const signedIn = hasSession();
  const lastHref = useRef(location.href);
  const redirected = useRef(false);
  if (signedIn) lastHref.current = location.href;

  useEffect(() => {
    if (signedIn) {
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    navigate({ to: "/auth", search: { redirect: lastHref.current }, replace: true });
  }, [signedIn, navigate]);

  return signedIn ? <Outlet /> : null;
}
