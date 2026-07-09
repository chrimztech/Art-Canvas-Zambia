import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api-client";
import type { SupplyDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/supplies/$slug")({
  head: () => ({ meta: [{ title: "Supply — ChrisEpic Arts" }] }),
  component: SupplyDetailPage,
});

function SupplyDetailPage() {
  const { slug } = Route.useParams();
  const [s, setS] = useState<SupplyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<SupplyDetail>(`/api/supplies/${slug}`)
      .then(setS)
      .catch(() => setS(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function addToCart() {
    if (!s) return;
    if (!getAuthToken()) { toast.error("Please sign in to add to cart"); return; }
    try {
      await api.post("/api/cart", { artworkId: s.id, quantity: 1, itemType: "SUPPLY" });
      toast.success("Added to cart");
    } catch (e: any) {
      toast.error(e.message ?? "Could not add to cart");
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!s) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10">Supply not found. <Link to="/supplies" className="text-primary hover:underline">Back</Link></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
          {s.coverImageUrl ? <img src={s.coverImageUrl} alt={s.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-muted-foreground/40" /></div>}
        </div>
        <div>
          <div className="flex gap-2">
            <Badge variant="secondary">{s.category}</Badge>
            <Badge variant="outline">{s.condition}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{s.name}</h1>
          <p className="mt-3 font-display text-3xl font-semibold text-primary">K{Number(s.priceZmw).toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted-foreground">{s.stock} in stock</p>
          {s.description && <p className="mt-6 whitespace-pre-line text-foreground/90">{s.description}</p>}
          {s.sellerDisplayName && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Sold by</p>
              <p className="font-medium">{s.sellerDisplayName ?? "Seller"}</p>
              {s.sellerLocation && <p className="text-sm text-muted-foreground">{s.sellerLocation}</p>}
              {s.sellerPhone && <p className="mt-2 text-sm">📞 {s.sellerPhone}</p>}
            </div>
          )}
          <Button size="lg" className="mt-6 w-full" onClick={addToCart} disabled={s.stock <= 0}>
            <ShoppingCart className="h-4 w-4" />
            {s.stock > 0 ? "Add to cart" : "Out of stock"}
          </Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
