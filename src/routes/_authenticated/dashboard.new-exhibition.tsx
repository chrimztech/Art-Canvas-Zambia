import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Exhibition } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { ImageField } from "@/components/image-field";
import { splitTags, toLocalInput } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/new-exhibition")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" && search.edit ? search.edit : undefined,
  }),
  head: () => ({ meta: [{ title: "Exhibition — ChrisEpic Arts" }] }),
  component: ExhibitionForm,
});

function ExhibitionForm() {
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!edit);
  const [cover, setCover] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    city: "",
    startsAt: "",
    endsAt: "",
    ticketPriceZmw: "0",
    capacity: "100",
    curatorName: "",
    theme: "",
    tags: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (!edit) return;
    api
      .get<Exhibition>(`/api/exhibitions/${edit}`)
      .then((x) => {
        setId(x.id);
        setCover(x.coverImageUrl);
        setForm({
          title: x.title,
          description: x.description ?? "",
          venue: x.venue,
          city: x.city ?? "",
          startsAt: toLocalInput(x.startsAt),
          endsAt: toLocalInput(x.endsAt),
          ticketPriceZmw: String(x.ticketPriceZmw),
          capacity: x.capacity != null ? String(x.capacity) : "",
          curatorName: x.curatorName ?? "",
          theme: x.theme ?? "",
          tags: x.tags.join(", "),
          contactEmail: x.contactEmail ?? "",
          contactPhone: x.contactPhone ?? "",
        });
      })
      .catch((e) => toast.error(errorMessage(e, "Could not load exhibition")))
      .finally(() => setLoading(false));
  }, [edit]);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover) return toast.error("Please add a cover image");
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return toast.error("The exhibition must end after it starts");
    setBusy(true);
    const body = {
      title: form.title,
      description: form.description,
      venue: form.venue,
      city: form.city || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      ticketPriceZmw: Number(form.ticketPriceZmw),
      capacity: form.capacity ? Number(form.capacity) : null,
      coverImageUrl: cover,
      curatorName: form.curatorName || null,
      theme: form.theme || null,
      tags: splitTags(form.tags),
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
    };
    try {
      const saved = id
        ? await api.put<Exhibition>(`/api/exhibitions/${id}`, body)
        : await api.post<Exhibition>("/api/exhibitions", body);
      toast.success(id ? "Exhibition updated" : "Exhibition published!");
      navigate({ to: "/exhibitions/$slug", params: { slug: saved.slug } });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save exhibition"));
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
      <div className="page-container py-10">
        <Link
          to="/dashboard/listings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          My listings
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold">
          {edit ? "Edit exhibition" : "New exhibition"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          List your opening, group show or gallery event. Free events issue QR tickets instantly.
        </p>
        <form
          onSubmit={submit}
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(260px,400px)_minmax(0,1fr)] lg:items-start"
        >
          <div className="lg:sticky lg:top-36">
            <ImageField value={cover} onChange={setCover} />
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={set("title")}
                placeholder="Lusaka Contemporary 2026"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                required
                rows={4}
                value={form.description}
                onChange={set("description")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Input id="theme" value={form.theme} onChange={set("theme")} />
              </div>
              <div>
                <Label htmlFor="curator">Curator</Label>
                <Input id="curator" value={form.curatorName} onChange={set("curatorName")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  required
                  value={form.venue}
                  onChange={set("venue")}
                  placeholder="Henry Tayali Gallery"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={set("city")} placeholder="Lusaka" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starts">Opens</Label>
                <Input
                  id="starts"
                  required
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={set("startsAt")}
                />
              </div>
              <div>
                <Label htmlFor="ends">Closes</Label>
                <Input
                  id="ends"
                  required
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={set("endsAt")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cap">Capacity (blank = unlimited)</Label>
                <Input
                  id="cap"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={set("capacity")}
                />
              </div>
              <div>
                <Label htmlFor="price">Ticket price (ZMW, 0 = free)</Label>
                <Input
                  id="price"
                  required
                  type="number"
                  min={0}
                  value={form.ticketPriceZmw}
                  onChange={set("ticketPriceZmw")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Contact email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contactEmail}
                  onChange={set("contactEmail")}
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={set("contactPhone")}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={set("tags")}
                placeholder="photography, group show"
              />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Saving…" : edit ? "Save changes" : "Publish exhibition"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
