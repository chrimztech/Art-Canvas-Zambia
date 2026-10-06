import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Attendee, ClassItem, Exhibition, Supply } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Plus, ScanLine, Users } from "lucide-react";
import { QrScanner } from "@/components/qr-scanner";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/listings")({
  head: () => ({ meta: [{ title: "My listings — ChrisEpic Arts" }] }),
  component: Listings,
});

function Listings() {
  const [roles, setRoles] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const me = await api.get<{ roles: string[] }>("/api/me");
      setRoles(me.roles);
      const [c, e, s] = await Promise.all([
        api.get<ClassItem[]>("/api/me/classes"),
        api.get<Exhibition[]>("/api/me/exhibitions"),
        api.get<Supply[]>("/api/me/supplies"),
      ]);
      setClasses(c);
      setExhibitions(e);
      setSupplies(s);
    } catch (e) {
      toast.error(errorMessage(e, "Could not load your listings"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function act(
    path: string,
    body: unknown,
    success: string,
    method: "patch" | "del" = "patch",
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      if (method === "del") await api.del(path);
      else await api.patch(path, body);
      toast.success(success);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update listing"));
    }
  }

  const has = (r: string) =>
    roles.includes(r) || roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const defaultTab = has("INSTRUCTOR") ? "classes" : has("SUPPLIER") ? "supplies" : "exhibitions";

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
        <h1 className="font-display text-3xl font-semibold">My listings</h1>
        <p className="mt-1 text-muted-foreground">
          Classes, exhibitions and supplies you run. Artworks live in{" "}
          <Link to="/dashboard/artworks" className="text-primary hover:underline">
            My artworks
          </Link>
          .
        </p>

        <Tabs defaultValue={defaultTab} className="mt-8">
          <TabsList>
            <TabsTrigger value="classes">Classes ({classes.length})</TabsTrigger>
            <TabsTrigger value="exhibitions">Exhibitions ({exhibitions.length})</TabsTrigger>
            <TabsTrigger value="supplies">Supplies ({supplies.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="mt-6 grid gap-4 xl:grid-cols-2 xl:items-start">
            {has("INSTRUCTOR") && <NewButton to="/dashboard/new-class" label="New class" />}
            {classes.length === 0 && (
              <Empty
                text={
                  has("INSTRUCTOR")
                    ? "You haven't published any classes yet."
                    : "Enable instructor tools from your dashboard to teach classes."
                }
              />
            )}
            {classes.map((c) => (
              <Row
                key={c.id}
                title={c.title}
                status={c.status}
                viewLink={
                  <Link
                    to="/classes/$slug"
                    params={{ slug: c.slug }}
                    className="hover:text-primary"
                  >
                    {c.title}
                  </Link>
                }
                meta={`${new Date(c.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · ${c.enrolledCount}/${c.capacity} enrolled · ${Number(c.priceZmw) > 0 ? formatZmw(c.priceZmw) : "Free"}`}
                editTo="/dashboard/new-class"
                editSlug={c.slug}
                onPublishToggle={() =>
                  act(
                    `/api/classes/${c.id}/status`,
                    { status: c.status === "published" ? "draft" : "published" },
                    c.status === "published" ? "Class unpublished" : "Class published",
                  )
                }
                onCancel={
                  c.status === "published"
                    ? () =>
                        act(
                          `/api/classes/${c.id}/status`,
                          { status: "cancelled" },
                          "Class cancelled",
                          "patch",
                          "Cancel this class? Enrolled students will see it as cancelled.",
                        )
                    : undefined
                }
                onDelete={() =>
                  act(
                    `/api/classes/${c.id}`,
                    null,
                    "Class deleted",
                    "del",
                    "Delete this class permanently?",
                  )
                }
                attendeesPath={`/api/classes/${c.id}/enrollments`}
                attendeeMode="class"
              />
            ))}
          </TabsContent>

          <TabsContent
            value="exhibitions"
            className="mt-6 grid gap-4 xl:grid-cols-2 xl:items-start"
          >
            {(has("ARTIST") || has("INSTRUCTOR")) && (
              <NewButton to="/dashboard/new-exhibition" label="Host an exhibition" />
            )}
            {exhibitions.length === 0 && <Empty text="You haven't listed any exhibitions yet." />}
            {exhibitions.map((e) => (
              <Row
                key={e.id}
                title={e.title}
                status={e.status}
                viewLink={
                  <Link
                    to="/exhibitions/$slug"
                    params={{ slug: e.slug }}
                    className="hover:text-primary"
                  >
                    {e.title}
                  </Link>
                }
                meta={`${new Date(e.startsAt).toLocaleDateString()} – ${new Date(e.endsAt).toLocaleDateString()} · ${e.venue} · ${e.ticketsSold}${e.capacity ? `/${e.capacity}` : ""} tickets`}
                editTo="/dashboard/new-exhibition"
                editSlug={e.slug}
                onPublishToggle={() =>
                  act(
                    `/api/exhibitions/${e.id}/status`,
                    { status: e.status === "published" ? "draft" : "published" },
                    e.status === "published" ? "Exhibition unpublished" : "Exhibition published",
                  )
                }
                onCancel={
                  e.status === "published"
                    ? () =>
                        act(
                          `/api/exhibitions/${e.id}/status`,
                          { status: "cancelled" },
                          "Exhibition cancelled",
                          "patch",
                          "Cancel this exhibition?",
                        )
                    : undefined
                }
                onDelete={() =>
                  act(
                    `/api/exhibitions/${e.id}`,
                    null,
                    "Exhibition deleted",
                    "del",
                    "Delete this exhibition permanently?",
                  )
                }
                attendeesPath={`/api/exhibitions/${e.id}/attendees`}
                attendeeMode="exhibition"
              />
            ))}
          </TabsContent>

          <TabsContent value="supplies" className="mt-6 grid gap-4 xl:grid-cols-2 xl:items-start">
            {has("SUPPLIER") && <NewButton to="/dashboard/new-supply" label="New supply listing" />}
            {supplies.length === 0 && (
              <Empty
                text={
                  has("SUPPLIER")
                    ? "You haven't listed any supplies yet."
                    : "Enable supplier tools from your dashboard to sell supplies."
                }
              />
            )}
            {supplies.map((s) => (
              <Row
                key={s.id}
                title={s.name}
                status={s.status}
                viewLink={
                  <Link
                    to="/supplies/$slug"
                    params={{ slug: s.slug }}
                    className="hover:text-primary"
                  >
                    {s.name}
                  </Link>
                }
                meta={`${formatZmw(s.priceZmw)} · ${s.stock > 0 ? `${s.stock} in stock` : "Out of stock"} · ${s.condition}`}
                editTo="/dashboard/new-supply"
                editSlug={s.slug}
                onPublishToggle={() =>
                  act(
                    `/api/supplies/${s.id}/status`,
                    { status: s.status === "published" ? "draft" : "published" },
                    s.status === "published" ? "Listing unpublished" : "Listing published",
                  )
                }
                onDelete={() =>
                  act(
                    `/api/supplies/${s.id}`,
                    null,
                    "Listing deleted",
                    "del",
                    "Delete this listing permanently?",
                  )
                }
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function NewButton({
  to,
  label,
}: {
  to: "/dashboard/new-class" | "/dashboard/new-exhibition" | "/dashboard/new-supply";
  label: string;
}) {
  return (
    <Button size="sm" asChild>
      <Link to={to}>
        <Plus className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Row(props: {
  title: string;
  status: string;
  viewLink: React.ReactNode;
  meta: string;
  editTo: "/dashboard/new-class" | "/dashboard/new-exhibition" | "/dashboard/new-supply";
  editSlug: string;
  onPublishToggle: () => void;
  onCancel?: () => void;
  onDelete: () => void;
  attendeesPath?: string;
  attendeeMode?: "class" | "exhibition";
}) {
  const [open, setOpen] = useState(false);
  const closed = props.status === "cancelled" || props.status === "completed";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{props.viewLink}</p>
          <p className="mt-1 text-sm text-muted-foreground">{props.meta}</p>
        </div>
        <Badge
          variant={
            props.status === "published"
              ? "default"
              : props.status === "cancelled"
                ? "destructive"
                : "secondary"
          }
          className="capitalize"
        >
          {props.status}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={props.editTo} search={{ edit: props.editSlug }}>
            Edit
          </Link>
        </Button>
        {!closed && (
          <Button size="sm" variant="outline" onClick={props.onPublishToggle}>
            {props.status === "published" ? "Unpublish" : "Publish"}
          </Button>
        )}
        {props.onCancel && (
          <Button size="sm" variant="outline" onClick={props.onCancel}>
            Cancel event
          </Button>
        )}
        {props.attendeesPath && (
          <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
            <Users className="h-4 w-4" />
            {props.attendeeMode === "class" ? "Roster" : "Guest list"}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-destructive" onClick={props.onDelete}>
          Delete
        </Button>
      </div>
      {open && props.attendeesPath && (
        <AttendeeList path={props.attendeesPath} mode={props.attendeeMode!} />
      )}
    </div>
  );
}

function AttendeeList({ path, mode }: { path: string; mode: "class" | "exhibition" }) {
  const [rows, setRows] = useState<Attendee[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const load = useCallback(
    () =>
      api
        .get<Attendee[]>(path)
        .then(setRows)
        .catch((e) => toast.error(errorMessage(e, "Could not load attendees"))),
    [path],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function mark(a: Attendee) {
    try {
      if (mode === "class") await api.post(`/api/classes/enrollments/${a.id}/attended`);
      else await api.post(`/api/exhibitions/tickets/${a.id}/check-in`);
      toast.success(mode === "class" ? "Marked as attended" : "Checked in");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update attendee"));
    }
  }

  const scan = useCallback(
    async (code: string) => {
      const id = code.trim();
      const guest = rows?.find((r) => r.id === id);
      if (!guest) {
        toast.error("That ticket isn't for this event");
        return;
      }
      if (guest.checkedInAt) {
        toast.warning(`${guest.displayName ?? "Guest"} is already checked in`);
        return;
      }
      try {
        await api.post(`/api/exhibitions/tickets/${id}/check-in`);
        toast.success(
          `Checked in ${guest.displayName ?? "guest"} (${guest.quantity} ticket${guest.quantity === 1 ? "" : "s"})`,
        );
        load();
      } catch (e) {
        toast.error(errorMessage(e, "Could not check in"));
      }
    },
    [rows, load],
  );

  if (!rows) return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0)
    return <p className="mt-3 text-sm text-muted-foreground">No one has signed up yet.</p>;
  return (
    <>
      {mode === "exhibition" && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={() => setScanning((s) => !s)}>
            <ScanLine className="h-4 w-4" />{" "}
            {scanning ? "Stop scanning" : "Scan tickets at the door"}
          </Button>
          {scanning && (
            <div className="mt-3">
              <QrScanner onCode={scan} />
            </div>
          )}
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">{mode === "class" ? "Status" : "Tickets"}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => {
              const done = mode === "class" ? a.status === "attended" : !!a.checkedInAt;
              const confirmed = a.status === "paid" || a.status === "attended";
              return (
                <tr key={a.id}>
                  <td className="px-3 py-2">{a.displayName ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.email ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">
                    {mode === "class"
                      ? a.status === "paid"
                        ? "confirmed"
                        : a.status
                      : `${a.quantity} · ${a.status === "paid" ? "confirmed" : a.status}`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {mode === "class" ? "Attended" : "Checked in"}
                      </span>
                    ) : confirmed ? (
                      <Button size="sm" variant="outline" onClick={() => mark(a)}>
                        {mode === "class" ? "Mark attended" : "Check in"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
