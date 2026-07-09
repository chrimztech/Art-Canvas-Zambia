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

export const Route = createFileRoute("/_authenticated/dashboard/new-class")({
  head: () => ({ meta: [{ title: "New class — ChrisEpic Arts" }] }),
  component: NewClass,
});

function NewClass() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", mode: "in_person", location: "",
    starts_at: "", ends_at: "", capacity: "10", price_zmw: "0",
  });
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Please add a cover image"); return; }
    setBusy(true);
    try {
      const uploaded = await api.upload<UploadResponse>("/api/uploads", file);
      await api.post("/api/classes", {
        title: form.title,
        description: form.description,
        mode: form.mode,
        location: form.location || null,
        startsAt: new Date(form.starts_at).toISOString(),
        endsAt: new Date(form.ends_at).toISOString(),
        capacity: Number(form.capacity),
        priceZmw: Number(form.price_zmw),
        coverImageUrl: uploaded.url,
      });
      toast.success("Class published!");
      navigate({ to: "/classes" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not publish class");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">New class</h1>
        <p className="mt-1 text-muted-foreground">Teach what you know — online or in person.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div><Label>Title</Label><Input required value={form.title} onChange={set("title")} placeholder="Watercolor fundamentals" /></div>
          <div><Label>Description</Label><Textarea required rows={4} value={form.description} onChange={set("description")} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mode</Label>
              <select required value={form.mode} onChange={set("mode")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={set("location")} placeholder="Lusaka or Zoom link" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Starts</Label><Input required type="datetime-local" value={form.starts_at} onChange={set("starts_at")} /></div>
            <div><Label>Ends</Label><Input required type="datetime-local" value={form.ends_at} onChange={set("ends_at")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Capacity</Label><Input required type="number" min={1} value={form.capacity} onChange={set("capacity")} /></div>
            <div><Label>Price (ZMW)</Label><Input required type="number" min={0} value={form.price_zmw} onChange={set("price_zmw")} /></div>
          </div>
          <div>
            <Label htmlFor="file">Cover image</Label>
            <Input id="file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <Button type="submit" size="lg" disabled={busy}>{busy ? "Publishing…" : "Publish class"}</Button>
        </form>
      </div>
    </div>
  );
}
