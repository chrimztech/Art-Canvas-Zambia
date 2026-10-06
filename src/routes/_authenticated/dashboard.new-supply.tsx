import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { SupplyDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { GalleryField, ImageField } from "@/components/image-field";
import { splitTags } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/new-supply")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" && search.edit ? search.edit : undefined,
  }),
  head: () => ({ meta: [{ title: "Supply listing — ChrisEpic Arts" }] }),
  component: SupplyForm,
});

const SELECT = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const CATEGORIES = ["paint", "brushes", "canvas", "paper", "tools", "frames", "easels", "other"];

function SupplyForm() {
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!edit);
  const [cover, setCover] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "paint",
    condition: "new",
    priceZmw: "",
    stock: "1",
    brand: "",
    sku: "",
    dimensions: "",
    weightKg: "",
    warrantyMonths: "",
    tags: "",
  });

  useEffect(() => {
    if (!edit) return;
    api
      .get<SupplyDetail>(`/api/supplies/${edit}`)
      .then((s) => {
        setId(s.id);
        setCover(s.coverImageUrl);
        setGallery(s.images);
        setForm({
          name: s.name,
          description: s.description ?? "",
          category: s.category ?? "other",
          condition: s.condition,
          priceZmw: String(s.priceZmw),
          stock: String(s.stock),
          brand: s.brand ?? "",
          sku: s.sku ?? "",
          dimensions: s.dimensions ?? "",
          weightKg: s.weightKg != null ? String(s.weightKg) : "",
          warrantyMonths: s.warrantyMonths != null ? String(s.warrantyMonths) : "",
          tags: s.tags.join(", "),
        });
      })
      .catch((e) => toast.error(errorMessage(e, "Could not load listing")))
      .finally(() => setLoading(false));
  }, [edit]);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover) return toast.error("Please add a cover image");
    setBusy(true);
    const body = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      condition: form.condition,
      priceZmw: Number(form.priceZmw),
      stock: Number(form.stock),
      coverImageUrl: cover,
      imageUrls: gallery,
      brand: form.brand || null,
      sku: form.sku || null,
      dimensions: form.dimensions || null,
      weightKg: form.weightKg ? Number(form.weightKg) : null,
      warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
      tags: splitTags(form.tags),
    };
    try {
      const saved = id
        ? await api.put<SupplyDetail>(`/api/supplies/${id}`, body)
        : await api.post<SupplyDetail>("/api/supplies", body);
      toast.success(id ? "Listing updated" : "Supply listed!");
      navigate({ to: "/supplies/$slug", params: { slug: saved.slug } });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save listing"));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          to="/dashboard/listings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          My listings
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">
          {edit ? "Edit listing" : "List a supply"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Sell paint, brushes, canvas, paper or tools to local artists. Stock updates automatically
          as orders are paid.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <ImageField value={cover} onChange={setCover} aspect="aspect-square max-w-xs" />
          <GalleryField value={gallery} onChange={setGallery} max={5} />
          <div>
            <Label htmlFor="name">Item name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={set("name")}
              placeholder="Winsor & Newton watercolor set"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} value={form.description} onChange={set("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={set("category")}
                className={`${SELECT} capitalize`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                value={form.condition}
                onChange={set("condition")}
                className={SELECT}
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (ZMW)</Label>
              <Input
                id="price"
                required
                type="number"
                min={0}
                value={form.priceZmw}
                onChange={set("priceZmw")}
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                required
                type="number"
                min={0}
                value={form.stock}
                onChange={set("stock")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={form.brand} onChange={set("brand")} />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={set("sku")} />
            </div>
            <div>
              <Label htmlFor="dim">Dimensions</Label>
              <Input id="dim" value={form.dimensions} onChange={set("dimensions")} />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min={0}
                step="0.1"
                value={form.weightKg}
                onChange={set("weightKg")}
              />
            </div>
            <div>
              <Label htmlFor="warranty">Warranty (months)</Label>
              <Input
                id="warranty"
                type="number"
                min={0}
                value={form.warrantyMonths}
                onChange={set("warrantyMonths")}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={set("tags")}
                placeholder="acrylic, student grade"
              />
            </div>
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Saving…" : edit ? "Save changes" : "Publish listing"}
          </Button>
        </form>
      </div>
    </div>
  );
}
