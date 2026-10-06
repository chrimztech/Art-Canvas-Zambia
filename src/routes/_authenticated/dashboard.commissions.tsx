import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Commission } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";
import { COMMISSION_STATUS_LABEL } from "@/lib/commission";
import { MessageButton } from "@/components/message-button";

export const Route = createFileRoute("/_authenticated/dashboard/commissions")({
  head: () => ({ meta: [{ title: "Commission requests — ChrisEpic Arts" }] }),
  component: ArtistCommissions,
});

const NEXT_ACTION: Record<string, { next: string; label: string } | undefined> = {
  accepted: { next: "in_progress", label: "Start work" },
  in_progress: { next: "delivered", label: "Mark delivered" },
};

function ArtistCommissions() {
  const [rows, setRows] = useState<Commission[]>([]);
  const [open, setOpen] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState<string | null>(null);

  async function load() {
    try {
      const [assigned, openRequests] = await Promise.all([
        api.get<Commission[]>("/api/me/commissions/assigned"),
        api.get<Commission[]>("/api/commissions/open"),
      ]);
      setRows(assigned);
      setOpen(openRequests);
    } catch (e) {
      toast.error(errorMessage(e, "Could not load commissions"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      await api.patch(`/api/commissions/${id}/status`, { status });
      toast.success(`Marked ${status.replace("_", " ")}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update status"));
    }
  }

  async function release(id: string) {
    if (!window.confirm("Pass on this brief? It goes back to the open pool for other artists."))
      return;
    try {
      await api.post(`/api/commissions/${id}/release`);
      toast.success("Brief released");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not release brief"));
    }
  }

  async function sendQuote(c: Commission, price: number, note: string, claim: boolean) {
    try {
      await api.post(`/api/commissions/${c.id}/${claim ? "claim" : "quote"}`, {
        quotedPriceZmw: price,
        note,
      });
      toast.success(claim ? "Quote sent — the brief is now yours" : "Quote sent to the customer");
      setQuoting(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not send quote"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Commission inbox</h1>
        <p className="mt-1 text-muted-foreground">
          Quote on briefs, then get paid upfront before you start. Payment lands in your{" "}
          <Link to="/sales" className="text-primary hover:underline">
            sales balance
          </Link>
          .
        </p>

        <h2 className="mt-10 font-display text-xl font-semibold">Your commissions</h2>
        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Direct requests and briefs you claim land here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {rows.map((r) => {
              const action = NEXT_ACTION[r.status];
              const canQuote = r.status === "requested" || r.status === "quoted";
              return (
                <BriefCard key={r.id} c={r} badge={COMMISSION_STATUS_LABEL[r.status] ?? r.status}>
                  {r.quotedPriceZmw != null && (
                    <p className="mt-3 text-sm">
                      Your quote:{" "}
                      <span className="font-semibold">{formatZmw(r.quotedPriceZmw)}</span>
                      {r.status === "quoted" && (
                        <span className="text-muted-foreground">
                          {" "}
                          — waiting for the customer to pay
                        </span>
                      )}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {action && (
                      <Button size="sm" onClick={() => setStatus(r.id, action.next)}>
                        {action.label}
                      </Button>
                    )}
                    {canQuote && quoting !== r.id && (
                      <Button
                        size="sm"
                        variant={r.status === "requested" ? "default" : "outline"}
                        onClick={() => setQuoting(r.id)}
                      >
                        {r.status === "requested" ? "Send quote" : "Revise quote"}
                      </Button>
                    )}
                    {canQuote && (
                      <Button size="sm" variant="outline" onClick={() => release(r.id)}>
                        Pass on this
                      </Button>
                    )}
                    {r.status === "delivered" && (
                      <span className="text-sm text-muted-foreground">
                        Waiting for the customer to confirm.
                      </span>
                    )}
                    <MessageButton
                      recipientId={r.customerId}
                      recipientName={r.customerDisplayName}
                      contextType="COMMISSION"
                      contextId={r.id}
                      label="Message customer"
                      size="sm"
                      variant="ghost"
                    />
                  </div>
                  {quoting === r.id && (
                    <QuoteForm
                      initial={r.quotedPriceZmw ?? r.budgetZmw}
                      onCancel={() => setQuoting(null)}
                      onSubmit={(p, n) => sendQuote(r, p, n, false)}
                    />
                  )}
                </BriefCard>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold">Open briefs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unclaimed requests from any buyer — send a quote to claim one.
            </p>
            {open.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No open briefs right now.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {open.map((r) => (
                  <BriefCard key={r.id} c={r} dashed>
                    {quoting === r.id ? (
                      <QuoteForm
                        initial={r.budgetZmw}
                        onCancel={() => setQuoting(null)}
                        onSubmit={(p, n) => sendQuote(r, p, n, true)}
                      />
                    ) : (
                      <Button size="sm" className="mt-4" onClick={() => setQuoting(r.id)}>
                        Quote & claim
                      </Button>
                    )}
                  </BriefCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BriefCard({
  c,
  badge,
  dashed,
  children,
}: {
  c: Commission;
  badge?: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-5 ${dashed ? "border-dashed border-border" : "border-border"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.customerDisplayName ?? "Customer"} · {new Date(c.createdAt).toLocaleDateString()}
            {c.budgetZmw != null && ` · Budget ${formatZmw(c.budgetZmw)}`}
            {c.deadline && ` · Needed by ${new Date(c.deadline).toLocaleDateString()}`}
          </p>
        </div>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{c.brief}</p>
      {c.referenceImageUrls.length > 0 && (
        <div className="mt-3 flex gap-2">
          {c.referenceImageUrls.map((u) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noreferrer"
              className="h-16 w-16 overflow-hidden rounded-md border border-border"
            >
              <img src={u} alt="Reference" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function QuoteForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: number | null;
  onSubmit: (price: number, note: string) => void;
  onCancel: () => void;
}) {
  const [price, setPrice] = useState(initial != null ? String(initial) : "");
  const [note, setNote] = useState("");
  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-border bg-background/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = Number(price);
        if (!(value > 0)) {
          toast.error("Enter a quote greater than zero");
          return;
        }
        onSubmit(value, note);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div>
          <Label htmlFor="quote-price">Your price (ZMW)</Label>
          <Input
            id="quote-price"
            type="number"
            min={1}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="quote-note">Message to the customer</Label>
          <Textarea
            id="quote-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Timeline, size, materials, delivery…"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Send quote
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
