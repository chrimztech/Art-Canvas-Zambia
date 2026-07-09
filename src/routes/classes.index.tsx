import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api-client";
import type { ClassItem } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { GraduationCap, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: () => api.get<ClassItem[]>("/api/classes"),
});

export const Route = createFileRoute("/classes/")({
  head: () => ({
    meta: [
      { title: "Art Classes — ChrisEpic Arts" },
      { name: "description", content: "Learn from Zambian artists. Online and in-person classes in painting, drawing, sculpture and more." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(classesQuery),
  component: Classes,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Classes() {
  const { data } = useSuspenseQuery(classesQuery);
  const navigate = useNavigate();

  async function enroll(classId: string) {
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    try {
      await api.post(`/api/classes/${classId}/enroll`);
      toast.success("Enrolled! The instructor will be in touch.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not enroll");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold">Art classes</h1>
            <p className="mt-2 text-muted-foreground">Learn from working artists across Zambia.</p>
          </div>
          <Link to="/dashboard/new-class" className="text-sm font-medium text-primary hover:underline">Teach a class →</Link>
        </div>

        {data.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 font-display text-xl font-semibold">No classes scheduled yet</h2>
            <p className="mt-2 text-muted-foreground">Check back soon.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[16/9] bg-muted">
                  {c.coverImageUrl && <img src={c.coverImageUrl} alt={c.title} className="h-full w-full object-cover" />}
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.mode.replace("_", "-")}</p>
                  <Link to="/classes/$slug" params={{ slug: c.slug }} className="mt-1 block font-display text-lg font-semibold line-clamp-1 hover:text-primary">{c.title}</Link>
                  <p className="text-xs text-muted-foreground">with {c.instructorDisplayName ?? "Instructor"}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(c.startsAt).toLocaleDateString()} · {new Date(c.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    {c.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.location}</div>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-semibold">{Number(c.priceZmw) === 0 ? "Free" : `K${Number(c.priceZmw).toLocaleString()}`}</span>
                    <Button size="sm" onClick={() => enroll(c.id)}>Enroll</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
