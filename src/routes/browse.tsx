import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ArtworkSummary, Category } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Palette } from "lucide-react";

const browseQuery = queryOptions({
  queryKey: ["browse-artworks"],
  queryFn: async () => {
    const [artworks, categories] = await Promise.all([
      api.get<ArtworkSummary[]>("/api/artworks"),
      api.get<Category[]>("/api/categories"),
    ]);
    return { artworks, categories };
  },
});

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse Art — ChrisEpic Arts" },
      { name: "description", content: "Browse original paintings, sculpture, photography and prints from Zambian artists." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(browseQuery),
  component: Browse,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">Failed to load: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Browse() {
  const { data } = useSuspenseQuery(browseQuery);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold">Browse art</h1>
        <p className="mt-2 text-muted-foreground">{data.artworks.length} {data.artworks.length === 1 ? "piece" : "pieces"} from Zambian artists</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <button key={c.id} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm hover:border-primary hover:text-primary">
              {c.name}
            </button>
          ))}
        </div>

        {data.artworks.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Palette className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 font-display text-xl font-semibold">No artworks yet</h2>
            <p className="mt-2 text-muted-foreground">Check back soon — or be the first to list your work.</p>
            <Link to="/auth" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Become a seller →</Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.artworks.map((a) => (
              <Link key={a.id} to="/artworks/$slug" params={{ slug: a.slug }} className="group">
                <div className="aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                  {a.coverImageUrl
                    ? <img src={a.coverImageUrl} alt={a.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center"><Palette className="h-8 w-8 text-muted-foreground/60" /></div>}
                </div>
                <div className="mt-3">
                  <h3 className="font-medium line-clamp-1">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">{a.artistDisplayName ?? "Artist"} · {a.medium ?? "—"}</p>
                  <p className="mt-1 text-sm font-semibold">K{Number(a.priceZmw).toLocaleString()}</p>
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
