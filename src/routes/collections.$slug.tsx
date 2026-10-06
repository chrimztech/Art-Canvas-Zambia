import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CollectionDetail } from "@/lib/types";
import { PageShell } from "@/components/page-shell";
import { ArtworkCard } from "@/components/artwork-card";

const collectionQuery = (slug: string) =>
  queryOptions({
    queryKey: ["collection", slug],
    queryFn: async () => {
      try {
        return await api.get<CollectionDetail>(`/api/collections/${slug}`);
      } catch {
        throw notFound();
      }
    },
  });

export const Route = createFileRoute("/collections/$slug")({
  head: ({ loaderData }) => {
    const c = (loaderData as CollectionDetail | undefined)?.collection;
    return {
      meta: [
        { title: `${c?.title ?? "Collection"} — ChrisEpic Arts` },
        { name: "description", content: c?.description?.slice(0, 160) ?? "A curated collection" },
        { property: "og:image", content: c?.coverImageUrl ?? c?.previewImages[0] ?? "" },
      ],
    };
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(collectionQuery(params.slug)),
  component: CollectionPage,
  notFoundComponent: () => (
    <div className="p-12 text-center">
      <h1 className="font-display text-3xl">Collection not found</h1>
      <Link to="/collections" className="mt-4 inline-block text-primary">
        ← All collections
      </Link>
    </div>
  ),
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(collectionQuery(slug));
  return (
    <PageShell
      title={data.collection.title}
      description={data.collection.description ?? undefined}
      width="max-w-7xl"
      actions={
        <Link to="/collections" className="text-sm text-primary hover:underline">
          All collections →
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {data.artworks.map((a) => (
          <ArtworkCard key={a.id} artwork={a} />
        ))}
      </div>
    </PageShell>
  );
}
