import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthToken } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!getAuthToken()) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
