import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api, hasSession } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Brush, CheckCircle2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type CommissionSearch = { artist?: string; artistName?: string };

const MAX_REFERENCES = 4;

export const Route = createFileRoute("/commissions")({
  validateSearch: (search: Record<string, unknown>): CommissionSearch => ({
    artist: typeof search.artist === "string" && search.artist ? search.artist : undefined,
    artistName:
      typeof search.artistName === "string" && search.artistName ? search.artistName : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Commission Custom Art — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "Request a custom artwork from a Zambian artist. Portraits, murals, illustrations and more.",
      },
    ],
  }),
  component: Commissions,
});

function Commissions() {
  const { artist, artistName } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [references, setReferences] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  async function addReferences(files: FileList | null) {
    if (!files?.length) return;
    if (!hasSession()) {
      toast.error("Please sign in to upload reference images");
      return;
    }
    setUploading(true);
    try {
      const room = MAX_REFERENCES - references.length;
      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, room)
          .map((f) => api.upload<UploadResponse>("/api/uploads", f)),
      );
      setReferences((r) => [...r, ...uploaded.map((u) => u.url)]);
    } catch (e) {
      toast.error(errorMessage(e, "Could not upload image"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasSession()) {
      toast.error("Please sign in to request a commission");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await api.post("/api/commissions", {
        title: String(fd.get("title") ?? ""),
        brief: String(fd.get("brief") ?? ""),
        budgetZmw: fd.get("budget") ? Number(fd.get("budget")) : null,
        deadline: (fd.get("deadline") as string) || null,
        artistId: artist ?? null,
        referenceImageUrls: references,
      });
      toast.success("Commission request submitted");
      setDone(true);
    } catch (e) {
      toast.error(errorMessage(e, "Could not submit request"));
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <Brush className="h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-4xl font-semibold">
              {artist ? `Commission ${artistName ?? "this artist"}` : "Commission custom art"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {artist
                ? "Your brief goes straight to this artist. They'll reply with a quote you can accept and pay securely."
                : "Tell us what you'd like and Zambian artists will respond with quotes. Portraits, murals, illustrations, gifts — anything."}
            </p>
            <ol className="mt-6 space-y-3 text-sm">
              {[
                "Describe your idea, budget and deadline below.",
                "An artist reviews your brief and sends a quote.",
                "Accept the quote by paying securely with mobile money or card.",
                "Follow progress and confirm when you receive your finished piece.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Link
              to="/dashboard/my-commissions"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Track your existing requests →
            </Link>
          </div>

          <Card className="p-6">
            {done ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <h2 className="mt-4 font-display text-xl font-semibold">Request submitted</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You'll see quotes on your commissions page as soon as{" "}
                  {artist ? "the artist responds" : "artists respond"}.
                </p>
                <Link
                  to="/dashboard/my-commissions"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View my commissions →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {artist && (
                  <p className="rounded-md bg-accent px-3 py-2 text-sm">
                    Sending to{" "}
                    <span className="font-medium">{artistName ?? "selected artist"}</span> ·{" "}
                    <Link to="/commissions" search={{}} className="text-primary hover:underline">
                      post to all artists instead
                    </Link>
                  </p>
                )}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    maxLength={120}
                    placeholder="e.g. Portrait of my grandmother"
                  />
                </div>
                <div>
                  <Label htmlFor="brief">Brief</Label>
                  <Textarea
                    id="brief"
                    name="brief"
                    required
                    rows={5}
                    placeholder="Describe the subject, style, size, references, and any details that matter."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (ZMW)</Label>
                    <Input
                      id="budget"
                      name="budget"
                      type="number"
                      min={0}
                      step={50}
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Needed by</Label>
                    <Input id="deadline" name="deadline" type="date" min={today} />
                  </div>
                </div>
                <div>
                  <Label>Reference images (optional)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {references.map((url) => (
                      <div
                        key={url}
                        className="relative h-20 w-20 overflow-hidden rounded-md border border-border"
                      >
                        <img src={url} alt="Reference" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReferences((r) => r.filter((u) => u !== url))}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"
                          aria-label="Remove reference image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {references.length < MAX_REFERENCES && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary">
                        <ImagePlus className="h-5 w-5" />
                        {uploading ? "Uploading…" : "Add"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="sr-only"
                          disabled={uploading}
                          onChange={(e) => {
                            void addReferences(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting || uploading}
                >
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
                {!authLoading && !user && (
                  <p className="text-center text-xs text-muted-foreground">
                    You'll need to{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      sign in
                    </Link>{" "}
                    to submit.
                  </p>
                )}
              </form>
            )}
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
