import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, hasSession } from "@/lib/api-client";
import type { SupplyDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Package, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn, errorMessage, formatZmw } from "@/lib/utils";
import { MessageButton } from "@/components/message-button";
import { ReportButton } from "@/components/report-button";

import { RatingBadge } from "@/components/star-rating";
import { useSellerReviews } from "@/hooks/use-seller-reviews";

export const Route = createFileRoute("/supplies/$slug")({
  head: () => ({ meta: [{ title: "Supply — ChrisEpic Arts" }] }),
  component: SupplyDetailPage,
});

function SupplyDetailPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const [s, setS] = useState<SupplyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [active, setActive] = useState(0);
  const { data: sellerReviews } = useSellerReviews(s?.sellerId ?? "");

  useEffect(() => {
    setLoading(true);
    api
      .get<SupplyDetail>(`/api/supplies/${slug}`)
      .then(setS)
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function addToCart() {
    if (!s) return;
    if (!hasSession()) {
      toast.error("Please sign in to add to cart");
      return;
    }
    try {
      await api.post("/api/cart", { artworkId: s.id, quantity, itemType: "SUPPLY" });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => (window.location.href = "/cart") },
      });
    } catch (e) {
      toast.error(errorMessage(e, "Could not add to cart"));
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );
  if (!s)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10">
          Supply not found.{" "}
          <Link to="/supplies" className="text-primary hover:underline">
            Back
          </Link>
        </div>
      </div>
    );

  const gallery = [s.coverImageUrl, ...s.images].filter((u): u is string => !!u);
  const specs: [string, string | null][] = [
    ["Brand", s.brand],
    ["SKU", s.sku],
    ["Dimensions", s.dimensions],
    ["Weight", s.weightKg ? `${s.weightKg} kg` : null],
    ["Warranty", s.warrantyMonths ? `${s.warrantyMonths} months` : null],
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/supplies" className="text-sm text-muted-foreground hover:text-foreground">
          ← All supplies
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
              {gallery[active] ? (
                <img src={gallery[active]} alt={s.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/40" />
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {gallery.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show image ${i + 1}`}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-md border-2",
                      i === active ? "border-primary" : "border-transparent opacity-70",
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              {s.category && (
                <Badge variant="secondary" className="capitalize">
                  {s.category}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {s.condition}
              </Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold">{s.name}</h1>
            <p className="mt-3 font-display text-3xl font-semibold text-primary">
              {formatZmw(s.priceZmw)}
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                s.stock > 0 ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {s.stock > 0 ? `${s.stock} in stock` : "Out of stock"}
              {" · "}
              {s.shippingFeeZmw && Number(s.shippingFeeZmw) > 0
                ? `${formatZmw(s.shippingFeeZmw)} delivery`
                : "free delivery or collection"}
            </p>
            {s.sellerOnVacation && (
              <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                {s.sellerDisplayName ?? "The seller"} is away and not taking orders right now.
                {s.sellerVacationMessage && ` “${s.sellerVacationMessage}”`}
              </p>
            )}
            {s.description && (
              <p className="mt-6 whitespace-pre-line text-foreground/90">{s.description}</p>
            )}
            {specs.some(([, v]) => v) && (
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {specs
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {s.sellerDisplayName && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Sold by</p>
                <p className="font-medium">{s.sellerDisplayName}</p>
                {sellerReviews && (
                  <RatingBadge average={sellerReviews.average} count={sellerReviews.count} />
                )}
                {s.sellerLocation && (
                  <p className="text-sm text-muted-foreground">{s.sellerLocation}</p>
                )}
                {s.sellerPhone && (
                  <a
                    href={`tel:${s.sellerPhone.replace(/\s+/g, "")}`}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    Call {s.sellerPhone}
                  </a>
                )}
                <div className="mt-2">
                  <MessageButton
                    recipientId={s.sellerId}
                    recipientName={s.sellerDisplayName}
                    contextType="SUPPLY"
                    contextId={s.id}
                    label="Message seller"
                    size="sm"
                  />
                </div>
              </div>
            )}
            {s.stock > 0 && (
              <div className="mt-6 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(q + 1, s.stock))}
                  disabled={quantity >= s.stock}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={addToCart}
              disabled={s.stock <= 0 || s.status !== "published" || s.sellerOnVacation}
            >
              <ShoppingCart className="h-4 w-4" />
              {s.stock > 0
                ? `Add to cart · ${formatZmw(Number(s.priceZmw) * quantity)}`
                : "Out of stock"}
            </Button>
            <div className="mt-4 text-right">
              <ReportButton targetType="SUPPLY" targetId={s.id} label="Report this listing" />
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
