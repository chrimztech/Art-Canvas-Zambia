import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { becomeArtist as becomeArtistRole } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Palette, Plus, Settings, type LucideIcon, Shield, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — ChrisEpic Arts" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [roles, setRoles] = useState<string[]>([]);
  const [stats, setStats] = useState({ artworks: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [me, artworks, orders] = await Promise.all([
        api.get<{ roles: string[] }>("/api/me"),
        api.get<unknown[]>("/api/me/artworks"),
        api.get<unknown[]>("/api/me/orders"),
      ]);
      setRoles(me.roles);
      setStats({ artworks: artworks.length, orders: orders.length });
    } catch (error: any) {
      toast.error(error.message ?? "Could not load your dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const isArtist = roles.includes("ARTIST");
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const roleBadges = roles.length ? roles : ["CUSTOMER"];

  async function becomeArtist() {
    try {
      await becomeArtistRole();
      toast.success("Your artist workspace is ready. You can start uploading work now.");
      setRoles((current) => (current.includes("ARTIST") ? current : [...current, "ARTIST"]));
    } catch (error: any) {
      toast.error(error.message ?? "Could not update role");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
            <Card className="overflow-hidden">
              <CardContent className="relative p-8 sm:p-10">
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(215,182,95,0.28),transparent_72%)]" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Studio workspace
                  </div>
                  <h1 className="mt-5 font-display text-4xl leading-none sm:text-5xl">Your dashboard</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    Run your studio, keep tabs on orders, and move between artist and admin tools from one polished
                    control center.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {roleBadges.map((role) => (
                      <Badge key={role} variant={role.includes("ADMIN") ? "default" : "secondary"}>
                        {formatRole(role)}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {isArtist ? (
                      <Button asChild>
                        <Link to="/dashboard/upload">
                          <Plus className="h-4 w-4" />
                          Upload artwork
                        </Link>
                      </Button>
                    ) : (
                      <Button onClick={becomeArtist}>
                        <Sparkles className="h-4 w-4" />
                        Enable artist tools
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link to="/orders">View orders</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/dashboard/profile">Edit profile</Link>
                    </Button>
                    {isAdmin && (
                      <Button variant="secondary" asChild>
                        <Link to="/admin">
                          <Shield className="h-4 w-4" />
                          Open admin panel
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-background/45 px-4 py-3">
                      <div className="text-[0.7rem] uppercase tracking-[0.18em]">Artworks</div>
                      <div className="mt-2 font-display text-2xl text-foreground">
                        {loading ? "--" : stats.artworks.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/45 px-4 py-3">
                      <div className="text-[0.7rem] uppercase tracking-[0.18em]">Orders</div>
                      <div className="mt-2 font-display text-2xl text-foreground">
                        {loading ? "--" : stats.orders.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/45 px-4 py-3">
                      <div className="text-[0.7rem] uppercase tracking-[0.18em]">Workspace status</div>
                      <div className="mt-2 font-medium text-foreground">{isArtist ? "Artist tools live" : "Collector mode"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account snapshot</CardTitle>
                <CardDescription>Everything important about your access and next steps at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SnapshotRow label="Artist access" value={isArtist ? "Enabled" : "Not enabled"} />
                <SnapshotRow label="Admin access" value={isAdmin ? "Available" : "Not assigned"} />
                <SnapshotRow
                  label="Current roles"
                  value={roleBadges.map((role) => formatRole(role)).join(", ").toLowerCase()}
                />
                <SnapshotRow
                  label="Best next step"
                  value={
                    isArtist
                      ? "Keep your catalog fresh and respond to orders quickly."
                      : "Enable artist tools to start selling and taking commissions."
                  }
                />

                {!isArtist && (
                  <Button className="w-full" onClick={becomeArtist}>
                    <Sparkles className="h-4 w-4" />
                    Become an artist
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WorkspaceCard
              icon={Palette}
              title="Artwork studio"
              value={loading ? "--" : stats.artworks.toLocaleString()}
              description={
                isArtist
                  ? "Manage listings, refresh your portfolio, and keep new work moving into the marketplace."
                  : "Artist mode unlocks uploads, catalog management, and studio publishing tools."
              }
              actions={
                isArtist ? (
                  <>
                    <Button size="sm" asChild>
                      <Link to="/dashboard/upload">
                        <Plus className="h-4 w-4" />
                        Upload
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/dashboard/artworks">Manage</Link>
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={becomeArtist}>
                    Enable tools
                  </Button>
                )
              }
            />

            <WorkspaceCard
              icon={ShoppingBag}
              title="Orders"
              value={loading ? "--" : stats.orders.toLocaleString()}
              description="Review purchases, stay on top of fulfillment, and keep buyer communication clear."
              actions={
                <>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/orders">View orders</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard/tickets">My tickets</Link>
                  </Button>
                </>
              }
            />

            <WorkspaceCard
              icon={isArtist ? Wallet : Sparkles}
              title={isArtist ? "Sales & payouts" : "Growth tools"}
              value={isArtist ? "Live" : "Ready"}
              description={
                isArtist
                  ? "Track earnings, request payouts, and monitor the health of your studio income."
                  : "Activate artist tools to start earning through original work, classes, and commissions."
              }
              actions={
                isArtist ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/sales">Open sales</Link>
                  </Button>
                ) : (
                  <Button size="sm" onClick={becomeArtist}>
                    Start selling
                  </Button>
                )
              }
            />

            <WorkspaceCard
              icon={isAdmin ? Shield : Settings}
              title={isAdmin ? "Operations" : "Account"}
              value={isAdmin ? "Admin" : "Profile"}
              description={
                isAdmin
                  ? "Move into moderation, payouts, platform settings, and user access controls."
                  : "Keep your personal details and preferences up to date."
              }
              actions={
                <>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard/profile">Profile</Link>
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link to="/admin">Admin</Link>
                    </Button>
                  )}
                </>
              }
            />
          </div>

          {isArtist && (
            <Card>
              <CardHeader>
                <CardTitle>Commission inbox</CardTitle>
                <CardDescription>Keep custom-project opportunities moving while your public catalog keeps selling.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  Buyers can reach out with bespoke briefs, event requests, or made-to-order work. Respond quickly to
                  build trust and improve conversion.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/commissions">
                    <Inbox className="h-4 w-4" />
                    Open inbox
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  /*
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Your dashboard</h1>
        <p className="mt-1 text-muted-foreground">Manage your art, orders and profile.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" />Your artworks</CardTitle></CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold">{loading ? "—" : stats.artworks}</div>
              {isArtist && <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild><Link to="/dashboard/upload"><Plus className="h-4 w-4" />Upload</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/dashboard/artworks">Manage</Link></Button>
              </div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4 text-primary" />Your orders</CardTitle></CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-semibold">{loading ? "—" : stats.orders}</div>
              <Button size="sm" variant="outline" className="mt-3" asChild><Link to="/orders">View orders</Link></Button>
            </CardContent>
          </Card>
          {isArtist && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4 text-primary" />Sales & payouts</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Track earnings from every sale.</p>
                <Button size="sm" variant="outline" className="mt-3" asChild><Link to="/sales">Open</Link></Button>
              </CardContent>
            </Card>
          )}
          {isArtist && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-primary" />Commission inbox</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Briefs from buyers requesting custom work.</p>
                <Button size="sm" variant="outline" className="mt-3" asChild><Link to="/dashboard/commissions">Open inbox</Link></Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4 text-primary" />Account</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Roles: {roles.length ? roles.join(", ").toLowerCase() : "customer"}</p>
              <Button size="sm" variant="outline" className="mt-3" asChild><Link to="/dashboard/profile">Edit profile</Link></Button>
              {isAdmin && <Button size="sm" variant="outline" className="mt-3 ml-2" asChild><Link to="/admin">Admin panel</Link></Button>}
            </CardContent>
          </Card>
        </div>

        {!isArtist && (
          <Card className="mt-8 border-primary/40 bg-accent/40">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-display text-xl font-semibold"><Sparkles className="h-5 w-5 text-primary" />Become an artist</div>
                <p className="mt-1 text-sm text-muted-foreground">Sell artworks, take commissions and teach classes on ChrisEpic Arts.</p>
              </div>
              <Button onClick={becomeArtist}>Enable artist account</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
  */
}

function WorkspaceCard({
  icon: Icon,
  title,
  value,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="font-display text-3xl leading-none text-foreground">{value}</div>
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2">{description}</CardDescription>
        </div>
      </CardHeader>
      {actions && <CardContent className="flex flex-wrap gap-2 pt-0">{actions}</CardContent>}
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/45 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[14rem] text-right text-sm font-medium leading-6 text-foreground">{value}</span>
    </div>
  );
}

function formatRole(role: string) {
  return role.toLowerCase().replace(/_/g, " ");
}
