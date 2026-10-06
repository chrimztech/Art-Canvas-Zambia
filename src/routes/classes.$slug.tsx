import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api, hasSession } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, ClassItem } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/checkout-form";
import { Calendar, CheckCircle2, Clock, MapPin, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { errorMessage, formatZmw } from "@/lib/utils";
import { MessageButton } from "@/components/message-button";
import { SellerReviews } from "@/components/seller-reviews";
import { AddToCalendar } from "@/components/add-to-calendar";
import { ReportButton } from "@/components/report-button";
import { WaitlistButton } from "@/components/waitlist-button";

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

  const load = useCallback(
    () =>
      api
        .get<ClassItem>(`/api/classes/${slug}`)
        .then(setCls)
        .catch(() => setCls(null))
        .finally(() => setLoading(false)),
    [slug],
  );

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function enrollFree() {
    if (!cls) return;
    if (!hasSession()) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/classes/${cls.id}/enroll`);
      toast.success("You're enrolled! See it under My classes.");
      void load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not enroll"));
    } finally {
      setBusy(false);
    }
  }

  async function checkout(req: CheckoutRequest) {
    if (!cls) return;
    if (!hasSession()) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<CheckoutResponse>(`/api/classes/${cls.id}/checkout`, req);
      const message = await continuePayment(res);
      if (message === null) return; // leaving for the gateway's hosted page
      toast.success(
        res.widget
          ? message
          : (res.message ?? "Payment started — you'll be enrolled once it's confirmed."),
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
  if (!cls)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10">
          Class not found.{" "}
          <Link to="/classes" className="text-primary hover:underline">
            Back to classes
          </Link>
        </div>
      </div>
    );

  const free = Number(cls.priceZmw) <= 0;
  const seatsLeft = Math.max(cls.capacity - cls.enrolledCount, 0);
  const ended = new Date(cls.endsAt).getTime() < Date.now();
  const closed = cls.status !== "published" || ended;
  const hours =
    Math.round(((new Date(cls.endsAt).getTime() - new Date(cls.startsAt).getTime()) / 36e5) * 10) /
    10;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link to="/classes" className="text-sm text-muted-foreground hover:text-foreground">
          ← All classes
        </Link>
        {cls.coverImageUrl && (
          <img
            src={cls.coverImageUrl}
            alt={cls.title}
            className="mt-4 aspect-video w-full rounded-2xl object-cover"
          />
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {cls.skillLevel && (
            <Badge variant="secondary" className="capitalize">
              {cls.skillLevel}
            </Badge>
          )}
          <Badge variant="outline">
            {cls.mode === "in_person" ? "In person" : cls.mode === "online" ? "Online" : "Hybrid"}
          </Badge>
          {cls.materialsIncluded && <Badge variant="outline">Materials included</Badge>}
          {cls.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold">{cls.title}</h1>
        <p className="mt-2 text-muted-foreground">
          with{" "}
          <Link
            to="/artists/$id"
            params={{ id: cls.instructorId }}
            className="font-medium text-foreground hover:text-primary"
          >
            {cls.instructorDisplayName ?? "Instructor"}
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(cls.startsAt).toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {hours} hrs
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {cls.mode === "online" ? "Online" : cls.location || "TBA"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {seatsLeft > 0 ? `${seatsLeft} of ${cls.capacity} seats left` : "Fully booked"}
          </span>
        </div>

        {cls.description && (
          <p className="mt-6 whitespace-pre-line text-foreground/90">{cls.description}</p>
        )}
        {cls.syllabus && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold">What you'll cover</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">
              {cls.syllabus
                .split("\n")
                .filter((l) => l.trim())
                .map((l) => (
                  <li key={l}>{l.replace(/^[-*•]\s*/, "")}</li>
                ))}
            </ul>
          </div>
        )}
        {cls.prerequisites && (
          <p className="mt-4 text-sm">
            <span className="font-medium">Prerequisites:</span> {cls.prerequisites}
          </p>
        )}
        <div className="mt-4">
          <MessageButton
            recipientId={cls.instructorId}
            recipientName={cls.instructorDisplayName}
            contextType="CLASS"
            contextId={cls.id}
            label="Ask the instructor"
            size="sm"
          />
          {!ended && (
            <AddToCalendar
              event={{
                title: cls.title,
                startsAt: cls.startsAt,
                endsAt: cls.endsAt,
                location: cls.mode === "online" ? "Online" : cls.location,
                description: cls.description,
              }}
            />
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-display text-2xl font-semibold">
              {free ? "Free" : formatZmw(cls.priceZmw)}
            </p>
          </div>
          {cls.enrolled ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                You're enrolled
              </span>
              {cls.meetingUrl && (
                <Button asChild>
                  <a href={cls.meetingUrl} target="_blank" rel="noreferrer">
                    <Video className="h-4 w-4" />
                    Join link
                  </a>
                </Button>
              )}
            </div>
          ) : closed ? (
            <span className="text-sm text-muted-foreground">
              {ended ? "This class has ended." : "Enrollment is closed."}
            </span>
          ) : seatsLeft === 0 ? (
            <div className="w-full space-y-2 sm:w-64">
              <p className="text-sm text-muted-foreground">Fully booked</p>
              <WaitlistButton itemType="CLASS" itemId={cls.id} />
            </div>
          ) : free ? (
            <Button size="lg" onClick={enrollFree} disabled={busy}>
              {busy ? "Enrolling…" : "Enroll for free"}
            </Button>
          ) : null}
        </div>
        {!free && !cls.enrolled && !closed && seatsLeft > 0 && (
          <div className="mt-4">
            <CheckoutForm
              busy={busy}
              onSubmit={checkout}
              submitLabel={`Enroll & pay ${formatZmw(cls.priceZmw)}`}
              codes
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Discount codes and gift cards are deducted from the amount charged.
            </p>
          </div>
        )}
        <div className="mt-4 text-right">
          <ReportButton targetType="CLASS" targetId={cls.id} label="Report this class" />
        </div>

        <div className="mt-12">
          <SellerReviews
            sellerId={cls.instructorId}
            title={`Reviews of ${cls.instructorDisplayName ?? "this instructor"}`}
          />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
