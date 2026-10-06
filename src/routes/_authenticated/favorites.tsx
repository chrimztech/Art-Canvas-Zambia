import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ArtworkSummary } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArtworkCard } from "@/components/artwork-card";
import { useFavorites } from "@/hooks/use-favorites";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — ChrisEpic Arts" }] }),
  component: Favorites,
});

function Favorites() {
  const { ids } = useFavorites();
  const { data = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<ArtworkSummary[]>("/api/me/favorites"),
  });
  // Hide un-saved pieces immediately, before the list refetches.
  const artworks = data.filter((a) => ids.includes(a.id));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-12">
        <h1 className="font-display text-4xl font-semibold">Favorites</h1>
        <p className="mt-2 text-muted-foreground">
          Artworks you've saved. Pieces sell fast — originals are one of a kind.
        </p>
        {isLoading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : artworks.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 font-display text-xl font-semibold">Nothing saved yet</h2>
            <p className="mt-2 text-muted-foreground">
              Tap the heart on any artwork to keep it here.
            </p>
            <Link
              to="/browse"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse art →
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {artworks.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
