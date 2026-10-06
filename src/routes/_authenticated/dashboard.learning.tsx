import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Enrollment } from "@/lib/types";
import { AddToCalendar } from "@/components/add-to-calendar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, GraduationCap, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/learning")({
  head: () => ({ meta: [{ title: "My classes — ChrisEpic Arts" }] }),
  component: Learning,
});

const STATUS_LABEL: Record<string, string> = {
  paid: "Confirmed",
  attended: "Attended",
  pending: "Awaiting payment",
  cancelled: "Cancelled",
};

function Learning() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Enrollment[]>("/api/me/enrollments")
      .then(setRows)
      .catch((e) => toast.error(errorMessage(e, "Could not load your classes")))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const upcoming = rows.filter((r) => r.endsAt && new Date(r.endsAt).getTime() >= now);
  const past = rows.filter((r) => !r.endsAt || new Date(r.endsAt).getTime() < now);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <h1 className="font-display text-3xl font-semibold">My classes</h1>
        <p className="mt-1 text-muted-foreground">
          Classes you've enrolled in. Online joining links appear once your seat is confirmed.
        </p>

        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-muted-foreground">You haven't enrolled in any classes yet.</p>
            <Link to="/classes" className="mt-3 inline-block text-primary hover:underline">
              Browse classes →
            </Link>
          </div>
        ) : (
          <>
            <Group title="Upcoming" rows={upcoming} empty="No upcoming classes." />
            {past.length > 0 && <Group title="Past" rows={past} empty="" />}
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, rows, empty }: { title: string; rows: Enrollment[]; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {rows.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row"
            >
              <div className="h-24 w-full shrink-0 overflow-hidden rounded bg-muted sm:w-32">
                {e.classCoverImageUrl && (
                  <img src={e.classCoverImageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {e.classSlug ? (
                    <Link
                      to="/classes/$slug"
                      params={{ slug: e.classSlug }}
                      className="font-medium hover:text-primary"
                    >
                      {e.classTitle}
                    </Link>
                  ) : (
                    <span className="font-medium">{e.classTitle ?? "Class"}</span>
                  )}
                  <Badge
                    variant={
                      e.status === "paid" || e.status === "attended" ? "default" : "secondary"
                    }
                  >
                    {STATUS_LABEL[e.status] ?? e.status}
                  </Badge>
                </div>
                {e.instructorDisplayName && (
                  <p className="text-muted-foreground">with {e.instructorDisplayName}</p>
                )}
                {e.startsAt && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(e.startsAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                {e.mode !== "online" && e.location && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {e.location}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {e.meetingUrl && (
                    <Button size="sm" asChild>
                      <a href={e.meetingUrl} target="_blank" rel="noreferrer">
                        <Video className="h-4 w-4" />
                        Join online
                      </a>
                    </Button>
                  )}
                  {e.startsAt && e.endsAt && new Date(e.endsAt).getTime() > Date.now() && (
                    <AddToCalendar
                      event={{
                        title: e.classTitle ?? "Class",
                        startsAt: e.startsAt,
                        endsAt: e.endsAt,
                        location: e.mode === "online" ? (e.meetingUrl ?? "Online") : e.location,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
