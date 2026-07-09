import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/new-supply")({
  head: () => ({ meta: [{ title: "List a supply — ChrisEpic Arts" }] }),
  component: NewSupply,
});

function NewSupply() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "paint", condition: "new",
    price_zmw: "0", stock: "1",
  });
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please add a cover image"); return; }
    setBusy(true);
    try {
      const uploaded = await api.upload<UploadResponse>("/api/uploads", file);
      await api.post("/api/supplies", {
        name: form.name,
        description: form.description || null,
        category: form.category,
        condition: form.condition,
        priceZmw: Number(form.price_zmw),
        stock: Number(form.stock),
        coverImageUrl: uploaded.url,
      });
      toast.success("Supply listed!");
      navigate({ to: "/supplies" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not list supply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">List a supply</h1>
        <p className="mt-1 text-muted-foreground">Sell paint, brushes, canvas, paper or tools to local artists.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div><Label>Item name</Label><Input required value={form.name} onChange={set("name")} placeholder="Winsor & Newton watercolor set" /></div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={set("description")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={set("category")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="paint">Paint</option>
                <option value="brushes">Brushes</option>
                <option value="canvas">Canvas</option>
                <option value="paper">Paper</option>
                <option value="tools">Tools</option>
                <option value="frames">Frames</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Condition</Label>
              <select value={form.condition} onChange={set("condition")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Price (ZMW)</Label><Input required type="number" min={0} value={form.price_zmw} onChange={set("price_zmw")} /></div>
            <div><Label>Stock</Label><Input required type="number" min={1} value={form.stock} onChange={set("stock")} /></div>
          </div>
          <div>
            <Label htmlFor="file">Cover image</Label>
            <Input id="file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Publishing…" : "Publish listing"}</Button>
        </form>
      </div>
    </div>
  );
}
