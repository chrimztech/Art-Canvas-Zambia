import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, hasSession } from "@/lib/api-client";
import type { ArtistDetail, ArtworkDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArtworkCard } from "@/components/artwork-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFavorites } from "@/hooks/use-favorites";
import { MessageButton } from "@/components/message-button";
import { RatingBadge } from "@/components/star-rating";
import { useSellerReviews } from "@/hooks/use-seller-reviews";
import { cn, errorMessage, formatZmw } from "@/lib/utils";
import { BadgeCheck, Brush, Heart, MapPin, Share2, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";

const artworkQuery = (slug: string) =>
  queryOptions({
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
        {
          name: "description",
          content: d?.description?.slice(0, 160) ?? "Original art from Zambia",
        },
        { property: "og:title", content: d?.title ?? "Artwork" },
        { property: "og:image", content: d?.coverImageUrl ?? "" },
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(artworkQuery(params.slug)),
  component: ArtworkDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <h1 className="font-display text-3xl">Artwork not found</h1>
      <Link to="/browse" className="mt-4 inline-block text-primary">
        ← Browse
      </Link>
    </div>
  ),
});

function ArtworkDetailPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: a } = useSuspenseQuery(artworkQuery(slug));
  const { isFavorite, toggle } = useFavorites();
  const gallery = [a.coverImageUrl, ...a.images].filter((u): u is string => !!u);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);

  const { data: artist } = useQuery({
    queryKey: ["artist", a.artistId],
    queryFn: () => api.get<ArtistDetail>(`/api/artists/${a.artistId}`),
  });
  const moreFromArtist = (artist?.artworks ?? []).filter((w) => w.id !== a.id).slice(0, 4);
  const { data: reviews } = useSellerReviews(a.artistId);

  const sold = a.status === "sold";
  const unavailable = a.status !== "published";

  async function addToCart() {
    if (!hasSession()) {
      toast.error("Please sign in to add to cart");
      return;
    }
    setAdding(true);
    try {
      await api.post("/api/cart", { artworkId: a.id, quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => (window.location.href = "/cart") },
      });
    } catch (e) {
      toast.error(errorMessage(e, "Could not add to cart"));
    } finally {
      setAdding(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: a.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // user dismissed the share sheet
    }
  }

  const details: [string, string | null | undefined][] = [
    ["Category", a.categoryName],
    ["Medium", a.medium],
    ["Materials", a.materials],
    ["Surface", a.surface],
    ["Style", a.style],
    ["Dimensions", a.dimensions],
    ["Weight", a.weightKg ? `${a.weightKg} kg` : null],
    ["Orientation", a.orientation ? a.orientation[0].toUpperCase() + a.orientation.slice(1) : null],
    ["Year", a.yearCreated ? String(a.yearCreated) : null],
    [
      "Edition",
      a.isOriginal
        ? "One-of-a-kind original"
        : a.editionSize
          ? `Print, edition of ${a.editionSize}`
          : "Print",
    ],
    ["Origin", [a.originCity, a.originCountry].filter(Boolean).join(", ") || null],
  ];
  const features = [
    a.signed && `Signed${a.signatureLocation ? ` (${a.signatureLocation})` : ""}`,
    a.certificateOfAuthenticity && "Certificate of authenticity",
    a.framed && "Framed",
    a.readyToHang && "Ready to hang",
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to browse
        </Link>
        {a.status === "draft" || a.status === "archived" ? (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            This artwork is a {a.status} and is only visible to you.
          </p>
        ) : null}
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-2xl bg-muted">
              {gallery[active] && (
                <img
                  src={gallery[active]}
                  alt={a.title}
                  className="max-h-[75vh] w-full object-contain"
                />
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {gallery.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show image ${i + 1}`}
                    className={cn(
                      "h-20 w-20 shrink-0 overflow-hidden rounded-md border-2",
                      i === active
                        ? "border-primary"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold">{a.title}</h1>
            <p className="mt-2 text-muted-foreground">
              by{" "}
              <Link
                to="/artists/$id"
                params={{ id: a.artistId }}
                className="font-medium text-foreground hover:text-primary"
              >
                {a.artistDisplayName ?? "Artist"}
              </Link>
              {a.artistVerified && (
                <BadgeCheck
                  className="ml-1 inline h-4 w-4 text-primary"
                  aria-label="Verified artist"
                />
              )}
            </p>
            <p
              className={cn(
                "mt-6 font-display text-3xl font-semibold",
                sold ? "text-muted-foreground" : "text-primary",
              )}
            >
              {sold ? "Sold" : formatZmw(a.priceZmw)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={addToCart} disabled={unavailable || adding}>
                {sold ? "Sold" : unavailable ? "Not available" : adding ? "Adding…" : "Add to cart"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => toggle(a.id)}
                aria-pressed={isFavorite(a.id)}
              >
                <Heart className={cn("h-4 w-4", isFavorite(a.id) && "fill-primary text-primary")} />
                {isFavorite(a.id) ? "Saved" : "Save"}
              </Button>
              <Button size="lg" variant="ghost" onClick={share} aria-label="Share">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3">
              <MessageButton
                recipientId={a.artistId}
                recipientName={a.artistDisplayName}
                contextType="ARTWORK"
                contextId={a.id}
                label="Ask the artist a question"
                variant="ghost"
                size="sm"
              />
            </div>
            <Link
              to="/commissions"
              search={{ artist: a.artistId, artistName: a.artistDisplayName ?? undefined }}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Brush className="h-4 w-4" />
              {sold
                ? "Commission a similar piece from this artist"
                : "Commission something similar"}
            </Link>

            {features.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {features.map((f) => (
                  <li
                    key={f}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {details
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 font-medium">{value}</dd>
                  </div>
                ))}
            </dl>

            {a.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {a.description}
              </p>
            )}
            {a.provenance && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold">Provenance</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">
                  {a.provenance}
                </p>
              </div>
            )}
            <div className="mt-6 flex gap-3 rounded-xl border border-border bg-card p-4 text-sm">
              <Truck className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Delivery</p>
                <p className="text-muted-foreground">
                  {a.shippingNotes ||
                    "Ships from the artist's studio after payment. Choose delivery or collection at checkout and track the shipment from your order page."}
                </p>
              </div>
            </div>
            {a.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {a.tags.map((t) => (
                  <Link
                    key={t}
                    to="/browse"
                    search={{ q: t }}
                    className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:text-primary"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            <Link
              to="/artists/$id"
              params={{ id: a.artistId }}
              className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={a.artistAvatarUrl ?? undefined} />
                <AvatarFallback>
                  {(a.artistDisplayName ?? "A").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">
                  About {a.artistDisplayName ?? "the artist"}
                </p>
                {reviews && <RatingBadge average={reviews.average} count={reviews.count} />}
                {a.artistLocation && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {a.artistLocation}
                  </p>
                )}
                {a.artistBio && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.artistBio}</p>
                )}
              </div>
            </Link>
          </div>
        </div>

        {moreFromArtist.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold">
                More from {a.artistDisplayName ?? "this artist"}
              </h2>
              <Link
                to="/artists/$id"
                params={{ id: a.artistId }}
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              {moreFromArtist.map((w) => (
                <ArtworkCard key={w.id} artwork={w} showArtist={false} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
