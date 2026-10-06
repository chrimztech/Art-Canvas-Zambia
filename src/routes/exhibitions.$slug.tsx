import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api, hasSession } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, Exhibition } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/checkout-form";
import { Calendar, Mail, MapPin, Phone, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { errorMessage, formatZmw } from "@/lib/utils";
import { MessageButton } from "@/components/message-button";
import { AddToCalendar } from "@/components/add-to-calendar";
import { ReportButton } from "@/components/report-button";
import { WaitlistButton } from "@/components/waitlist-button";

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
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(
    () =>
      api
        .get<Exhibition>(`/api/exhibitions/${slug}`)
        .then(setEx)
        .catch(() => setEx(null))
        .finally(() => setLoading(false)),
    [slug],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function bookFree() {
    if (!ex) return;
    if (!hasSession()) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/exhibitions/${ex.id}/tickets`, { quantity });
      toast.success("Ticket booked! Your QR code is under My tickets.", {
        action: { label: "View", onClick: () => navigate({ to: "/dashboard/tickets" }) },
      });
      void load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not book ticket"));
    } finally {
      setBusy(false);
    }
  }

  async function checkout(req: CheckoutRequest) {
    if (!ex) return;
    if (!hasSession()) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<CheckoutResponse>(
        `/api/exhibitions/${ex.id}/checkout?quantity=${quantity}`,
        req,
      );
      const message = await continuePayment(res);
      if (message === null) return; // leaving for the gateway's hosted page
      toast.success(
        res.widget
          ? message
          : (res.message ?? "Payment started — your ticket will be confirmed once it clears."),
      );
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e) {
      toast.error(errorMessage(e, "Could not start checkout"));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );
  if (!ex)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10">
          Exhibition not found.{" "}
          <Link to="/exhibitions" className="text-primary hover:underline">
            Back
          </Link>
        </div>
      </div>
    );

  const free = Number(ex.ticketPriceZmw) <= 0;
  const left = ex.capacity != null ? Math.max(ex.capacity - ex.ticketsSold, 0) : null;
  const maxQty = Math.min(left ?? 10, 10);
  const ended = new Date(ex.endsAt).getTime() < Date.now();
  const closed = ex.status !== "published" || ended || left === 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link to="/exhibitions" className="text-sm text-muted-foreground hover:text-foreground">
          ← All exhibitions
        </Link>
        {ex.coverImageUrl && (
          <img
            src={ex.coverImageUrl}
            alt={ex.title}
            className="mt-4 aspect-video w-full rounded-2xl object-cover"
          />
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {ex.isFeatured && <Badge>Featured</Badge>}
          {ex.theme && <Badge variant="secondary">{ex.theme}</Badge>}
          {ex.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold">{ex.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(ex.startsAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            – {new Date(ex.endsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {ex.venue}
            {ex.city ? `, ${ex.city}` : ""}
          </span>
          {ex.curatorName && (
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Curated by {ex.curatorName}
            </span>
          )}
          {left != null && (
            <span className="flex items-center gap-1">
              <Ticket className="h-4 w-4" />
              {left > 0 ? `${left} tickets left` : "Sold out"}
            </span>
          )}
        </div>
        {ex.description && (
          <p className="mt-6 whitespace-pre-line text-foreground/90">{ex.description}</p>
        )}
        {(ex.contactEmail || ex.contactPhone) && (
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {ex.contactEmail && (
              <a
                href={`mailto:${ex.contactEmail}`}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {ex.contactEmail}
              </a>
            )}
            {ex.contactPhone && (
              <a
                href={`tel:${ex.contactPhone.replace(/\s+/g, "")}`}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {ex.contactPhone}
              </a>
            )}
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Hosted by{" "}
          <Link
            to="/artists/$id"
            params={{ id: ex.organizerId }}
            className="text-foreground hover:text-primary"
          >
            {ex.organizerDisplayName ?? "the organiser"}
          </Link>
        </p>
        <div className="mt-3">
          <MessageButton
            recipientId={ex.organizerId}
            recipientName={ex.organizerDisplayName}
            contextType="EXHIBITION"
            contextId={ex.id}
            label="Message the organiser"
            size="sm"
          />
          {!ended && (
            <AddToCalendar
              event={{
                title: ex.title,
                startsAt: ex.startsAt,
                endsAt: ex.endsAt,
                location: [ex.venue, ex.city].filter(Boolean).join(", "),
                description: ex.description,
              }}
            />
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm text-muted-foreground">Ticket</p>
            <p className="font-display text-2xl font-semibold">
              {free ? "Free" : `${formatZmw(ex.ticketPriceZmw)} each`}
            </p>
          </div>
          {closed ? (
            <div className="w-full space-y-2 sm:w-64">
              <p className="text-sm text-muted-foreground">
                {ended
                  ? "This exhibition has ended."
                  : left === 0
                    ? "Sold out"
                    : "Tickets aren't available."}
              </p>
              {!ended && left === 0 && ex.status === "published" && (
                <WaitlistButton itemType="EXHIBITION" itemId={ex.id} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                Tickets
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3"
                >
                  {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              {free && (
                <Button size="lg" onClick={bookFree} disabled={busy}>
                  {busy ? "Booking…" : "Get free tickets"}
                </Button>
              )}
            </div>
          )}
        </div>
        {!free && !closed && (
          <div className="mt-4">
            <CheckoutForm
              busy={busy}
              onSubmit={checkout}
              submitLabel={`Pay ${formatZmw(Number(ex.ticketPriceZmw) * quantity)}`}
              codes
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Discount codes and gift cards are deducted from the amount charged.
            </p>
          </div>
        )}
        <div className="mt-4 text-right">
          <ReportButton targetType="EXHIBITION" targetId={ex.id} label="Report this event" />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
