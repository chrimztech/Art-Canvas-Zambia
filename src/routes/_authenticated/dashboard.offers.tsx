import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, Offer, OfferStatus } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { EmptyState, PageShell } from "@/components/page-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { errorMessage, formatZmw, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/offers")({
  head: () => ({ meta: [{ title: "Offers — ChrisEpic Arts" }] }),
  component: Offers,
});

const STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "Awaiting artist",
  countered: "Counter-offer",
  accepted: "Accepted — ready to pay",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  purchased: "Purchased",
};

function Offers() {
  const { roles } = useAuth();
  const isArtist = roles.includes("ARTIST");
  const queryClient = useQueryClient();
  const { data: made = [], isLoading } = useQuery({
    queryKey: ["offers", "mine"],
    queryFn: () => api.get<Offer[]>("/api/me/offers"),
  });
  const { data: received = [] } = useQuery({
    queryKey: ["offers", "received"],
    queryFn: () => api.get<Offer[]>("/api/me/offers/received"),
    enabled: isArtist,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["offers"] });
  const openReceived = received.filter((o) => o.status === "pending").length;

  return (
    <PageShell
      title="Offers"
      description="Negotiate on original work. Accepted offers can be paid at the agreed price."
    >
      <Tabs defaultValue={isArtist && openReceived > 0 ? "received" : "made"}>
        <TabsList>
          <TabsTrigger value="made">Offers I've made</TabsTrigger>
          {isArtist && (
            <TabsTrigger value="received">
              Received{openReceived > 0 ? ` (${openReceived} new)` : ""}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="made" className="mt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : made.length === 0 ? (
            <EmptyState icon={<HandCoins className="h-10 w-10" />} title="No offers yet">
              Look for “Make an offer” on artworks whose artists accept offers.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {made.map((o) => (
                <OfferRow key={o.id} offer={o} side="buyer" onChange={refresh} />
              ))}
            </div>
          )}
        </TabsContent>
        {isArtist && (
          <TabsContent value="received" className="mt-6">
            {received.length === 0 ? (
              <EmptyState icon={<HandCoins className="h-10 w-10" />} title="No offers received">
                Turn on “Accept offers” when editing an artwork to let collectors negotiate.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {received.map((o) => (
                  <OfferRow key={o.id} offer={o} side="artist" onChange={refresh} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}

function OfferRow({
  offer: o,
  side,
  onChange,
}: {
  offer: Offer;
  side: "buyer" | "artist";
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [counter, setCounter] = useState("");
  const [paying, setPaying] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const open = o.status === "pending" || o.status === "countered";

  async function act(path: string, body: unknown, done: string) {
    setBusy(true);
    try {
      await api.post(`/api/offers/${o.id}/${path}`, body);
      toast.success(done);
      onChange();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the offer"));
    } finally {
      setBusy(false);
    }
  }

  async function pay(req: CheckoutRequest) {
    setPaying(true);
    try {
      const res = await api.post<CheckoutResponse>(`/api/offers/${o.id}/checkout`, req);
      onChange();
      if (res.paymentMethod !== "gift_card") {
        const message = await continuePayment(res);
        if (message === null) return;
        toast.success(message);
      } else {
        toast.success("Paid with your gift card");
      }
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e) {
      toast.error(errorMessage(e, "Checkout failed"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
        {o.artworkCoverUrl && (
          <img src={o.artworkCoverUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {o.artworkSlug ? (
            <Link
              to="/artworks/$slug"
              params={{ slug: o.artworkSlug }}
              className="font-medium hover:text-primary"
            >
              {o.artworkTitle}
            </Link>
          ) : (
            <span className="font-medium">{o.artworkTitle}</span>
          )}
          <Badge variant={o.status === "accepted" ? "default" : "secondary"}>
            {STATUS_LABEL[o.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {side === "buyer"
            ? `To ${o.artistName ?? "artist"}`
            : `From ${o.buyerName ?? "a collector"}`}{" "}
          · listed {formatZmw(o.listPriceZmw)} · {timeAgo(o.createdAt)}
        </p>
        <p className="mt-1 text-sm">
          Offer <strong>{formatZmw(o.amountZmw)}</strong>
          {o.counterAmountZmw != null && o.status === "countered" && (
            <>
              {" "}
              · counter <strong>{formatZmw(o.counterAmountZmw)}</strong>
            </>
          )}
        </p>
        {o.message && <p className="mt-1 text-sm italic text-muted-foreground">“{o.message}”</p>}
        {open && (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {new Date(o.expiresAt).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:w-64 sm:justify-end">
        {side === "buyer" && o.status === "countered" && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => act("accept-counter", undefined, "Counter-offer accepted")}
          >
            Accept {formatZmw(o.counterAmountZmw)}
          </Button>
        )}
        {side === "buyer" && o.status === "accepted" && (
          <Button size="sm" onClick={() => setPayOpen(true)}>
            Pay {formatZmw(o.amountZmw)}
          </Button>
        )}
        {side === "buyer" && open && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => act("withdraw", undefined, "Offer withdrawn")}
          >
            Withdraw
          </Button>
        )}
        {side === "artist" && o.status === "pending" && (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                act("respond", { action: "accept" }, "Offer accepted — the buyer has been told")
              }
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => act("respond", { action: "decline" }, "Offer declined")}
            >
              Decline
            </Button>
            <div className="flex w-full gap-2">
              <Input
                type="number"
                placeholder="Counter (K)"
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                className="h-9"
                aria-label="Counter-offer amount"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !counter}
                onClick={() =>
                  act(
                    "respond",
                    { action: "counter", counterAmountZmw: Number(counter) },
                    "Counter-offer sent",
                  )
                }
              >
                Counter
              </Button>
            </div>
          </>
        )}
      </div>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pay for {o.artworkTitle}</DialogTitle>
            <DialogDescription>
              Agreed price {formatZmw(o.amountZmw)}, plus the artist's delivery charge if you choose
              delivery.
            </DialogDescription>
          </DialogHeader>
          <CheckoutForm
            busy={paying}
            onSubmit={pay}
            submitLabel="Continue to payment"
            requireShipping
            codes
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
