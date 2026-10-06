import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, Commission } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { CheckoutForm } from "@/components/checkout-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brush } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { errorMessage, formatZmw } from "@/lib/utils";
import { MessageButton } from "@/components/message-button";
import { COMMISSION_STATUS_LABEL, COMMISSION_STEPS as STEPS } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/dashboard/my-commissions")({
  head: () => ({ meta: [{ title: "My commissions — ChrisEpic Arts" }] }),
  component: MyCommissions,
});

function MyCommissions() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows(await api.get<Commission[]>("/api/me/commissions"));
    } catch (e) {
      toast.error(errorMessage(e, "Could not load your commissions"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function setStatus(c: Commission, status: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await api.patch(`/api/commissions/${c.id}/status`, { status });
      toast.success(
        status === "completed" ? "Thanks! Commission completed." : "Commission updated",
      );
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update commission"));
    }
  }

  async function withdraw(c: Commission) {
    if (!window.confirm("Withdraw this request? Artists will no longer see it.")) return;
    try {
      await api.del(`/api/commissions/${c.id}`);
      toast.success("Request withdrawn");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not withdraw request"));
    }
  }

  async function pay(c: Commission, req: CheckoutRequest) {
    setBusy(true);
    try {
      const res = await api.post<CheckoutResponse>(`/api/commissions/${c.id}/checkout`, req);
      const message = await continuePayment(res);
      if (message === null) return; // leaving for the gateway's hosted page
      toast.success(
        res.widget
          ? message
          : (res.message ?? "Payment started — the artist starts once it clears."),
      );
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e) {
      toast.error(errorMessage(e, "Could not start payment"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">My commissions</h1>
            <p className="mt-1 text-muted-foreground">Custom work you've requested from artists.</p>
          </div>
          <Button asChild>
            <Link to="/commissions">New request</Link>
          </Button>
        </div>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Brush className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No commission requests yet</p>
            <Link
              to="/commissions"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Request custom art →
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 xl:grid-cols-2 xl:items-start">
            {rows.map((c) => {
              const step = STEPS.indexOf(c.status);
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                        {c.budgetZmw != null && ` · Budget ${formatZmw(c.budgetZmw)}`}
                        {c.deadline && ` · Needed by ${new Date(c.deadline).toLocaleDateString()}`}
                      </p>
                      <p className="mt-1 text-sm">
                        {c.artistId ? (
                          <>
                            Artist:{" "}
                            <Link
                              to="/artists/$id"
                              params={{ id: c.artistId }}
                              className="text-primary hover:underline"
                            >
                              {c.artistDisplayName ?? "Artist"}
                            </Link>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Open to all artists</span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        c.status === "cancelled"
                          ? "destructive"
                          : c.status === "quoted"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {c.status === "quoted"
                        ? "Quote received"
                        : (COMMISSION_STATUS_LABEL[c.status] ?? c.status)}
                    </Badge>
                  </div>

                  {step >= 0 && (
                    <div className="mt-4 flex gap-1" aria-hidden>
                      {STEPS.map((s, i) => (
                        <div
                          key={s}
                          className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  )}

                  <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{c.brief}</p>
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

                  {c.quotedPriceZmw != null && (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">
                        Quote from {c.artistDisplayName ?? "the artist"}
                      </p>
                      <p className="font-display text-2xl font-semibold">
                        {formatZmw(c.quotedPriceZmw)}
                      </p>
                      {c.artistNote && (
                        <p className="mt-1 whitespace-pre-wrap text-sm">{c.artistNote}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.status === "quoted" && paying !== c.id && (
                      <Button size="sm" onClick={() => setPaying(c.id)}>
                        Accept & pay {formatZmw(c.quotedPriceZmw)}
                      </Button>
                    )}
                    {c.status === "quoted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStatus(c, "cancelled", "Decline this quote and close the request?")
                        }
                      >
                        Decline quote
                      </Button>
                    )}
                    {c.status === "requested" && (
                      <Button size="sm" variant="outline" onClick={() => withdraw(c)}>
                        Withdraw request
                      </Button>
                    )}
                    {c.status === "delivered" && (
                      <Button size="sm" onClick={() => setStatus(c, "completed")}>
                        I've received it — complete
                      </Button>
                    )}
                    {c.artistId && (
                      <MessageButton
                        recipientId={c.artistId}
                        recipientName={c.artistDisplayName}
                        contextType="COMMISSION"
                        contextId={c.id}
                        label="Message artist"
                        size="sm"
                        variant="ghost"
                      />
                    )}
                  </div>
                  {paying === c.id && c.status === "quoted" && (
                    <div className="mt-4">
                      <CheckoutForm
                        busy={busy}
                        onSubmit={(req) => pay(c, req)}
                        submitLabel={`Pay ${formatZmw(c.quotedPriceZmw)}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => setPaying(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
