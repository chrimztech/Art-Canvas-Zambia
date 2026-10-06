import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type {
  ArtworkSummary,
  CollectionDetail,
  CollectionSummary,
  ContactMessage,
  ModerationReport,
  NewsletterSubscriber,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, GripVertical, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw, timeAgo } from "@/lib/utils";

/** Moderation queue for reported listings, members, reviews and messages. */
export function AdminReports() {
  const queryClient = useQueryClient();
  const [showClosed, setShowClosed] = useState(false);
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api.get<ModerationReport[]>("/api/admin/reports"),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const visible = reports.filter((r) => showClosed || r.status === "open");

  async function resolve(r: ModerationReport, status: "resolved" | "dismissed") {
    try {
      await api.post(`/api/admin/reports/${r.id}/resolve`, {
        status,
        note: notes[r.id] || undefined,
      });
      toast.success(status === "resolved" ? "Marked as actioned" : "Dismissed");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    } catch (e) {
      toast.error(errorMessage(e, "Could not update report"));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Reports ({reports.filter((r) => r.status === "open").length} open)</CardTitle>
          <CardDescription>
            Take action from the linked page (archive the listing, remove the review, suspend the
            member), then mark the report actioned.
          </CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          Show closed
        </label>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((r) => (
              <div key={r.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{r.targetType.toLowerCase()}</Badge>
                  <Badge variant={r.status === "open" ? "destructive" : "outline"}>
                    {r.reason}
                  </Badge>
                  {r.targetPath ? (
                    <a
                      href={r.targetPath}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:text-primary"
                    >
                      {r.targetLabel ?? r.targetId}
                    </a>
                  ) : (
                    <span className="font-medium">{r.targetLabel ?? r.targetId}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    by {r.reporterName ?? "member"} · {timeAgo(r.createdAt)}
                  </span>
                </div>
                {r.details && <p className="text-sm text-muted-foreground">“{r.details}”</p>}
                {r.status === "open" ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="Note (optional)"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                      className="h-9 max-w-sm"
                    />
                    <Button size="sm" onClick={() => resolve(r, "resolved")}>
                      Actioned
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolve(r, "dismissed")}>
                      Dismiss
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {r.status}
                    {r.adminNote ? ` — ${r.adminNote}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CollectionDraft = {
  id?: string;
  title: string;
  description: string;
  coverImageUrl: string;
  featured: boolean;
  published: boolean;
  sortOrder: string;
  artworks: ArtworkSummary[];
};

const EMPTY_DRAFT: CollectionDraft = {
  title: "",
  description: "",
  coverImageUrl: "",
  featured: false,
  published: true,
  sortOrder: "0",
  artworks: [],
};

/** Curated collections: hand-picked, ordered sets of artworks shown at /collections and on the home page. */
export function AdminCollections() {
  const queryClient = useQueryClient();
  const { data: collections = [] } = useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => api.get<CollectionSummary[]>("/api/admin/collections"),
  });
  const [draft, setDraft] = useState<CollectionDraft | null>(null);
  const [search, setSearch] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["admin-collection-search", search],
    queryFn: () => api.get<ArtworkSummary[]>(`/api/artworks?q=${encodeURIComponent(search)}`),
    enabled: !!draft && search.trim().length >= 2,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-collections"] });
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  async function edit(c: CollectionSummary) {
    try {
      const detail = await api
        .get<CollectionDetail>(`/api/collections/${c.slug}`)
        .catch(() => null);
      setDraft({
        id: c.id,
        title: c.title,
        description: c.description ?? "",
        coverImageUrl: c.coverImageUrl ?? "",
        featured: c.featured,
        published: c.published,
        sortOrder: String(c.sortOrder),
        artworks: detail?.artworks ?? [],
      });
    } catch (e) {
      toast.error(errorMessage(e, "Could not open collection"));
    }
  }

  async function save() {
    if (!draft) return;
    const body = {
      title: draft.title,
      description: draft.description || null,
      coverImageUrl: draft.coverImageUrl || null,
      featured: draft.featured,
      published: draft.published,
      sortOrder: Number(draft.sortOrder) || 0,
      artworkIds: draft.artworks.map((a) => a.id),
    };
    try {
      if (draft.id) await api.put(`/api/admin/collections/${draft.id}`, body);
      else await api.post("/api/admin/collections", body);
      toast.success("Collection saved");
      setDraft(null);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e, "Could not save collection"));
    }
  }

  async function remove(c: CollectionSummary) {
    if (!window.confirm(`Delete the collection “${c.title}”? The artworks are not affected.`))
      return;
    try {
      await api.del(`/api/admin/collections/${c.id}`);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete collection"));
    }
  }

  function move(index: number, delta: number) {
    if (!draft) return;
    const list = [...draft.artworks];
    const [item] = list.splice(index, 1);
    list.splice(Math.max(0, Math.min(list.length, index + delta)), 0, item);
    setDraft({ ...draft, artworks: list });
  }

  if (draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Edit collection" : "New collection"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="col-title">Title</Label>
              <Input
                id="col-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="col-cover">Cover image URL (optional)</Label>
              <Input
                id="col-cover"
                value={draft.coverImageUrl}
                onChange={(e) => setDraft({ ...draft, coverImageUrl: e.target.value })}
                placeholder="Defaults to a mosaic of the works"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="col-desc">Description</Label>
            <Textarea
              id="col-desc"
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
              />
              Feature on the home page
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Published
            </label>
            <label className="flex items-center gap-2">
              Order
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                className="h-8 w-20"
              />
            </label>
          </div>

          <div>
            <p className="text-sm font-medium">Artworks ({draft.artworks.length})</p>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {draft.artworks.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 p-2 text-sm">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  {a.coverImageUrl && (
                    <img src={a.coverImageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <span className="flex-1 truncate">
                    {a.title} <span className="text-muted-foreground">· {a.artistDisplayName}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.artworks.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove from collection"
                    onClick={() =>
                      setDraft({ ...draft, artworks: draft.artworks.filter((x) => x.id !== a.id) })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {draft.artworks.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">Search below to add artworks.</li>
              )}
            </ul>
            <Input
              className="mt-3"
              placeholder="Search artworks by title, artist or medium…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search artworks to add"
            />
            {results.length > 0 && (
              <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {results
                  .filter((r) => !draft.artworks.some((a) => a.id === r.id))
                  .slice(0, 20)
                  .map((r) => (
                    <li key={r.id} className="flex items-center gap-3 p-2 text-sm">
                      {r.coverImageUrl && (
                        <img
                          src={r.coverImageUrl}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span className="flex-1 truncate">
                        {r.title}{" "}
                        <span className="text-muted-foreground">
                          · {r.artistDisplayName} · {formatZmw(r.priceZmw)}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDraft({ ...draft, artworks: [...draft.artworks, r] })}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!draft.title.trim()}>
              Save collection
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Curated collections ({collections.length})</CardTitle>
          <CardDescription>Featured collections appear on the home page.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>
          <Plus className="h-4 w-4" /> New collection
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {collections.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <a
                  href={`/collections/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:text-primary"
                >
                  {c.title}
                </a>
                <p className="text-xs text-muted-foreground">
                  {c.artworkCount} works · order {c.sortOrder}
                </p>
              </div>
              {c.featured && <Badge>featured</Badge>}
              {!c.published && <Badge variant="outline">hidden</Badge>}
              <Button size="sm" variant="outline" onClick={() => edit(c)}>
                Edit
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${c.title}`}
                onClick={() => remove(c)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {collections.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No collections yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Contact-form / art-advisory messages and the newsletter list. */
export function AdminInbox() {
  const queryClient = useQueryClient();
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-contact"],
    queryFn: () => api.get<ContactMessage[]>("/api/admin/contact-messages"),
  });
  const { data: subscribers = [] } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: () => api.get<NewsletterSubscriber[]>("/api/admin/newsletter"),
  });

  async function setStatus(m: ContactMessage, status: "new" | "handled") {
    try {
      await api.patch(`/api/admin/contact-messages/${m.id}`, { status });
      queryClient.invalidateQueries({ queryKey: ["admin-contact"] });
    } catch (e) {
      toast.error(errorMessage(e, "Could not update message"));
    }
  }

  function exportCsv() {
    const rows = [["email", "subscribed_at"], ...subscribers.map((s) => [s.email, s.createdAt])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "newsletter-subscribers.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Messages ({messages.filter((m) => m.status === "new").length} new)</CardTitle>
          <CardDescription>From the contact page, including art-advisory requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {messages.map((m) => (
              <div key={m.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={m.topic === "advisory" ? "default" : "secondary"}>
                    {m.topic}
                  </Badge>
                  <span className="font-medium">{m.name}</span>
                  <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline">
                    {m.email}
                  </a>
                  {m.budgetZmw != null && (
                    <span className="text-sm text-muted-foreground">
                      budget {formatZmw(m.budgetZmw)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-line text-sm text-foreground/80">{m.message}</p>
                <Button
                  size="sm"
                  variant={m.status === "new" ? "default" : "outline"}
                  onClick={() => setStatus(m, m.status === "new" ? "handled" : "new")}
                >
                  {m.status === "new" ? "Mark handled" : "Reopen"}
                </Button>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No messages.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Newsletter ({subscribers.length} subscribers)</CardTitle>
            <CardDescription>
              Export to your email tool. Unsubscribed addresses are excluded.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={subscribers.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {subscribers
              .slice(0, 10)
              .map((s) => s.email)
              .join(", ")}
            {subscribers.length > 10 ? ` and ${subscribers.length - 10} more` : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
