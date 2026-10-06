import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ArtworkSummary,
  Category,
  FollowedArtist,
  SavedSearch,
  WaitlistEntry,
} from "@/lib/types";
import { EmptyState, PageShell } from "@/components/page-shell";
import { ArtworkCard } from "@/components/artwork-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellRing, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/following")({
  head: () => ({ meta: [{ title: "Following — ChrisEpic Arts" }] }),
  component: Following,
});

function Following() {
  const queryClient = useQueryClient();
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.get<ArtworkSummary[]>("/api/me/feed"),
  });
  const { data: artists = [] } = useQuery({
    queryKey: ["follows"],
    queryFn: () => api.get<FollowedArtist[]>("/api/me/follows"),
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => api.get<SavedSearch[]>("/api/me/saved-searches"),
  });
  const { data: waitlist = [] } = useQuery({
    queryKey: ["waitlist"],
    queryFn: () => api.get<WaitlistEntry[]>("/api/me/waitlist"),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/api/categories"),
  });

  async function run(action: () => Promise<unknown>, key: string, done: string) {
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: [key] });
      toast.success(done);
    } catch (e) {
      toast.error(errorMessage(e, "Something went wrong"));
    }
  }

  return (
    <PageShell
      title="Following"
      description="New work from artists you follow, plus your search alerts and waitlists."
    >
      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">New work</TabsTrigger>
          <TabsTrigger value="artists">Artists ({artists.length})</TabsTrigger>
          <TabsTrigger value="alerts">Search alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlists ({waitlist.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : feed.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title="Your feed is empty">
              Follow artists from their profile pages to see their latest work here.{" "}
              <Link to="/artists" className="text-primary hover:underline">
                Discover artists →
              </Link>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {feed.map((a) => (
                <ArtworkCard key={a.id} artwork={a} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          {artists.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} title="Not following anyone yet" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {artists.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <Avatar>
                    <AvatarImage src={a.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {(a.displayName ?? "A").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to="/artists/$id"
                    params={{ id: a.id }}
                    className="min-w-0 flex-1 hover:text-primary"
                  >
                    <p className="truncate font-medium">{a.displayName ?? "Artist"}</p>
                    {a.location && (
                      <p className="truncate text-xs text-muted-foreground">{a.location}</p>
                    )}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      run(() => api.del(`/api/me/follows/${a.id}`), "follows", "Unfollowed")
                    }
                  >
                    Unfollow
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          {alerts.length === 0 ? (
            <EmptyState icon={<Search className="h-10 w-10" />} title="No search alerts">
              Search or filter on{" "}
              <Link to="/browse" className="text-primary hover:underline">
                Browse
              </Link>{" "}
              and choose “Alert me to new matches”.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {alerts.map((s) => {
                const category = categories.find((c) => c.id === s.categoryId);
                return (
                  <li key={s.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          s.query && `“${s.query}”`,
                          category?.name,
                          s.minPriceZmw != null && `from ${formatZmw(s.minPriceZmw)}`,
                          s.maxPriceZmw != null && `up to ${formatZmw(s.maxPriceZmw)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/browse"
                        search={{
                          q: s.query ?? undefined,
                          category: category?.slug,
                          min: s.minPriceZmw ?? undefined,
                          max: s.maxPriceZmw ?? undefined,
                        }}
                      >
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete alert"
                      onClick={() =>
                        run(
                          () => api.del(`/api/me/saved-searches/${s.id}`),
                          "saved-searches",
                          "Alert deleted",
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="waitlist" className="mt-6">
          {waitlist.length === 0 ? (
            <EmptyState icon={<BellRing className="h-10 w-10" />} title="No waitlists">
              Join the waitlist on a sold-out class or exhibition to hear when a place opens.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {waitlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {w.path ? (
                      <a href={w.path} className="font-medium hover:text-primary">
                        {w.title ?? "Listing"}
                      </a>
                    ) : (
                      <p className="font-medium">{w.title ?? "Listing"}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {w.itemType === "CLASS" ? "Class" : "Exhibition"} ·{" "}
                      {w.notifiedAt
                        ? "A place opened — book quickly!"
                        : "We'll notify you if a place opens"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      run(
                        () => api.del(`/api/me/waitlist/${w.itemType}/${w.itemId}`),
                        "waitlist",
                        "Left the waitlist",
                      )
                    }
                  >
                    Leave
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
