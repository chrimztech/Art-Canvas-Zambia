import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { BlockedUser, Profile, Session, UploadResponse } from "@/lib/types";
import type { AuthUser } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, ImagePlus, Monitor, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { usePayoutBanks } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — ChrisEpic Arts" }] }),
  component: ProfilePage,
});

type Form = {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  instagram: string;
  phone: string;
  avatarUrl: string;
  coverImageUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  tiktokUrl: string;
  specialties: string;
  yearsExperience: string;
  payoutMethod: "momo" | "bank";
  payoutPhone: string;
  payoutBankName: string;
  payoutReceiverId: string;
  shopAnnouncement: string;
  returnPolicy: string;
  vacationMode: boolean;
  vacationMessage: string;
};

function toForm(p: Profile): Form {
  return {
    displayName: p.displayName ?? "",
    bio: p.bio ?? "",
    location: p.location ?? "",
    website: p.website ?? "",
    instagram: p.instagram ?? "",
    phone: p.phone ?? "",
    avatarUrl: p.avatarUrl ?? "",
    coverImageUrl: p.coverImageUrl ?? "",
    facebookUrl: p.facebookUrl ?? "",
    twitterUrl: p.twitterUrl ?? "",
    tiktokUrl: p.tiktokUrl ?? "",
    specialties: (p.specialties ?? []).join(", "),
    yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : "",
    payoutMethod: p.payoutMethod ?? "momo",
    payoutPhone: p.payoutPhone ?? "",
    payoutBankName: p.payoutBankName ?? "",
    payoutReceiverId: p.payoutReceiverId ?? "",
    shopAnnouncement: p.shopAnnouncement ?? "",
    returnPolicy: p.returnPolicy ?? "",
    vacationMode: p.vacationMode,
    vacationMessage: p.vacationMessage ?? "",
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

function ProfilePage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [verified, setVerified] = useState(false);
  const [verificationRequestedAt, setVerificationRequestedAt] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"avatarUrl" | "coverImageUrl" | null>(null);
  const banks = usePayoutBanks();

  useEffect(() => {
    (async () => {
      try {
        const [user, profile] = await Promise.all([
          api.get<AuthUser>("/api/me"),
          api.get<Profile>("/api/me/profile"),
        ]);
        setMe(user);
        setVerified(profile.verified);
        setVerificationRequestedAt(profile.verificationRequestedAt);
        setForm(toForm(profile));
      } catch (e) {
        toast.error(errorMessage(e, "Could not load your profile"));
      }
    })();
  }, []);

  if (!form || !me)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });
  const isSeller = me.roles.some((r) => ["ARTIST", "INSTRUCTOR", "SUPPLIER"].includes(r));

  async function upload(field: "avatarUrl" | "coverImageUrl", file: File | undefined) {
    if (!file || !form) return;
    setUploading(field);
    try {
      const res = await api.upload<UploadResponse>("/api/uploads", file);
      setForm({ ...form, [field]: res.url });
      toast.success("Image uploaded — save to apply");
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const saved = await api.put<Profile>("/api/me/profile", {
        displayName: form.displayName.trim(),
        bio: orNull(form.bio),
        location: orNull(form.location),
        website: orNull(form.website),
        instagram: orNull(form.instagram.replace(/^@/, "")),
        phone: orNull(form.phone),
        avatarUrl: orNull(form.avatarUrl),
        coverImageUrl: orNull(form.coverImageUrl),
        facebookUrl: orNull(form.facebookUrl),
        twitterUrl: orNull(form.twitterUrl),
        tiktokUrl: orNull(form.tiktokUrl),
        specialties: form.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
        payoutMethod: form.payoutMethod,
        payoutPhone: orNull(form.payoutPhone),
        payoutBankName: orNull(form.payoutBankName),
        payoutReceiverId: orNull(form.payoutReceiverId),
        shopAnnouncement: orNull(form.shopAnnouncement),
        returnPolicy: orNull(form.returnPolicy),
        vacationMode: form.vacationMode,
        vacationMessage: orNull(form.vacationMessage),
      });
      setForm(toForm(saved));
      toast.success("Profile updated");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (e) {
      toast.error(errorMessage(e, "Could not update profile"));
    } finally {
      setBusy(false);
    }
  }

  const initials = (form.displayName || me.email).slice(0, 2).toUpperCase();

  async function requestVerification() {
    try {
      await api.post("/api/me/verification-request");
      setVerificationRequestedAt(new Date().toISOString());
      toast.success("Request sent — our team will review your profile");
    } catch (e) {
      toast.error(errorMessage(e, "Could not send the request"));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your profile</h1>
            <p className="mt-1 text-muted-foreground">
              How buyers and other artists see you on ChrisEpic Arts.
            </p>
          </div>
          {me.roles.includes("ARTIST") && (
            <Button variant="outline" asChild>
              <Link to="/artists/$id" params={{ id: me.id }}>
                View public profile
              </Link>
            </Button>
          )}
        </div>

        <form onSubmit={save} className="mt-8 grid gap-6 xl:grid-cols-2 xl:items-start">
          <Card className="xl:col-span-2">
            <CardContent className="p-0">
              <div className="relative h-36 overflow-hidden rounded-t-xl bg-muted">
                {form.coverImageUrl && (
                  <img src={form.coverImageUrl} alt="" className="h-full w-full object-cover" />
                )}
                <label className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium">
                  <ImagePlus className="h-3.5 w-3.5" />
                  {uploading === "coverImageUrl" ? "Uploading…" : "Cover image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => upload("coverImageUrl", e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="flex items-center gap-4 p-5">
                <label className="group relative cursor-pointer">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={form.avatarUrl || undefined} alt={form.displayName} />
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs text-white opacity-0 group-hover:opacity-100">
                    {uploading === "avatarUrl" ? "…" : "Change"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => upload("avatarUrl", e.target.files?.[0])}
                  />
                </label>
                <div>
                  <p className="flex items-center gap-1 font-medium">
                    {form.displayName || "Unnamed"}
                    {verified && (
                      <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{me.email}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {me.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="capitalize">
                        {r.toLowerCase().replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={set("displayName")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={set("location")}
                    placeholder="Lusaka, Zambia"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={set("bio")}
                  placeholder="Your practice, influences and story"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="specialties">Specialties</Label>
                  <Input
                    id="specialties"
                    value={form.specialties}
                    onChange={set("specialties")}
                    placeholder="Oil painting, portraits, murals"
                  />
                </div>
                <div>
                  <Label htmlFor="years">Years of experience</Label>
                  <Input
                    id="years"
                    type="number"
                    min={0}
                    value={form.yearsExperience}
                    onChange={set("yearsExperience")}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="Private — shown to buyers only on your supply listings"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={set("website")}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram handle</Label>
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={set("instagram")}
                  placeholder="yourstudio"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input
                  id="facebook"
                  type="url"
                  value={form.facebookUrl}
                  onChange={set("facebookUrl")}
                  placeholder="https://facebook.com/…"
                />
              </div>
              <div>
                <Label htmlFor="twitter">X / Twitter URL</Label>
                <Input
                  id="twitter"
                  type="url"
                  value={form.twitterUrl}
                  onChange={set("twitterUrl")}
                  placeholder="https://x.com/…"
                />
              </div>
              <div>
                <Label htmlFor="tiktok">TikTok URL</Label>
                <Input
                  id="tiktok"
                  type="url"
                  value={form.tiktokUrl}
                  onChange={set("tiktokUrl")}
                  placeholder="https://tiktok.com/@…"
                />
              </div>
            </CardContent>
          </Card>

          {isSeller && (
            <Card>
              <CardHeader>
                <CardTitle>Payout account</CardTitle>
                <CardDescription>
                  Where your earnings are sent when you request a payout. Never shown publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="payoutMethod">Method</Label>
                  <select
                    id="payoutMethod"
                    value={form.payoutMethod}
                    onChange={set("payoutMethod")}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="momo">Mobile money</option>
                    <option value="bank">Bank transfer</option>
                  </select>
                </div>
                {form.payoutMethod === "momo" ? (
                  <div>
                    <Label htmlFor="payoutPhone">Mobile money number</Label>
                    <Input
                      id="payoutPhone"
                      value={form.payoutPhone}
                      onChange={set("payoutPhone")}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="bank">Bank</Label>
                      <Input
                        id="bank"
                        list="profile-banks"
                        value={form.payoutBankName}
                        onChange={set("payoutBankName")}
                      />
                      <datalist id="profile-banks">
                        {banks.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <Label htmlFor="acct">Account number</Label>
                      <Input
                        id="acct"
                        value={form.payoutReceiverId}
                        onChange={set("payoutReceiverId")}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {isSeller && (
            <Card>
              <CardHeader>
                <CardTitle>Shop settings</CardTitle>
                <CardDescription>
                  Shown on your profile and listings. Vacation mode pauses new orders without hiding
                  your work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="announcement">Shop announcement</Label>
                  <Textarea
                    id="announcement"
                    rows={2}
                    maxLength={500}
                    value={form.shopAnnouncement}
                    onChange={set("shopAnnouncement")}
                    placeholder="New series dropping in November · Free delivery in Lusaka this month"
                  />
                </div>
                <div>
                  <Label htmlFor="returnPolicy">Return policy</Label>
                  <Textarea
                    id="returnPolicy"
                    rows={3}
                    maxLength={2000}
                    value={form.returnPolicy}
                    onChange={set("returnPolicy")}
                    placeholder="Returns accepted within 14 days if the work arrives damaged or not as described."
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="vacation">Vacation mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Buyers can browse and save your work but can't check out.
                    </p>
                  </div>
                  <Switch
                    id="vacation"
                    checked={form.vacationMode}
                    onCheckedChange={(v) => setForm({ ...form, vacationMode: v })}
                  />
                </div>
                {form.vacationMode && (
                  <div>
                    <Label htmlFor="vacationMessage">Away message</Label>
                    <Input
                      id="vacationMessage"
                      maxLength={300}
                      value={form.vacationMessage}
                      onChange={set("vacationMessage")}
                      placeholder="Back on 20 October — orders resume then."
                    />
                  </div>
                )}
                {!verified && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Get verified</p>
                        <p className="text-xs text-muted-foreground">
                          {verificationRequestedAt
                            ? `Requested ${new Date(verificationRequestedAt).toLocaleDateString()} — we'll be in touch.`
                            : "A verified badge tells collectors we've confirmed who you are. Complete your bio and links first."}
                        </p>
                      </div>
                    </div>
                    {!verificationRequestedAt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={requestVerification}
                      >
                        Request verification
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="xl:col-span-2">
            <Button type="submit" size="lg" disabled={busy || !!uploading}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>

        <div className="mt-10 grid gap-6 xl:grid-cols-2 xl:items-start [&>*]:mt-0">
          <ChangePassword />
          <ActiveSessions />
          <BlockedMembers />
        </div>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (form.next !== form.confirm) return toast.error("New passwords don't match");
    setBusy(true);
    try {
      await api.post("/api/me/password", { currentPassword: form.current, newPassword: form.next });
      toast.success("Password changed. Other devices have been signed out.");
      setForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.error(errorMessage(e, "Could not change password"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="pw-current">Current</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="pw-new">New</Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="pw-confirm">Confirm new</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="outline" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const load = () =>
    api
      .get<Session[]>("/api/me/sessions")
      .then((s) => setSessions(s.filter((x) => x.active)))
      .catch(() => {});
  useEffect(() => {
    void load();
  }, []);

  async function revoke(id: string) {
    try {
      await api.del(`/api/me/sessions/${id}`);
      toast.success("Signed out that device");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not revoke session"));
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Where you're signed in</CardTitle>
        <CardDescription>Sign out devices you don't recognise.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-6 py-3 text-sm">
            <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{s.userAgent ?? "Unknown device"}</p>
              <p className="text-xs text-muted-foreground">
                {s.ipAddress ?? "—"} · last active {new Date(s.lastSeenAt).toLocaleString()}
              </p>
            </div>
            {s.current ? (
              <Badge variant="secondary">This device</Badge>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>
                Sign out
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BlockedMembers() {
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  useEffect(() => {
    api
      .get<BlockedUser[]>("/api/me/blocks")
      .then(setBlocked)
      .catch(() => setBlocked([]));
  }, []);
  if (!blocked || blocked.length === 0) return null;

  async function unblock(id: string) {
    try {
      await api.del(`/api/me/blocks/${id}`);
      setBlocked((list) => (list ?? []).filter((b) => b.id !== id));
      toast.success("Unblocked");
    } catch (e) {
      toast.error(errorMessage(e, "Could not unblock"));
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Blocked members</CardTitle>
        <CardDescription>They can't message you, and you can't message them.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {blocked.map((b) => (
          <div key={b.id} className="flex items-center gap-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={b.avatarUrl ?? undefined} />
              <AvatarFallback>{(b.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm">{b.displayName ?? "Member"}</span>
            <Button variant="ghost" size="sm" onClick={() => unblock(b.id)}>
              Unblock
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
