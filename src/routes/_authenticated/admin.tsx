import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/admin-panel";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ChrisEpic Arts" }] }),
  component: AdminPanel,
});
