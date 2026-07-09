import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { OrderSummary } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({ meta: [{ title: "My Orders — ChrisEpic Arts" }] }),
  component: Orders,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  fulfilled: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

function Orders() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OrderSummary[]>("/api/me/orders").then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">My orders</h1>
        <p className="mt-1 text-muted-foreground">Track every purchase you've made on ChrisEpic Arts.</p>

        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Discover art from Zambian creators.</p>
            <Button asChild className="mt-4"><Link to="/browse">Browse art</Link></Button>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[o.status] ?? "secondary"} className="capitalize">{o.status}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold">K{Number(o.totalZmw).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
