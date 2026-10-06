import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AppNotification } from "@/lib/types";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ChrisEpic Arts" }] }),
  component: Notifications,
});

function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<AppNotification[]>("/api/me/notifications"),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  };
  const unread = data.filter((n) => !n.readAt).length;

  async function open(n: AppNotification) {
    if (!n.readAt) {
      await api.post(`/api/me/notifications/${n.id}/read`).catch(() => undefined);
      refresh();
    }
    if (n.link) {
      if (n.link.startsWith("/")) navigate({ to: n.link });
      else window.location.href = n.link;
    }
  }

  async function readAll() {
    await api.post("/api/me/notifications/read-all");
    refresh();
  }

  return (
    <PageShell
      title="Notifications"
      description="Offers, orders, new work from artists you follow and search alerts."
      width="max-w-3xl"
      actions={
        unread > 0 && (
          <Button variant="outline" size="sm" onClick={readAll}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <EmptyState icon={<Bell className="h-10 w-10" />} title="You're all caught up">
          Follow artists and save searches to hear about new work.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {data.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={cn(
                  "flex w-full gap-3 p-4 text-left transition hover:bg-accent/50",
                  !n.readAt && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-primary",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt && "font-semibold")}>
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
