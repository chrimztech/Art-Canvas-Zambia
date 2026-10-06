import { Link } from "@tanstack/react-router";
import { Heart, Palette } from "lucide-react";
import type { ArtworkSummary } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import { cn, formatZmw } from "@/lib/utils";

/** Grid tile used across browse, artist profiles and favorites, with a save-to-favorites toggle. */
export function ArtworkCard({
  artwork,
  showArtist = true,
}: {
  artwork: ArtworkSummary;
  showArtist?: boolean;
}) {
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(artwork.id);
  const sold = artwork.status === "sold";

  return (
    <div className="group relative">
      <Link to="/artworks/$slug" params={{ slug: artwork.slug }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
          {artwork.coverImageUrl ? (
            <img
              src={artwork.coverImageUrl}
              alt={artwork.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Palette className="h-8 w-8 text-muted-foreground/60" />
            </div>
          )}
          {sold && (
            <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-foreground">
              Sold
            </span>
          )}
        </div>
        <div className="mt-3">
          <h3 className="line-clamp-1 font-medium group-hover:text-primary">{artwork.title}</h3>
          {showArtist && (
            <p className="text-xs text-muted-foreground">
              {artwork.artistDisplayName ?? "Artist"}
              {artwork.medium ? ` · ${artwork.medium}` : ""}
            </p>
          )}
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              sold && "text-muted-foreground line-through",
            )}
          >
            {formatZmw(artwork.priceZmw)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(artwork.id)}
        aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        aria-pressed={saved}
        className="absolute right-2 top-2 rounded-full bg-background/85 p-2 shadow-sm backdrop-blur transition hover:scale-110"
      >
        <Heart className={cn("h-4 w-4", saved ? "fill-primary text-primary" : "text-foreground")} />
      </button>
    </div>
  );
}
