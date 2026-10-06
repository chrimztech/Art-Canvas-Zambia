import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtworkSummary } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/artworks")({
  head: () => ({ meta: [{ title: "My artworks — ChrisEpic Arts" }] }),
  component: MyArtworks,
});

function MyArtworks() {
  const [items, setItems] = useState<ArtworkSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api.get<ArtworkSummary[]>("/api/me/artworks");
    setItems(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(id: string, current: string) {
    const next = current === "published" ? "draft" : "published";
    try {
      await api.patch(`/api/artworks/${id}/status`, { status: next });
      toast.success(`Marked as ${next}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update status"));
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this artwork? This can't be undone.")) return;
    try {
      await api.del(`/api/artworks/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">My artworks</h1>
          <Button asChild>
            <Link to="/dashboard/upload">
              <Plus className="h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
        {loading ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            No artworks yet.{" "}
            <Link to="/dashboard/upload" className="text-primary hover:underline">
              Upload your first piece →
            </Link>
          </p>
        ) : (
          <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-4">
                <div className="h-16 w-16 overflow-hidden rounded bg-muted">
                  {a.coverImageUrl && (
                    <img
                      src={a.coverImageUrl}
                      alt={a.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <Link
                    to="/artworks/$slug"
                    params={{ slug: a.slug }}
                    className="font-medium hover:text-primary"
                  >
                    {a.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span>K{Number(a.priceZmw).toLocaleString()}</span>
                    <Badge
                      variant={
                        a.status === "published"
                          ? "default"
                          : a.status === "sold"
                            ? "outline"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {a.status}
                    </Badge>
                    <span>{a.viewCount} views</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild aria-label="Edit">
                  <Link to="/dashboard/upload" search={{ edit: a.id }}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                {a.status !== "sold" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleStatus(a.id, a.status)}
                    aria-label={a.status === "published" ? "Unpublish" : "Publish"}
                    title={a.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {a.status === "published" ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(a.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
