import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CollectionSummary } from "@/lib/types";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Library } from "lucide-react";
import { CollectionCard } from "@/components/collection-card";

const collectionsQuery = queryOptions({
  queryKey: ["collections"],
  queryFn: () => api.get<CollectionSummary[]>("/api/collections"),
});

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Curated collections — ChrisEpic Arts" },
      {
        name: "description",
        content: "Hand-picked edits of Zambian art, chosen by our curators.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQuery),
  component: Collections,
});

function Collections() {
  const { data } = useSuspenseQuery(collectionsQuery);
  return (
    <PageShell
      title="Curated collections"
      description="Hand-picked edits of Zambian art, chosen by our curators."
    >
      {data.length === 0 ? (
        <EmptyState icon={<Library className="h-10 w-10" />} title="No collections yet">
          Our curators are putting the first edits together.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
