import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api-client";
import type { Exhibition } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Ticket, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

const exhibitionsQuery = queryOptions({
  queryKey: ["exhibitions"],
  queryFn: () => api.get<Exhibition[]>("/api/exhibitions"),
});

export const Route = createFileRoute("/exhibitions/")({
  head: () => ({
    meta: [
      { title: "Exhibitions — ChrisEpic Arts" },
      { name: "description", content: "Upcoming art exhibitions, openings and gallery events across Zambia." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(exhibitionsQuery),
  component: Exhibitions,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Exhibitions() {
  const { data } = useSuspenseQuery(exhibitionsQuery);
  const navigate = useNavigate();

  async function book(exhibitionId: string) {
    if (!getAuthToken()) { navigate({ to: "/auth" }); return; }
    try {
      await api.post(`/api/exhibitions/${exhibitionId}/tickets`, { quantity: 1 });
      toast.success("Ticket reserved! Check your dashboard for details.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not book ticket");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold">Exhibitions</h1>
            <p className="mt-2 text-muted-foreground">Openings, group shows and gallery events.</p>
          </div>
          <Link to="/dashboard/new-exhibition" className="text-sm font-medium text-primary hover:underline">Host an exhibition →</Link>
        </div>

        {data.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 font-display text-xl font-semibold">No exhibitions scheduled</h2>
            <p className="mt-2 text-muted-foreground">Galleries and organizers — list your event from the dashboard.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {data.map((e) => (
              <article key={e.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[3/2] bg-muted">
                  {e.coverImageUrl && <img src={e.coverImageUrl} alt={e.title} className="h-full w-full object-cover" />}
                </div>
                <div className="p-6">
                  <Link to="/exhibitions/$slug" params={{ slug: e.slug }} className="font-display text-xl font-semibold hover:text-primary">{e.title}</Link>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(e.startsAt).toLocaleDateString()} – {new Date(e.endsAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{e.venue}{e.city ? `, ${e.city}` : ""}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-semibold">{Number(e.ticketPriceZmw) === 0 ? "Free entry" : `K${Number(e.ticketPriceZmw).toLocaleString()} / ticket`}</span>
                    <Button size="sm" onClick={() => book(e.id)}>{Number(e.ticketPriceZmw) === 0 ? "Reserve" : "Book ticket"}</Button>
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
