import { Link } from "@tanstack/react-router";
import type { CollectionSummary } from "@/lib/types";

export function CollectionCard({ collection: c }: { collection: CollectionSummary }) {
  const images = c.coverImageUrl ? [c.coverImageUrl] : c.previewImages.slice(0, 4);
  return (
    <Link
      to="/collections/$slug"
      params={{ slug: c.slug }}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50"
    >
      <div
        className={
          images.length > 1
            ? "grid aspect-[4/3] grid-cols-2 gap-0.5 bg-muted"
            : "aspect-[4/3] bg-muted"
        }
      >
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:opacity-90"
          />
        ))}
      </div>
      <div className="p-4">
        <h2 className="font-display text-xl font-semibold group-hover:text-primary">{c.title}</h2>
        <p className="text-sm text-muted-foreground">
          {c.artworkCount} {c.artworkCount === 1 ? "work" : "works"}
        </p>
        {c.description && (
          <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.description}</p>
        )}
      </div>
    </Link>
  );
}
