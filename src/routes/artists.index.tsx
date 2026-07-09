import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtistSummary } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Palette } from "lucide-react";

export const Route = createFileRoute("/artists/")({
  head: () => ({
    meta: [
      { title: "Artists — ChrisEpic Arts" },
      { name: "description", content: "Discover Zambian artists creating original work on ChrisEpic Arts." },
      { property: "og:title", content: "Artists on ChrisEpic Arts" },
      { property: "og:description", content: "Browse Zambian painters, photographers, sculptors and more." },
    ],
  }),
  component: Artists,
});

function Artists() {
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ArtistSummary[]>("/api/artists").then((data) => {
      setArtists([...data].sort((a, b) => b.artworkCount - a.artworkCount));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold">Artists</h1>
        <p className="mt-2 text-muted-foreground">Zambian creators selling original work on ChrisEpic Arts.</p>

        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading…</p>
        ) : artists.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No artists yet. <Link to="/sell" className="text-primary hover:underline">Be the first to join.</Link>
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <Link
                key={a.id}
                to="/artists/$id"
                params={{ id: a.id }}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  {a.avatarUrl ? (
                    <img src={a.avatarUrl} alt={a.displayName ?? "Artist"} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                      <Palette className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold group-hover:text-primary">{a.displayName ?? "Artist"}</p>
                    <p className="text-xs text-muted-foreground">{a.location ? `${a.location} · ` : ""}{a.artworkCount} {a.artworkCount === 1 ? "artwork" : "artworks"}</p>
                  </div>
                </div>
                {a.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{a.bio}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
