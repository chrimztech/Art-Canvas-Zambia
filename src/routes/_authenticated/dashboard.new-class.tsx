import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ClassItem } from "@/lib/types";
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

export const Route = createFileRoute("/_authenticated/dashboard/new-class")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => ({
    edit: typeof search.edit === "string" && search.edit ? search.edit : undefined,
  }),
  head: () => ({ meta: [{ title: "Class — ChrisEpic Arts" }] }),
  component: ClassForm,
});

const SELECT = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function ClassForm() {
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!edit);
  const [cover, setCover] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    mode: "in_person",
    location: "",
    meetingUrl: "",
    startsAt: "",
    endsAt: "",
    capacity: "10",
    priceZmw: "0",
    skillLevel: "",
    prerequisites: "",
    syllabus: "",
    tags: "",
    materialsIncluded: false,
  });

  useEffect(() => {
    if (!edit) return;
    api
      .get<ClassItem>(`/api/classes/${edit}`)
      .then((c) => {
        setId(c.id);
        setCover(c.coverImageUrl);
        setForm({
          title: c.title,
          description: c.description ?? "",
          mode: c.mode,
          location: c.location ?? "",
          meetingUrl: c.meetingUrl ?? "",
          startsAt: toLocalInput(c.startsAt),
          endsAt: toLocalInput(c.endsAt),
          capacity: String(c.capacity),
          priceZmw: String(c.priceZmw),
          skillLevel: c.skillLevel ?? "",
          prerequisites: c.prerequisites ?? "",
          syllabus: c.syllabus ?? "",
          tags: c.tags.join(", "),
          materialsIncluded: c.materialsIncluded,
        });
      })
      .catch((e) => toast.error(errorMessage(e, "Could not load class")))
      .finally(() => setLoading(false));
  }, [edit]);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover) return toast.error("Please add a cover image");
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return toast.error("The class must end after it starts");
    setBusy(true);
    const body = {
      title: form.title,
      description: form.description,
      mode: form.mode,
      location: form.mode === "online" ? null : form.location || null,
      meetingUrl: form.mode === "in_person" ? null : form.meetingUrl || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      capacity: Number(form.capacity),
      priceZmw: Number(form.priceZmw),
      coverImageUrl: cover,
      skillLevel: form.skillLevel || null,
      prerequisites: form.prerequisites || null,
      syllabus: form.syllabus || null,
      tags: splitTags(form.tags),
      materialsIncluded: form.materialsIncluded,
    };
    try {
      const saved = id
        ? await api.put<ClassItem>(`/api/classes/${id}`, body)
        : await api.post<ClassItem>("/api/classes", body);
      toast.success(id ? "Class updated" : "Class published!");
      navigate({ to: "/classes/$slug", params: { slug: saved.slug } });
    } catch (err) {
      toast.error(errorMessage(err, "Could not save class"));
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
          {edit ? "Edit class" : "New class"}
        </h1>
        <p className="mt-1 text-muted-foreground">Teach what you know — online or in person.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <ImageField value={cover} onChange={setCover} />
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={set("title")}
              placeholder="Watercolor fundamentals"
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
              <Label htmlFor="mode">Format</Label>
              <select id="mode" value={form.mode} onChange={set("mode")} className={SELECT}>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <Label htmlFor="level">Skill level</Label>
              <select
                id="level"
                value={form.skillLevel}
                onChange={set("skillLevel")}
                className={SELECT}
              >
                <option value="">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          {form.mode !== "online" && (
            <div>
              <Label htmlFor="location">Venue / address</Label>
              <Input
                id="location"
                required
                value={form.location}
                onChange={set("location")}
                placeholder="Studio 4, Manda Hill, Lusaka"
              />
            </div>
          )}
          {form.mode !== "in_person" && (
            <div>
              <Label htmlFor="meeting">Meeting link</Label>
              <Input
                id="meeting"
                type="url"
                required
                value={form.meetingUrl}
                onChange={set("meetingUrl")}
                placeholder="https://meet.google.com/…"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Only shown to confirmed students.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="starts">Starts</Label>
              <Input
                id="starts"
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={set("startsAt")}
              />
            </div>
            <div>
              <Label htmlFor="ends">Ends</Label>
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
              <Label htmlFor="cap">Seats</Label>
              <Input
                id="cap"
                required
                type="number"
                min={1}
                value={form.capacity}
                onChange={set("capacity")}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (ZMW, 0 = free)</Label>
              <Input
                id="price"
                required
                type="number"
                min={0}
                value={form.priceZmw}
                onChange={set("priceZmw")}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="syllabus">What you'll cover</Label>
            <Textarea
              id="syllabus"
              rows={4}
              value={form.syllabus}
              onChange={set("syllabus")}
              placeholder="One topic per line"
            />
          </div>
          <div>
            <Label htmlFor="prereq">Prerequisites</Label>
            <Input
              id="prereq"
              value={form.prerequisites}
              onChange={set("prerequisites")}
              placeholder="None — bring curiosity"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={set("tags")}
              placeholder="watercolour, landscapes"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.materialsIncluded}
              onChange={(e) => setForm({ ...form, materialsIncluded: e.target.checked })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Materials are included in the price
          </label>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Saving…" : edit ? "Save changes" : "Publish class"}
          </Button>
        </form>
      </div>
    </div>
  );
}
