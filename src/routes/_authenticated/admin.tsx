import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { AdminPanel } from "@/components/admin-panel";
import type { AdminUser, ArtworkSummary, PayoutRequest, PlatformSettings, WalletBalance } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings, Users, Palette, Lock, AlertCircle, Banknote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ChrisEpic Arts" }] }),
  component: AdminPanel,
});

function Admin() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [artworks, setArtworks] = useState<ArtworkSummary[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [saving, setSaving] = useState(false);
  const [platformFee, setPlatformFee] = useState("");
  const [royalty, setRoyalty] = useState("");

  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isSuper = roles.includes("SUPER_ADMIN");

  async function load() {
    const me = await api.get<{ roles: string[] }>("/api/me");
    setRoles(me.roles);
    if (!me.roles.includes("ADMIN") && !me.roles.includes("SUPER_ADMIN")) {
      setLoading(false);
      return;
    }
    const [s, u, a, p, w] = await Promise.all([
      api.get<PlatformSettings>("/api/admin/settings"),
      api.get<AdminUser[]>("/api/admin/users"),
      api.get<ArtworkSummary[]>("/api/admin/artworks"),
      api.get<PayoutRequest[]>("/api/admin/payouts"),
      api.get<WalletBalance>("/api/admin/wallet-balance"),
    ]);
    setSettings(s);
    setPlatformFee(String(s.platformFeePercent));
    setRoyalty(String(s.developerRoyaltyPercent));
    setUsers(u);
    setArtworks(a);
    setPayouts(p);
    setWalletBalance(w);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approvePayout(id: string) {
    try {
      await api.post(`/api/admin/payouts/${id}/approve`);
      toast.success("Payout submitted to ZynlePay");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not approve payout");
    }
  }

  async function rejectPayout(id: string) {
    const note = window.prompt("Reason for rejecting this payout (optional):") ?? undefined;
    try {
      await api.post(`/api/admin/payouts/${id}/reject`, { note });
      toast.success("Payout rejected");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not reject payout");
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put("/api/admin/settings", {
        platformFeePercent: Number(platformFee),
        ...(isSuper ? { developerRoyaltyPercent: Number(royalty) } : {}),
      });
      toast.success("Settings saved");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(userId: string, role: "ARTIST" | "ADMIN" | "SUPER_ADMIN", has: boolean) {
    try {
      if (has) await api.del(`/api/admin/users/${userId}/roles/${role}`);
      else await api.post(`/api/admin/users/${userId}/roles`, { role });
      toast.success("Role updated");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update role");
    }
  }

  async function setArtworkStatus(id: string, status: "published" | "draft" | "archived") {
    try {
      await api.patch(`/api/artworks/${id}/status`, { status });
      toast.success(`Artwork ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update artwork");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background"><SiteHeader /><div className="mx-auto max-w-7xl p-10 text-muted-foreground">Loading…</div></div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-background"><SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">Your account doesn't have admin privileges. Ask a super-admin to grant the role.</p>
        <Button variant="outline" className="mt-6" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );

  const royaltyNum = Number(royalty) || 0;
  const feeNum = Number(platformFee) || 0;
  const artistShare = Math.max(0, 100 - royaltyNum - feeNum);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold">Admin panel</h1>
          {isSuper && <Badge>Super Admin</Badge>}
        </div>
        <p className="mt-1 text-muted-foreground">Manage settings, users, and content.</p>

        <Tabs defaultValue="settings" className="mt-8">
          <TabsList>
            <TabsTrigger value="settings"><Settings className="mr-1.5 h-4 w-4" />Settings</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="content"><Palette className="mr-1.5 h-4 w-4" />Content</TabsTrigger>
            <TabsTrigger value="payouts"><Banknote className="mr-1.5 h-4 w-4" />Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue split</CardTitle>
                  <CardDescription>Configure how each sale is divided between artist, platform and developer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="fee">Platform fee (%)</Label>
                    <Input id="fee" type="number" step="0.1" min="0" max="50" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} className="mt-1.5 max-w-xs" />
                    <p className="mt-1 text-xs text-muted-foreground">ChrisEpic Arts's commission on each sale.</p>
                  </div>
                  <div>
                    <Label htmlFor="roy" className="flex items-center gap-1.5">Developer royalty (%) {!isSuper && <Lock className="h-3 w-3 text-muted-foreground" />}</Label>
                    <Input id="roy" type="number" step="0.1" min="0" max="50" value={royalty} onChange={(e) => setRoyalty(e.target.value)} disabled={!isSuper} className="mt-1.5 max-w-xs" />
                    <p className="mt-1 text-xs text-muted-foreground">{isSuper ? "Locked to super-admin only. Contractual default: 10%." : "Only the super-admin can modify this. Default: 10%."}</p>
                  </div>
                  <Button onClick={saveSettings} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Split preview</CardTitle><CardDescription>For every K100 in sales</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Row label="Artist payout" value={artistShare} color="bg-primary" />
                  <Row label="Platform fee" value={feeNum} color="bg-secondary" />
                  <Row label="Developer royalty" value={royaltyNum} color="bg-accent-foreground/70" />
                  {artistShare < 0 && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />Total exceeds 100%. Adjust values.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader><CardTitle>ZynlePay wallet</CardTitle><CardDescription>Live balance from the platform's ZynlePay merchant account.</CardDescription></CardHeader>
                <CardContent>
                  {walletBalance?.message && !walletBalance.collectionBalance && (
                    <p className="text-sm text-destructive">{walletBalance.message}</p>
                  )}
                  {(walletBalance?.collectionBalance || walletBalance?.disbursementBalance) && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Collection balance</p><p className="font-display text-xl font-semibold">K{walletBalance.collectionBalance}</p></div>
                      <div><p className="text-muted-foreground">Disbursement balance</p><p className="font-display text-xl font-semibold">K{walletBalance.disbursementBalance}</p></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Users ({users.length})</CardTitle><CardDescription>Grant or revoke roles. Super-admin role can only be assigned by another super-admin.</CardDescription></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {users.map((u) => {
                    const userRoles = u.roles;
                    return (
                      <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{u.displayName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{u.id}</p>
                          <div className="mt-1 flex flex-wrap gap-1">{userRoles.map((r) => <Badge key={r} variant="secondary" className="text-xs">{r.toLowerCase()}</Badge>)}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant={userRoles.includes("ARTIST") ? "default" : "outline"} onClick={() => toggleRole(u.id, "ARTIST", userRoles.includes("ARTIST"))}>Artist</Button>
                          <Button size="sm" variant={userRoles.includes("ADMIN") ? "default" : "outline"} onClick={() => toggleRole(u.id, "ADMIN", userRoles.includes("ADMIN"))}>Admin</Button>
                          {isSuper && (
                            <Button size="sm" variant={userRoles.includes("SUPER_ADMIN") ? "default" : "outline"} onClick={() => toggleRole(u.id, "SUPER_ADMIN", userRoles.includes("SUPER_ADMIN"))}>Super</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Artworks ({artworks.length})</CardTitle><CardDescription>Moderate listings.</CardDescription></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {artworks.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <Link to="/artworks/$slug" params={{ slug: a.slug }} className="font-medium hover:text-primary truncate block">{a.title}</Link>
                        <p className="text-xs text-muted-foreground">by {a.artistDisplayName ?? "—"} · K{Number(a.priceZmw).toLocaleString()}</p>
                      </div>
                      <Badge variant={a.status === "published" ? "default" : "secondary"}>{a.status}</Badge>
                      <div className="flex gap-2">
                        {a.status !== "published" && <Button size="sm" variant="outline" onClick={() => setArtworkStatus(a.id, "published")}>Publish</Button>}
                        {a.status !== "archived" && <Button size="sm" variant="outline" onClick={() => setArtworkStatus(a.id, "archived")}>Archive</Button>}
                      </div>
                    </div>
                  ))}
                  {artworks.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No artworks yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payout requests ({payouts.length})</CardTitle>
                <CardDescription>{isSuper ? "Approving triggers a real disbursement via ZynlePay." : "Only a super-admin can approve payouts; you can still reject."}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{p.artistDisplayName ?? "Artist"} · K{Number(p.amountZmw).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{p.referenceNo} · {p.method === "momo" ? p.phone : `${p.bankName} · ${p.receiverId}`}</p>
                        {p.adminNote && <p className="mt-1 text-xs text-destructive">{p.adminNote}</p>}
                      </div>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "requested" ? "outline" : "secondary"} className="capitalize">{p.status}</Badge>
                      {p.status === "requested" && (
                        <div className="flex gap-2">
                          {isSuper && <Button size="sm" onClick={() => approvePayout(p.id)}>Approve</Button>}
                          <Button size="sm" variant="outline" onClick={() => rejectPayout(p.id)}>Reject</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {payouts.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No payout requests yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value.toFixed(1)}%</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className={color} style={{ width: `${pct}%`, height: "100%" }} /></div>
    </div>
  );
}
