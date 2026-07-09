import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/upload")({
  head: () => ({ meta: [{ title: "Upload artwork — ChrisEpic Arts" }] }),
  component: Upload,
});

function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please add a cover image"); return; }
    setLoading(true);
    try {
      const uploaded = await api.upload<UploadResponse>("/api/uploads", file);
      await api.post("/api/artworks", {
        title,
        description,
        medium,
        dimensions,
        priceZmw: Number(price),
        coverImageUrl: uploaded.url,
      });
      toast.success("Artwork published!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">Upload artwork</h1>
        <p className="mt-1 text-muted-foreground">Share your work with collectors across Zambia.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="medium">Medium</Label><Input id="medium" placeholder="Oil on canvas" value={medium} onChange={(e) => setMedium(e.target.value)} /></div>
            <div><Label htmlFor="dim">Dimensions</Label><Input id="dim" placeholder="80 × 100 cm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} /></div>
          </div>
          <div><Label htmlFor="price">Price (ZMW)</Label><Input id="price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
          <div>
            <Label htmlFor="file">Cover image</Label>
            <Input id="file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Publishing…" : "Publish artwork"}</Button>
        </form>
      </div>
    </div>
  );
}
