import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Commission } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/commissions")({
  head: () => ({ meta: [{ title: "Commission requests — ChrisEpic Arts" }] }),
  component: ArtistCommissions,
});

type Status = "requested" | "accepted" | "in_progress" | "delivered" | "cancelled";

const NEXT_LABEL: Record<Status, { next: Status; label: string } | null> = {
  requested: { next: "accepted", label: "Accept" },
  accepted: { next: "in_progress", label: "Start work" },
  in_progress: { next: "delivered", label: "Mark delivered" },
  delivered: null,
  cancelled: null,
};

function ArtistCommissions() {
  const [rows, setRows] = useState<Commission[]>([]);
  const [open, setOpen] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [assigned, openRequests] = await Promise.all([
      api.get<Commission[]>("/api/me/commissions/assigned"),
      api.get<Commission[]>("/api/commissions/open"),
    ]);
    setRows(assigned);
    setOpen(openRequests);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: Status) {
    try {
      await api.patch(`/api/commissions/${id}/status`, { status });
      toast.success(`Marked ${status.replace("_", " ")}`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update status");
    }
  }

  async function claim(id: string) {
    try {
      await api.post(`/api/commissions/${id}/claim`, {});
      toast.success("Commission claimed — it's now in your queue.");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not claim commission");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Commission requests</h1>
        <p className="mt-1 text-muted-foreground">Briefs sent directly to you by buyers.</p>

        {!loading && open.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Open requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">Unclaimed briefs from any buyer — claim one to start working on it.</p>
            <div className="mt-4 space-y-3">
              {open.map((r) => (
                <div key={r.id} className="rounded-2xl border border-dashed border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()} · Budget K{Number(r.budgetZmw ?? 0).toLocaleString()}</p>
                    </div>
                    <Button size="sm" onClick={() => claim(r.id)}>Claim</Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{r.brief}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="mt-10 font-display text-xl font-semibold">Your commissions</h2>
        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">When a buyer commissions you, requests land here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {rows.map((r) => {
              const action = NEXT_LABEL[r.status as Status];
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{r.title ?? "Commission"}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()} · Budget K{Number(r.budgetZmw ?? 0).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{String(r.status).replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{r.brief}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {action && <Button size="sm" onClick={() => setStatus(r.id, action.next)}>{action.label}</Button>}
                    {r.status !== "cancelled" && r.status !== "delivered" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "cancelled")}>Decline</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
