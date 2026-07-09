import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api-client";
import type { CartItem, CheckoutRequest, CheckoutResponse } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "@/components/checkout-form";
import { Trash2, Palette } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — ChrisEpic Arts" }] }),
  component: Cart,
});

function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [paying, setPaying] = useState(false);

  async function pay(req: CheckoutRequest) {
    setPaying(true);
    try {
      const res = await api.post<CheckoutResponse>("/api/checkout", req);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      toast.success(res.message ?? "Payment started");
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    } finally {
      setPaying(false);
    }
  }

  async function refresh() {
    if (!getAuthToken()) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    const data = await api.get<CartItem[]>("/api/cart");
    setItems(data);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function remove(id: string) {
    await api.del(`/api/cart/${id}`);
    toast.success("Removed");
    refresh();
  }

  const total = items.reduce((s, i) => s + i.priceZmw * i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Your cart</h1>
        {!signedIn ? (
          <p className="mt-6 text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">Sign in</Link> to view your cart.</p>
        ) : loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Palette className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
            <Link to="/browse" className="mt-3 inline-block text-primary hover:underline">Browse art →</Link>
          </div>
        ) : (
          <>
            <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-4 p-4">
                  <div className="h-20 w-20 overflow-hidden rounded bg-muted">
                    {i.coverImageUrl && <img src={i.coverImageUrl} alt={i.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    {i.itemType === "SUPPLY" ? (
                      <Link to="/supplies/$slug" params={{ slug: i.slug }} className="font-medium hover:text-primary">{i.title}</Link>
                    ) : (
                      <Link to="/artworks/$slug" params={{ slug: i.slug }} className="font-medium hover:text-primary">{i.title}</Link>
                    )}
                    <p className="text-sm text-muted-foreground">K{Number(i.priceZmw).toLocaleString()} × {i.quantity}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div><p className="text-sm text-muted-foreground">Subtotal</p><p className="font-display text-2xl font-semibold">K{total.toLocaleString()}</p></div>
            </div>

            <div className="mt-6">
              <CheckoutForm busy={paying} onSubmit={pay} submitLabel="Pay now" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
