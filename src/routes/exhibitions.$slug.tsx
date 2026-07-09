import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, Exhibition } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "@/components/checkout-form";
import { Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/exhibitions/$slug")({
  head: () => ({ meta: [{ title: "Exhibition — ChrisEpic Arts" }] }),
  component: ExhibitionDetail,
});

function ExhibitionDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [ex, setEx] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Exhibition>(`/api/exhibitions/${slug}`)
      .then(setEx)
      .catch(() => setEx(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function bookFree() {
    if (!ex) return;
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      await api.post(`/api/exhibitions/${ex.id}/tickets`, { quantity: 1 });
      toast.success("Ticket reserved!");
    } catch (e: any) {
      toast.error(e.message ?? "Could not book ticket");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(req: CheckoutRequest) {
    if (!ex) return;
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      const res = await api.post<CheckoutResponse>(`/api/exhibitions/${ex.id}/checkout?quantity=1`, req);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      toast.success(res.message ?? "Payment started — your ticket will be confirmed once it clears.");
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!ex) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10">Exhibition not found. <Link to="/exhibitions" className="text-primary hover:underline">Back</Link></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {ex.coverImageUrl && <img src={ex.coverImageUrl} alt={ex.title} className="aspect-video w-full rounded-2xl object-cover" />}
        <h1 className="mt-6 font-display text-4xl font-semibold">{ex.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(ex.startsAt).toLocaleDateString()} – {new Date(ex.endsAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{ex.venue}{ex.city ? `, ${ex.city}` : ""}</span>
        </div>
        {ex.description && <p className="mt-6 whitespace-pre-line text-foreground/90">{ex.description}</p>}
        <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div><p className="text-sm text-muted-foreground">Ticket</p><p className="font-display text-2xl font-semibold">{Number(ex.ticketPriceZmw) > 0 ? `K${Number(ex.ticketPriceZmw).toLocaleString()}` : "Free"}</p></div>
          {Number(ex.ticketPriceZmw) <= 0 && (
            <Button size="lg" onClick={bookFree} disabled={busy}>{busy ? "Booking…" : "Book ticket"}</Button>
          )}
        </div>
        {Number(ex.ticketPriceZmw) > 0 && (
          <div className="mt-4">
            <CheckoutForm busy={busy} onSubmit={checkout} submitLabel="Book & pay" />
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
