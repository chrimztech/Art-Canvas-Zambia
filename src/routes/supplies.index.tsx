import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Supply } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Package } from "lucide-react";

const suppliesQuery = queryOptions({
  queryKey: ["supplies"],
  queryFn: () => api.get<Supply[]>("/api/supplies"),
});

export const Route = createFileRoute("/supplies/")({
  head: () => ({
    meta: [
      { title: "Art Supplies — ChrisEpic Arts" },
      {
        name: "description",
        content: "Paint, brushes, canvas, paper and tools from Zambian art-supply sellers.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(suppliesQuery),
  component: Supplies,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Supplies() {
  const { data } = useSuspenseQuery(suppliesQuery);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold">Art supplies</h1>
            <p className="mt-2 text-muted-foreground">
              Materials from local sellers — new and second-hand.
            </p>
          </div>
          <Link
            to="/dashboard/new-supply"
            className="text-sm font-medium text-primary hover:underline"
          >
            Sell supplies →
          </Link>
        </div>

        {data.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 font-display text-xl font-semibold">No supplies listed yet</h2>
            <p className="mt-2 text-muted-foreground">
              Sellers, list your first item from the dashboard.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.map((s) => (
              <Link key={s.id} to="/supplies/$slug" params={{ slug: s.slug }} className="group">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {s.coverImageUrl ? (
                    <img
                      src={s.coverImageUrl}
                      alt={s.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <h3 className="font-medium line-clamp-1 group-hover:text-primary">{s.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {s.category ?? "Supplies"} · {s.condition}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    K{Number(s.priceZmw).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.stock} in stock</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
