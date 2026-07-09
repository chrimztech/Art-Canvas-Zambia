import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { OrderDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order — ChrisEpic Arts" }] }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(sync: boolean) {
      try {
        const o = sync
          ? await api.post<OrderDetail>(`/api/orders/${orderId}/sync-status`)
          : await api.get<OrderDetail>(`/api/orders/${orderId}`);
        if (cancelled) return;
        setOrder(o);
      } catch {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load(false);
    // Poll a few times, actively re-checking with ZynlePay so the status catches up
    // even if the webhook is slow or missed while the user waits on this page.
    const interval = setInterval(() => load(true), 3000);
    const stop = setTimeout(() => clearInterval(interval), 30000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(stop); };
  }, [orderId]);

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!order) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10">Order not found.</div></div>;

  const Icon = order.status === "paid" || order.status === "fulfilled" ? CheckCircle2 : order.status === "cancelled" || order.status === "refunded" ? XCircle : Clock;
  const color = order.status === "paid" || order.status === "fulfilled" ? "text-green-600" : order.status === "cancelled" ? "text-destructive" : "text-amber-600";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${color}`} />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Order {order.orderNumber}</p>
              <h1 className="font-display text-2xl font-semibold capitalize">{order.status}</h1>
            </div>
            <Badge variant="secondary" className="ml-auto">{order.paymentProvider ?? "—"}</Badge>
          </div>

          {order.status === "pending" && (
            <p className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              Waiting for payment confirmation. This page refreshes automatically.
            </p>
          )}

          <div className="mt-6 divide-y divide-border">
            {order.items.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">K{Number(i.unitPriceZmw).toLocaleString()} × {i.quantity}</p>
                </div>
                <p className="font-semibold">K{Number(i.lineTotalZmw).toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-1 border-t border-border pt-4 text-sm">
            <Row label="Subtotal" value={order.subtotalZmw} />
            <Row label="Platform fee" value={order.platformFeeZmw} muted />
            <Row label="Developer royalty" value={order.royaltyZmw} muted />
            <Row label="Total" value={order.totalZmw} bold />
          </div>

          <div className="mt-6 flex gap-3">
            <Button asChild><Link to="/browse">Continue shopping</Link></Button>
            <Button variant="outline" asChild><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "text-base font-semibold" : ""}`}>
      <span>{label}</span><span>K{Number(value).toLocaleString()}</span>
    </div>
  );
}
