import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { OrderDetail, OrderItem } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, PackageCheck, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";
import { MessageButton } from "@/components/message-button";
import { StarInput, Stars } from "@/components/star-rating";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order — ChrisEpic Arts" }] }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer: { id?: ReturnType<typeof setInterval> } = {};
    async function load(sync: boolean) {
      try {
        const o = sync
          ? await api.post<OrderDetail>(`/api/orders/${orderId}/sync-status`)
          : await api.get<OrderDetail>(`/api/orders/${orderId}`);
        if (cancelled) return;
        setOrder(o);
        if (o.status !== "pending") clearInterval(timer.id);
      } catch {
        if (!cancelled && !sync) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load(false);
    // Poll a few times, actively re-checking with ZynlePay so the status catches up
    // even if the webhook is slow or missed while the user waits on this page.
    timer.id = setInterval(() => load(true), 3000);
    const stop = setTimeout(() => clearInterval(timer.id), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer.id);
      clearTimeout(stop);
    };
  }, [orderId]);

  const reload = () =>
    api
      .get<OrderDetail>(`/api/orders/${orderId}`)
      .then(setOrder)
      .catch(() => {});

  async function confirmReceived(item: OrderItem) {
    setBusyItem(item.id);
    try {
      setOrder(await api.post<OrderDetail>(`/api/orders/${orderId}/items/${item.id}/received`));
      toast.success("Thanks! Marked as received.");
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the order"));
    } finally {
      setBusyItem(null);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );
  if (!order)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10">
          Order not found.{" "}
          <Link to="/orders" className="text-primary hover:underline">
            Back to orders
          </Link>
        </div>
      </div>
    );

  const paid = order.status === "paid" || order.status === "fulfilled";
  const Icon = paid
    ? CheckCircle2
    : order.status === "cancelled" || order.status === "refunded"
      ? XCircle
      : Clock;
  const color = paid
    ? "text-green-600"
    : order.status === "cancelled"
      ? "text-destructive"
      : "text-amber-600";
  const ship = order.shippingAddress;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-12">
        <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← All orders
        </Link>
        <div className="mt-4 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${color}`} />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Order {order.orderNumber}
              </p>
              <h1 className="font-display text-2xl font-semibold capitalize">{order.status}</h1>
              <p className="text-xs text-muted-foreground">
                Placed {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {order.paymentProvider ?? "—"}
            </Badge>
          </div>

          {order.status === "pending" && (
            <p className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Waiting for payment confirmation. Approve the prompt on your phone — this page
              refreshes automatically.
            </p>
          )}
          {order.status === "cancelled" && (
            <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              This payment didn't go through. Nothing was charged — your cart items are still saved
              if you'd like to try again.
            </p>
          )}

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="divide-y divide-border">
              {order.items.map((i) => (
                <div key={i.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatZmw(i.unitPriceZmw)} × {i.quantity}
                        {i.sellerDisplayName ? ` · sold by ${i.sellerDisplayName}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold">{formatZmw(i.lineTotalZmw)}</p>
                  </div>
                  {i.refunded ? (
                    <Badge variant="outline" className="mt-2">
                      Refunded
                    </Badge>
                  ) : (
                    paid && (
                      <ItemStatus
                        item={i}
                        busy={busyItem === i.id}
                        onReceived={() => confirmReceived(i)}
                      />
                    )
                  )}
                  {paid && <ItemActions orderId={order.id} item={i} onChange={reload} />}
                </div>
              ))}
            </div>

            <aside className="space-y-6 rounded-xl border border-border bg-background/40 p-5 lg:sticky lg:top-36">
              <dl className="space-y-1 text-sm">
                {(Number(order.discountZmw) > 0 ||
                  Number(order.shippingZmw) > 0 ||
                  Number(order.giftCardZmw) > 0) && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Items</dt>
                    <dd>{formatZmw(order.subtotalZmw)}</dd>
                  </div>
                )}
                {Number(order.discountZmw) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                    <dd>−{formatZmw(order.discountZmw)}</dd>
                  </div>
                )}
                {Number(order.shippingZmw) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Delivery</dt>
                    <dd>{formatZmw(order.shippingZmw)}</dd>
                  </div>
                )}
                {Number(order.giftCardZmw) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Gift card</dt>
                    <dd>−{formatZmw(order.giftCardZmw)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <dt>Total paid</dt>
                  <dd>{formatZmw(order.totalZmw)}</dd>
                </div>
              </dl>

              {ship && (
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm">
                  <p className="font-medium">
                    {ship.method === "pickup" ? "Collection from seller" : "Delivery address"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[ship.name, ship.address, ship.city].filter(Boolean).join(", ") || "—"}
                    {ship.phone ? ` · ${ship.phone}` : ""}
                  </p>
                  {ship.notes && <p className="mt-1 text-muted-foreground">Notes: {ship.notes}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/browse">Continue shopping</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemStatus({
  item,
  busy,
  onReceived,
}: {
  item: OrderItem;
  busy: boolean;
  onReceived: () => void;
}) {
  if (item.itemType === "CLASS") {
    return (
      <Link
        to="/dashboard/learning"
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        You're enrolled — view your classes →
      </Link>
    );
  }
  if (item.itemType === "EXHIBITION") {
    return (
      <Link
        to="/dashboard/tickets"
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        Your ticket is ready — show the QR code at the door →
      </Link>
    );
  }
  if (item.itemType === "COMMISSION") {
    return (
      <Link
        to="/dashboard/my-commissions"
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        Track your commission →
      </Link>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      {item.fulfillmentStatus === "delivered" ? (
        <span className="inline-flex items-center gap-1 text-green-600">
          <PackageCheck className="h-4 w-4" />
          Received
        </span>
      ) : item.fulfillmentStatus === "shipped" ? (
        <span className="inline-flex items-center gap-1 text-primary">
          <Truck className="h-4 w-4" />
          Shipped{item.carrier ? ` via ${item.carrier}` : ""}
          {item.trackingNumber ? ` · tracking ${item.trackingNumber}` : ""}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          Seller is preparing your item
        </span>
      )}
      {item.fulfillmentStatus !== "delivered" && (
        <Button size="sm" variant="outline" onClick={onReceived} disabled={busy}>
          {busy ? "Saving…" : "I've received this"}
        </Button>
      )}
    </div>
  );
}

/** Review, refund and "message seller" actions for one purchased item. */
function ItemActions({
  orderId,
  item,
  onChange,
}: {
  orderId: string;
  item: OrderItem;
  onChange: () => void;
}) {
  const [mode, setMode] = useState<"review" | "refund" | null>(null);
  const [rating, setRating] = useState(item.myRating ?? 5);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = !item.refunded && (!item.physical || item.fulfillmentStatus === "delivered");
  const canRefund = !item.refunded && item.refundStatus !== "requested";

  async function submitReview() {
    setBusy(true);
    try {
      await api.post("/api/reviews", { orderItemId: item.id, rating, comment });
      toast.success("Thanks for your review!");
      setMode(null);
      onChange();
    } catch (e) {
      toast.error(errorMessage(e, "Could not save review"));
    } finally {
      setBusy(false);
    }
  }

  async function submitRefund() {
    setBusy(true);
    try {
      await api.post("/api/refunds", { orderItemId: item.id, reason });
      toast.success("Refund requested — we'll email you when it's reviewed.");
      setMode(null);
      onChange();
    } catch (e) {
      toast.error(errorMessage(e, "Could not request refund"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {item.myRating != null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Your review <Stars value={item.myRating} />
          </span>
        )}
        {canReview && mode !== "review" && (
          <Button size="sm" variant="outline" onClick={() => setMode("review")}>
            {item.myRating != null ? "Edit review" : "Leave a review"}
          </Button>
        )}
        {item.itemType === "ARTWORK" && !item.refunded && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/orders/$orderId/certificate/$itemId" params={{ orderId, itemId: item.id }}>
              Certificate
            </Link>
          </Button>
        )}
        {item.refundStatus === "requested" && <Badge variant="secondary">Refund requested</Badge>}

        {item.refundStatus === "rejected" && <Badge variant="outline">Refund declined</Badge>}
        {canRefund && mode !== "refund" && (
          <Button size="sm" variant="ghost" onClick={() => setMode("refund")}>
            Request refund
          </Button>
        )}
        {item.sellerId && (
          <MessageButton
            recipientId={item.sellerId}
            recipientName={item.sellerDisplayName}
            contextType="ORDER"
            contextId={orderId}
            label="Message seller"
            size="sm"
            variant="ghost"
            placeholder="Ask about delivery, collection or anything about this order"
          />
        )}
      </div>
      {mode === "review" && (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <StarInput value={rating} onChange={setRating} />
          <Textarea
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you love? How was packaging and delivery?"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitReview} disabled={busy}>
              {busy ? "Saving…" : "Post review"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {mode === "refund" && (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Tell us what went wrong. The seller can respond and an admin decides; approved refunds
            go back to your original payment method.
          </p>
          <Textarea
            rows={3}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. It arrived damaged — photos available"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={submitRefund}
              disabled={busy || !reason.trim()}
            >
              {busy ? "Sending…" : "Request refund"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
