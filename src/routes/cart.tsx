import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";
import type { CartItem, CheckoutQuote, CheckoutRequest, CheckoutResponse } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckoutForm, type CheckoutDraft } from "@/components/checkout-form";
import { PriceSummary } from "@/components/price-summary";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Minus, Palette, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { errorMessage, formatZmw } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — ChrisEpic Arts" }] }),
  component: Cart,
});

function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [paying, setPaying] = useState(false);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartItem[]>("/api/cart"),
    enabled: !!user,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cart"] });
  const [draft, setDraft] = useState<CheckoutDraft>({ deliveryMethod: "delivery" });
  const onDraftChange = useCallback((d: CheckoutDraft) => setDraft(d), []);
  const cartKey = items.map((i) => `${i.id}:${i.quantity}:${i.available}`).join(",");
  const { data: quote, isFetching: quoting } = useQuery({
    queryKey: ["cart-quote", cartKey, draft],
    queryFn: () => api.post<CheckoutQuote>("/api/checkout/quote", draft),
    enabled: !!user && items.length > 0 && items.every((i) => i.available),
    placeholderData: (prev) => prev,
  });

  async function pay(req: CheckoutRequest) {
    setPaying(true);
    try {
      const res = await api.post<CheckoutResponse>("/api/checkout", req);
      refresh();
      if (res.paymentMethod === "gift_card") {
        toast.success("Paid with your gift card");
        navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
        return;
      }
      const message = await continuePayment(res);
      if (message === null) return; // leaving for the gateway's hosted page
      toast.success(res.widget ? message : (res.message ?? "Payment started"));
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e) {
      toast.error(errorMessage(e, "Checkout failed"));
      refresh();
    } finally {
      setPaying(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/api/cart/${id}`);
      toast.success("Removed");
    } catch (e) {
      toast.error(errorMessage(e, "Could not remove item"));
    }
    refresh();
  }

  async function setQuantity(item: CartItem, quantity: number) {
    if (quantity < 1 || quantity > item.maxQuantity) return;
    try {
      await api.patch(`/api/cart/${item.id}`, { quantity });
    } catch (e) {
      toast.error(errorMessage(e, "Could not update quantity"));
    }
    refresh();
  }

  const total = items
    .filter((i) => i.available)
    .reduce((s, i) => s + Number(i.priceZmw) * i.quantity, 0);
  const unavailable = items.filter((i) => !i.available);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <h1 className="font-display text-3xl font-semibold">Your cart</h1>
        {authLoading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : !user ? (
          <p className="mt-6 text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to view your cart.
          </p>
        ) : isLoading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Palette className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
            <div className="mt-3 flex justify-center gap-4">
              <Link to="/browse" className="text-primary hover:underline">
                Browse art →
              </Link>
              <Link to="/supplies" className="text-primary hover:underline">
                Shop supplies →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:items-start">
            <div>
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                      {i.coverImageUrl && (
                        <img
                          src={i.coverImageUrl}
                          alt={i.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {i.itemType === "SUPPLY" ? (
                        <Link
                          to="/supplies/$slug"
                          params={{ slug: i.slug }}
                          className="font-medium hover:text-primary"
                        >
                          {i.title}
                        </Link>
                      ) : (
                        <Link
                          to="/artworks/$slug"
                          params={{ slug: i.slug }}
                          className="font-medium hover:text-primary"
                        >
                          {i.title}
                        </Link>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatZmw(i.priceZmw)} {i.itemType === "SUPPLY" ? "each" : ""}
                      </p>
                      {!i.available && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" /> No longer available — remove it to
                          check out
                        </p>
                      )}
                    </div>
                    {i.maxQuantity > 1 && i.available ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(i, i.quantity - 1)}
                          disabled={i.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{i.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(i, i.quantity + 1)}
                          disabled={i.quantity >= i.maxQuantity}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">× {i.quantity}</span>
                    )}
                    <p className="w-24 text-right font-semibold">
                      {formatZmw(Number(i.priceZmw) * i.quantity)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(i.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="font-display text-2xl font-semibold">{formatZmw(total)}</p>
                </div>
                <p className="max-w-xs text-right text-xs text-muted-foreground">
                  No extra buyer fees. Sellers' delivery charges, discount codes and gift cards are
                  applied below.
                </p>
              </div>
            </div>
            <div className="lg:sticky lg:top-36">
              {unavailable.length > 0 ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  Remove{" "}
                  {unavailable.length === 1
                    ? "the unavailable item"
                    : `the ${unavailable.length} unavailable items`}{" "}
                  to continue to checkout.
                </p>
              ) : (
                <CheckoutForm
                  busy={paying}
                  onSubmit={pay}
                  submitLabel={
                    quote && Number(quote.totalZmw) === 0
                      ? "Place order"
                      : `Pay ${formatZmw(quote?.totalZmw ?? total)}`
                  }
                  requireShipping
                  codes
                  onDraftChange={onDraftChange}
                  nothingToPay={!!quote && Number(quote.totalZmw) === 0}
                  summary={<PriceSummary quote={quote} loading={quoting} />}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
