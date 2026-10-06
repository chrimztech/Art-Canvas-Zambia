import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ArtworkSummary, CollectionSummary, PublicSiteSettings } from "@/lib/types";
import { CollectionCard } from "@/components/collection-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Palette, GraduationCap, Hammer, Calendar } from "lucide-react";
import heroImg from "@/assets/hero-gallery.jpg";

const featuredArtworksQuery = queryOptions({
  queryKey: ["featured-artworks"],
  queryFn: async () => (await api.get<ArtworkSummary[]>("/api/artworks")).slice(0, 9),
});

const featuredCollectionsQuery = queryOptions({
  queryKey: ["collections", "featured"],
  queryFn: async () => {
    try {
      return await api.get<CollectionSummary[]>("/api/collections?featured=true");
    } catch {
      return [];
    }
  },
});

const siteSettingsQuery = queryOptions({
  queryKey: ["public-site-settings"],
  queryFn: async () => {
    try {
      return await api.get<PublicSiteSettings>("/api/public/site-settings");
    } catch {
      return { heroImageUrl: null } as PublicSiteSettings;
    }
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChrisEpic Arts — Zambia's Marketplace for Original Art" },
      {
        name: "description",
        content:
          "Buy original art from Zambian artists. Commissions, classes, supplies and exhibitions — all in one place.",
      },
      { property: "og:title", content: "ChrisEpic Arts — Zambia's Marketplace for Original Art" },
      {
        property: "og:description",
        content:
          "Buy original art from Zambian artists. Commissions, classes, supplies and exhibitions — all in one place.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(featuredArtworksQuery),
      context.queryClient.ensureQueryData(siteSettingsQuery),
      context.queryClient.ensureQueryData(featuredCollectionsQuery),
    ]),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Index() {
  const { data: artworks } = useSuspenseQuery(featuredArtworksQuery);
  const { data: siteSettings } = useSuspenseQuery(siteSettingsQuery);
  const { data: collections } = useSuspenseQuery(featuredCollectionsQuery);
  const [feature, ...rest] = artworks;
  const coverImage = siteSettings.heroImageUrl || heroImg;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Editorial hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-border/60 pb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Issue №01 · Made in Zambia</span>
            <span className="hidden sm:inline">
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl items-end gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-7">
            <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] tracking-tight text-foreground">
              Original art,
              <br />
              <em className="text-primary">handmade</em> in Zambia.
            </h1>
            <p className="mt-8 max-w-xl text-base text-muted-foreground sm:text-lg">
              A modern marketplace for paintings, sculpture and prints. Commission directly. Learn a
              craft. Stock your studio.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link to="/browse">
                  Browse the collection <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link
                to="/sell"
                className="group inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
              >
                Sell your work{" "}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <figure className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-sm">
                <img
                  src={coverImage}
                  alt="Contemporary Zambian art gallery"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span>The Studio Issue</span>
                <span className="text-primary">/ Cover</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Pillars — editorial bar */}
      <section className="border-y border-border/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
          {[
            {
              icon: Palette,
              title: "Collect",
              desc: "Originals, prints & sculpture.",
              to: "/browse",
            },
            {
              icon: Hammer,
              title: "Commission",
              desc: "Custom work, direct from the artist.",
              to: "/commissions",
            },
            {
              icon: GraduationCap,
              title: "Learn",
              desc: "Classes from working professionals.",
              to: "/classes",
            },
            {
              icon: Calendar,
              title: "Exhibit",
              desc: "Discover local shows and openings.",
              to: "/exhibitions",
            },
          ].map((p) => (
            <Link
              key={p.title}
              to={p.to}
              className="group border-b border-border/60 p-8 transition-colors hover:bg-card lg:border-b-0"
            >
              <p.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-6 font-display text-2xl">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.18em] text-primary group-hover:gap-2">
                Explore <ArrowRight className="h-3 w-3 transition-all" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured — magazine layout */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex items-end justify-between border-b border-border/60 pb-6">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary">New work</span>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">On the wall this week</h2>
          </div>
          <Link
            to="/browse"
            className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline"
          >
            View all →
          </Link>
        </div>

        {artworks.length === 0 ? (
          <div className="mt-10 rounded-sm border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No artworks have been published yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you an artist?{" "}
              <Link to="/sell" className="font-medium text-primary hover:underline">
                Become a seller →
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-12">
            {feature && (
              <Link
                to="/artworks/$slug"
                params={{ slug: feature.slug }}
                className="group lg:col-span-7"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-sm bg-muted">
                  {feature.coverImageUrl ? (
                    <img
                      src={feature.coverImageUrl}
                      alt={feature.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Palette className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-xs uppercase tracking-[0.18em] text-primary">
                      Featured
                    </span>
                    <h3 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.artistDisplayName ?? "Artist"}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-xl text-primary">
                    K{Number(feature.priceZmw).toLocaleString()}
                  </p>
                </div>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-6 lg:col-span-5 lg:grid-cols-2">
              {rest.slice(0, 4).map((a) => (
                <Link key={a.id} to="/artworks/$slug" params={{ slug: a.slug }} className="group">
                  <div className="aspect-[4/5] overflow-hidden rounded-sm bg-muted">
                    {a.coverImageUrl ? (
                      <img
                        src={a.coverImageUrl}
                        alt={a.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Palette className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 truncate font-medium leading-tight">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">{a.artistDisplayName ?? "Artist"}</p>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    K{Number(a.priceZmw).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>

            {rest.length > 4 && (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:col-span-12">
                {rest.slice(4, 8).map((a) => (
                  <Link key={a.id} to="/artworks/$slug" params={{ slug: a.slug }} className="group">
                    <div className="aspect-[4/5] overflow-hidden rounded-sm bg-muted">
                      {a.coverImageUrl ? (
                        <img
                          src={a.coverImageUrl}
                          alt={a.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Palette className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 truncate font-medium leading-tight">{a.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {a.artistDisplayName ?? "Artist"}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-primary">
                      K{Number(a.priceZmw).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold">Curated collections</h2>
            <Link to="/collections" className="text-sm text-primary hover:underline">
              All collections →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.slice(0, 3).map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        </section>
      )}

      {/* Sell CTA */}

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-sm border border-primary/30 bg-gradient-to-br from-card to-background px-8 py-16 sm:px-14 sm:py-24">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-end">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-primary">For artists</span>
              <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
                Your studio,
                <br />
                <em className="text-primary">online.</em>
              </h2>
              <p className="mt-5 max-w-md text-muted-foreground">
                List your work, take commissions, teach classes and get paid in Kwacha. Low fees.
                Transparent payouts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button size="lg" asChild>
                <Link to="/auth">Create your store</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/sell">How it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
