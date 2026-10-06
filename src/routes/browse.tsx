import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtworkSummary, Category } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArtworkCard } from "@/components/artwork-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BellPlus, Palette, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn, errorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type BrowseSearch = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "popular";
  available?: boolean;
  orientation?: "landscape" | "portrait" | "square";
  framed?: boolean;
  readyToHang?: boolean;
  freeDelivery?: boolean;
};

const ORIENTATIONS = ["landscape", "portrait", "square"] as const;
const flag = (v: unknown) => (v === true || v === "true" ? true : undefined);

const SORTS: { value: NonNullable<BrowseSearch["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most viewed" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: () => api.get<Category[]>("/api/categories"),
  staleTime: 5 * 60_000,
});

function artworksQuery(search: BrowseSearch, categories: Category[]) {
  const params = new URLSearchParams();
  if (search.q) params.set("q", search.q);
  const category = categories.find((c) => c.slug === search.category);
  if (category) params.set("categoryId", category.id);
  if (search.min != null) params.set("minPrice", String(search.min));
  if (search.max != null) params.set("maxPrice", String(search.max));
  if (search.sort && search.sort !== "newest") params.set("sort", search.sort);
  if (search.available) params.set("available", "true");
  if (search.orientation) params.set("orientation", search.orientation);
  if (search.framed) params.set("framed", "true");
  if (search.readyToHang) params.set("readyToHang", "true");
  if (search.freeDelivery) params.set("freeDelivery", "true");
  const qs = params.toString();
  return queryOptions({
    queryKey: ["browse-artworks", qs],
    queryFn: () => api.get<ArtworkSummary[]>(`/api/artworks${qs ? `?${qs}` : ""}`),
  });
}

function positiveNumber(value: unknown) {
  const n = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
    category: typeof search.category === "string" && search.category ? search.category : undefined,
    min: positiveNumber(search.min),
    max: positiveNumber(search.max),
    sort: SORTS.some((s) => s.value === search.sort)
      ? (search.sort as BrowseSearch["sort"])
      : undefined,
    available: flag(search.available),
    orientation: ORIENTATIONS.find((o) => o === search.orientation),
    framed: flag(search.framed),
    readyToHang: flag(search.readyToHang),
    freeDelivery: flag(search.freeDelivery),
  }),
  head: () => ({
    meta: [
      { title: "Browse Art — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "Browse original paintings, sculpture, photography and prints from Zambian artists.",
      },
    ],
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const categories = await context.queryClient.ensureQueryData(categoriesQuery);
    await context.queryClient.ensureQueryData(artworksQuery(deps, categories));
  },
  component: Browse,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const { user } = useAuth();
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  // The loader has already fetched this search, so suspense never shows a fallback here and
  // server and client render the same results (the query cache isn't hydrated from SSR).
  const { data: artworks } = useSuspenseQuery(artworksQuery(search, categories));

  const [q, setQ] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min?.toString() ?? "");
  const [max, setMax] = useState(search.max?.toString() ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => {
    setMin(search.min?.toString() ?? "");
    setMax(search.max?.toString() ?? "");
  }, [search.min, search.max]);

  const update = (patch: Partial<BrowseSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const activeFilters = !!(
    search.q ||
    search.category ||
    search.min != null ||
    search.max != null ||
    search.available ||
    search.orientation ||
    search.framed ||
    search.readyToHang ||
    search.freeDelivery
  );

  async function saveAlert() {
    if (!user) {
      navigate({
        to: "/auth",
        search: { redirect: window.location.pathname + window.location.search },
      });
      return;
    }
    const category = categories.find((c) => c.slug === search.category);
    try {
      await api.post("/api/me/saved-searches", {
        query: search.q,
        categoryId: category?.id,
        minPriceZmw: search.min,
        maxPriceZmw: search.max,
      });
      toast.success("Alert saved — we'll notify you when new work matches", {
        action: { label: "Manage", onClick: () => navigate({ to: "/following" }) },
      });
    } catch (e) {
      toast.error(errorMessage(e, "Could not save this search"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold">Browse art</h1>
        <p className="mt-2 text-muted-foreground">
          {artworks.length} {artworks.length === 1 ? "piece" : "pieces"} from Zambian artists
        </p>

        <form
          className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            update({
              q: q.trim() || undefined,
              min: positiveNumber(min),
              max: positiveNumber(max),
            });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, medium, style or artist"
              className="pl-9"
              aria-label="Search artworks"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="Min K"
              className="w-28"
              aria-label="Minimum price"
            />
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Max K"
              className="w-28"
              aria-label="Maximum price"
            />
          </div>
          <select
            value={search.sort ?? "newest"}
            onChange={(e) =>
              update({
                sort:
                  e.target.value === "newest"
                    ? undefined
                    : (e.target.value as BrowseSearch["sort"]),
              })
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Sort by"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="submit">Search</Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => update({ category: undefined })}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              !search.category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary hover:text-primary",
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => update({ category: search.category === c.slug ? undefined : c.slug })}
              aria-pressed={search.category === c.slug}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm",
                search.category === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary hover:text-primary",
              )}
            >
              {c.name}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={!!search.available}
              onChange={(e) => update({ available: e.target.checked || undefined })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Available only
          </label>
          {(search.q || search.category || search.min != null || search.max != null) && (
            <Button variant="outline" size="sm" onClick={saveAlert}>
              <BellPlus className="h-4 w-4" /> Alert me to new matches
            </Button>
          )}
          {activeFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: {}, replace: true })}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" /> Clear filters
            </Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select
            value={search.orientation ?? ""}
            onChange={(e) =>
              update({ orientation: (e.target.value || undefined) as BrowseSearch["orientation"] })
            }
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Orientation"
          >
            <option value="">Any orientation</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
            <option value="square">Square</option>
          </select>
          {(
            [
              ["framed", "Framed"],
              ["readyToHang", "Ready to hang"],
              ["freeDelivery", "Free delivery"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ [key]: search[key] ? undefined : true })}
              aria-pressed={!!search[key]}
              className={cn(
                "rounded-full border px-3 py-1.5",
                search[key]
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {artworks.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Palette className="mx-auto h-10 w-10 text-muted-foreground/60" />
            {activeFilters ? (
              <>
                <h2 className="mt-4 font-display text-xl font-semibold">No matches</h2>
                <p className="mt-2 text-muted-foreground">
                  Try a different search or clear your filters.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-xl font-semibold">No artworks yet</h2>
                <p className="mt-2 text-muted-foreground">
                  Check back soon — or be the first to list your work.
                </p>
                <Link
                  to="/sell"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Become a seller →
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
