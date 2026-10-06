import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Ticket } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Ticket as TicketIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/tickets")({
  head: () => ({ meta: [{ title: "My tickets — ChrisEpic Arts" }] }),
  component: MyTickets,
});

function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Ticket[]>("/api/me/tickets")
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">My tickets</h1>
        <p className="mt-1 text-muted-foreground">
          Exhibition tickets you've booked, with your entry QR code.
        </p>

        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : tickets.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <TicketIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-muted-foreground">No tickets yet.</p>
            <Link to="/exhibitions" className="mt-3 inline-block text-primary hover:underline">
              Browse exhibitions →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                  {t.exhibitionCoverImageUrl && (
                    <img
                      src={t.exhibitionCoverImageUrl}
                      alt={t.exhibitionTitle ?? ""}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  {t.exhibitionSlug ? (
                    <Link
                      to="/exhibitions/$slug"
                      params={{ slug: t.exhibitionSlug }}
                      className="font-medium hover:text-primary"
                    >
                      {t.exhibitionTitle ?? "Exhibition"}
                    </Link>
                  ) : (
                    <p className="font-medium">{t.exhibitionTitle ?? "Exhibition"}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.startsAt ? new Date(t.startsAt).toLocaleString() : "Date TBA"} · {t.quantity}{" "}
                    ticket{t.quantity > 1 ? "s" : ""} · K{Number(t.totalZmw).toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant={t.status === "paid" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {t.status}
                    </Badge>
                    {t.checkedInAt && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Checked in
                      </Badge>
                    )}
                  </div>
                </div>
                {t.status === "paid" && t.qrCode && (
                  <div className="shrink-0 rounded-lg border border-border bg-white p-2">
                    <img src={t.qrCode} alt="Ticket QR code" className="h-24 w-24" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
