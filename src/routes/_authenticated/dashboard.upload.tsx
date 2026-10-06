import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtworkDetail, Category } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { GalleryField, ImageField } from "@/components/image-field";
import { splitTags } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/upload")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" && search.edit ? search.edit : undefined,
  }),
  head: () => ({ meta: [{ title: "Artwork — ChrisEpic Arts" }] }),
  component: ArtworkForm,
});

const EMPTY = {
  title: "",
  description: "",
  categoryId: "",
  medium: "",
  materials: "",
  surface: "",
  style: "",
  dimensions: "",
  weightKg: "",
  yearCreated: "",
  orientation: "",
  priceZmw: "",
  isOriginal: true,
  editionSize: "",
  framed: false,
  signed: false,
  signatureLocation: "",
  certificateOfAuthenticity: false,
  readyToHang: false,
  provenance: "",
  shippingNotes: "",
  originCity: "",
  originCountry: "Zambia",
  tags: "",
  shippingFeeZmw: "",
  acceptsOffers: false,
};
type FormState = typeof EMPTY;

function fromDetail(a: ArtworkDetail): FormState {
  return {
    title: a.title,
    description: a.description ?? "",
    categoryId: a.categoryId ?? "",
    medium: a.medium ?? "",
    materials: a.materials ?? "",
    surface: a.surface ?? "",
    style: a.style ?? "",
    dimensions: a.dimensions ?? "",
    weightKg: a.weightKg != null ? String(a.weightKg) : "",
    yearCreated: a.yearCreated != null ? String(a.yearCreated) : "",
    orientation: a.orientation ?? "",
    priceZmw: String(a.priceZmw),
    isOriginal: a.isOriginal,
    editionSize: a.editionSize != null ? String(a.editionSize) : "",
    framed: a.framed,
    signed: a.signed,
    signatureLocation: a.signatureLocation ?? "",
    certificateOfAuthenticity: a.certificateOfAuthenticity,
    readyToHang: a.readyToHang,
    provenance: a.provenance ?? "",
    shippingNotes: a.shippingNotes ?? "",
    originCity: a.originCity ?? "",
    originCountry: a.originCountry ?? "",
    tags: a.tags.join(", "),
    shippingFeeZmw: a.shippingFeeZmw != null ? String(a.shippingFeeZmw) : "",
    acceptsOffers: a.acceptsOffers,
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const numOrNull = (v: string) => (v.trim() ? Number(v) : null);

function ArtworkForm() {
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cover, setCover] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("published");
  const [loading, setLoading] = useState(!!edit);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!edit) return;
    api
      .get<ArtworkDetail>(`/api/me/artworks/${edit}`)
      .then((a) => {
        setForm(fromDetail(a));
        setCover(a.coverImageUrl);
        setGallery(a.images);
        setStatus(a.status);
      })
      .catch((e) => toast.error(errorMessage(e, "Could not load artwork")))
      .finally(() => setLoading(false));
  }, [edit]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });
  const toggle = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.checked });

  async function submit(asDraft: boolean) {
    if (!form.title.trim()) return toast.error("Please add a title");
    if (!cover) return toast.error("Please add a cover image");
    if (!(Number(form.priceZmw) >= 0) || form.priceZmw === "")
      return toast.error("Please enter a price");
    setBusy(true);
    const nextStatus = asDraft
      ? "draft"
      : status === "sold" || status === "archived"
        ? undefined
        : "published";
    const body = {
      title: form.title.trim(),
      description: orNull(form.description),
      categoryId: form.categoryId || null,
      medium: orNull(form.medium),
      materials: orNull(form.materials),
      surface: orNull(form.surface),
      style: orNull(form.style),
      dimensions: orNull(form.dimensions),
      weightKg: numOrNull(form.weightKg),
      yearCreated: numOrNull(form.yearCreated),
      orientation: form.orientation || null,
      priceZmw: Number(form.priceZmw),
      isOriginal: form.isOriginal,
      editionSize: form.isOriginal ? null : numOrNull(form.editionSize),
      framed: form.framed,
      signed: form.signed,
      signatureLocation: form.signed ? orNull(form.signatureLocation) : null,
      certificateOfAuthenticity: form.certificateOfAuthenticity,
      readyToHang: form.readyToHang,
      provenance: orNull(form.provenance),
      shippingNotes: orNull(form.shippingNotes),
      shippingFeeZmw: numOrNull(form.shippingFeeZmw),
      acceptsOffers: form.acceptsOffers,
      originCity: orNull(form.originCity),
      originCountry: orNull(form.originCountry),
      tags: splitTags(form.tags),
      coverImageUrl: cover,
      imageUrls: gallery,
      status: nextStatus,
    };
    try {
      const saved = edit
        ? await api.put<ArtworkDetail>(`/api/artworks/${edit}`, body)
        : await api.post<ArtworkDetail>("/api/artworks", body);
      toast.success(asDraft ? "Saved as draft" : edit ? "Artwork updated" : "Artwork published!");
      if (asDraft) navigate({ to: "/dashboard/artworks" });
      else navigate({ to: "/artworks/$slug", params: { slug: saved.slug } });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save artwork"));
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

  const checkbox = (k: keyof FormState, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={form[k] as boolean}
        onChange={toggle(k)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      {label}
    </label>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/dashboard/artworks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          My artworks
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">
          {edit ? "Edit artwork" : "Upload artwork"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Great photos and complete details help collectors buy with confidence.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
          className="mt-8 space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageField value={cover} onChange={setCover} aspect="aspect-[4/3]" />
              <GalleryField value={gallery} onChange={setGallery} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>The work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={set("title")}
                  required
                  maxLength={150}
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  rows={5}
                  value={form.description}
                  onChange={set("description")}
                  placeholder="Inspiration, technique, story behind the piece"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={form.categoryId}
                    onChange={set("categoryId")}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="year">Year created</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1800}
                    max={new Date().getFullYear()}
                    value={form.yearCreated}
                    onChange={set("yearCreated")}
                  />
                </div>
                <div>
                  <Label htmlFor="medium">Medium</Label>
                  <Input
                    id="medium"
                    placeholder="Oil on canvas"
                    value={form.medium}
                    onChange={set("medium")}
                  />
                </div>
                <div>
                  <Label htmlFor="style">Style</Label>
                  <Input
                    id="style"
                    placeholder="Abstract, realism…"
                    value={form.style}
                    onChange={set("style")}
                  />
                </div>
                <div>
                  <Label htmlFor="materials">Materials</Label>
                  <Input id="materials" value={form.materials} onChange={set("materials")} />
                </div>
                <div>
                  <Label htmlFor="surface">Surface</Label>
                  <Input
                    id="surface"
                    placeholder="Canvas, paper, wood…"
                    value={form.surface}
                    onChange={set("surface")}
                  />
                </div>
                <div>
                  <Label htmlFor="dim">Dimensions</Label>
                  <Input
                    id="dim"
                    placeholder="80 × 100 cm"
                    value={form.dimensions}
                    onChange={set("dimensions")}
                  />
                </div>
                <div>
                  <Label htmlFor="orientation">Orientation</Label>
                  <select
                    id="orientation"
                    value={form.orientation}
                    onChange={set("orientation")}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                    <option value="square">Square</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="wildlife, zambezi, blue"
                  value={form.tags}
                  onChange={set("tags")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price & edition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="price">Price (ZMW)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={form.priceZmw}
                    onChange={set("priceZmw")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={form.isOriginal ? "original" : "print"}
                    onChange={(e) =>
                      setForm({ ...form, isOriginal: e.target.value === "original" })
                    }
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="original">One-of-a-kind original</option>
                    <option value="print">Print / limited edition</option>
                  </select>
                </div>
                {!form.isOriginal && (
                  <div>
                    <Label htmlFor="edition">Edition size</Label>
                    <Input
                      id="edition"
                      type="number"
                      min={1}
                      value={form.editionSize}
                      onChange={set("editionSize")}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authenticity & shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {checkbox("signed", "Signed by the artist")}
                {checkbox("certificateOfAuthenticity", "Comes with certificate of authenticity")}
                {checkbox("framed", "Framed")}
                {checkbox("readyToHang", "Ready to hang")}
                {checkbox("acceptsOffers", "Accept offers from collectors")}
              </div>
              {form.signed && (
                <div>
                  <Label htmlFor="sigloc">Signature location</Label>
                  <Input
                    id="sigloc"
                    placeholder="Bottom right"
                    value={form.signatureLocation}
                    onChange={set("signatureLocation")}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="prov">Provenance</Label>
                <Textarea
                  id="prov"
                  rows={2}
                  value={form.provenance}
                  onChange={set("provenance")}
                  placeholder="Exhibition history, previous owners…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <Label htmlFor="shipfee">Delivery fee (K)</Label>
                  <Input
                    id="shipfee"
                    type="number"
                    min={0}
                    value={form.shippingFeeZmw}
                    onChange={set("shippingFeeZmw")}
                    placeholder="0 = free"
                  />
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
                  <Label htmlFor="ocity">Ships from (city)</Label>
                  <Input
                    id="ocity"
                    value={form.originCity}
                    onChange={set("originCity")}
                    placeholder="Lusaka"
                  />
                </div>
                <div>
                  <Label htmlFor="ocountry">Country</Label>
                  <Input id="ocountry" value={form.originCountry} onChange={set("originCountry")} />
                </div>
              </div>
              <div>
                <Label htmlFor="ship">Shipping notes</Label>
                <Textarea
                  id="ship"
                  rows={2}
                  value={form.shippingNotes}
                  onChange={set("shippingNotes")}
                  placeholder="Packaging, delivery areas, collection options"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Saving…" : edit ? "Save & publish" : "Publish artwork"}
            </Button>
            {status !== "sold" && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => submit(true)}
              >
                Save as draft
              </Button>
            )}
          </div>
          {status === "sold" && (
            <p className="text-sm text-muted-foreground">
              This piece has sold — details can still be edited, but it stays marked as sold.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
