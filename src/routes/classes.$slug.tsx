import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, ClassItem } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "@/components/checkout-form";
import { Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/classes/$slug")({
  head: () => ({ meta: [{ title: "Class — ChrisEpic Arts" }] }),
  component: ClassDetail,
});

function ClassDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<ClassItem>(`/api/classes/${slug}`)
      .then(setCls)
      .catch(() => setCls(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function enrollFree() {
    if (!cls) return;
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      await api.post(`/api/classes/${cls.id}/enroll`);
      toast.success("Enrolled! Instructor will confirm.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not enroll");
    } finally {
      setBusy(false);
    }
  }

  async function checkout(req: CheckoutRequest) {
    if (!cls) return;
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      const res = await api.post<CheckoutResponse>(`/api/classes/${cls.id}/checkout`, req);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      toast.success(res.message ?? "Payment started — you'll be enrolled once it's confirmed.");
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!cls) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10">Class not found. <Link to="/classes" className="text-primary hover:underline">Back to classes</Link></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {cls.coverImageUrl && <img src={cls.coverImageUrl} alt={cls.title} className="aspect-video w-full rounded-2xl object-cover" />}
        <h1 className="mt-6 font-display text-4xl font-semibold">{cls.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(cls.startsAt).toLocaleString()}</span>
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{cls.mode === "online" ? "Online" : cls.location || "TBA"}</span>
          <span className="flex items-center gap-1"><Users className="h-4 w-4" />Capacity {cls.capacity}</span>
        </div>
        {cls.description && <p className="mt-6 whitespace-pre-line text-foreground/90">{cls.description}</p>}
        <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div><p className="text-sm text-muted-foreground">Price</p><p className="font-display text-2xl font-semibold">{Number(cls.priceZmw) > 0 ? `K${Number(cls.priceZmw).toLocaleString()}` : "Free"}</p></div>
          {Number(cls.priceZmw) <= 0 && (
            <Button size="lg" onClick={enrollFree} disabled={busy}>{busy ? "Enrolling…" : "Enroll"}</Button>
          )}
        </div>
        {Number(cls.priceZmw) > 0 && (
          <div className="mt-4">
            <CheckoutForm busy={busy} onSubmit={checkout} submitLabel="Enroll & pay" />
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
