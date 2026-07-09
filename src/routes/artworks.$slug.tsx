import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api-client";
import type { ArtworkDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const artworkQuery = (slug: string) => queryOptions({
  queryKey: ["artwork", slug],
  queryFn: async () => {
    try {
      return await api.get<ArtworkDetail>(`/api/artworks/${slug}`);
    } catch {
      throw notFound();
    }
  },
});

export const Route = createFileRoute("/artworks/$slug")({
  head: ({ loaderData }) => {
    const d = loaderData as ArtworkDetail | undefined;
    return {
      meta: [
        { title: `${d?.title ?? "Artwork"} — ChrisEpic Arts` },
        { name: "description", content: d?.description?.slice(0, 160) ?? "Original art from Zambia" },
        { property: "og:title", content: d?.title ?? "Artwork" },
        { property: "og:image", content: d?.coverImageUrl ?? "" },
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(artworkQuery(params.slug)),
  component: ArtworkDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-12 text-center"><h1 className="font-display text-3xl">Artwork not found</h1><Link to="/browse" className="mt-4 inline-block text-primary">← Browse</Link></div>
  ),
});

function ArtworkDetailPage() {
  const { slug } = Route.useParams();
  const { data: a } = useSuspenseQuery(artworkQuery(slug));

  async function addToCart() {
    if (!getAuthToken()) { toast.error("Please sign in to add to cart"); return; }
    try {
      await api.post("/api/cart", { artworkId: a.id, quantity: 1 });
      toast.success("Added to cart");
    } catch (e: any) {
      toast.error(e.message ?? "Could not add to cart");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">← Back to browse</Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-muted">
            {a.coverImageUrl && <img src={a.coverImageUrl} alt={a.title} className="w-full" />}
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold">{a.title}</h1>
            <p className="mt-2 text-muted-foreground">by {a.artistDisplayName ?? "Artist"}</p>
            <p className="mt-6 font-display text-3xl font-semibold text-primary">K{Number(a.priceZmw).toLocaleString()}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {a.medium && <div><dt className="text-muted-foreground">Medium</dt><dd className="mt-0.5 font-medium">{a.medium}</dd></div>}
              {a.dimensions && <div><dt className="text-muted-foreground">Dimensions</dt><dd className="mt-0.5 font-medium">{a.dimensions}</dd></div>}
              {a.yearCreated && <div><dt className="text-muted-foreground">Year</dt><dd className="mt-0.5 font-medium">{a.yearCreated}</dd></div>}
              <div><dt className="text-muted-foreground">Type</dt><dd className="mt-0.5 font-medium">{a.isOriginal ? "Original" : "Print"}</dd></div>
            </dl>
            {a.description && <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{a.description}</p>}
            <div className="mt-8 flex gap-3">
              <Button size="lg" onClick={addToCart} disabled={a.status === "sold"}>{a.status === "sold" ? "Sold" : "Add to cart"}</Button>
              <Button size="lg" variant="outline">Commission similar</Button>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
