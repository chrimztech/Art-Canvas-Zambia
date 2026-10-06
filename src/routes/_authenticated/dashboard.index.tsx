import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Gift,
  HandCoins,
  Tag,
  Users,
  Brush,
  CalendarDays,
  MessageCircle,
  GraduationCap,
  Heart,
  Inbox,
  LayoutList,
  Package,
  Palette,
  Plus,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — ChrisEpic Arts" }] }),
  component: Dashboard,
});

type Me = { id: string; displayName: string | null; roles: string[] };

const CREATOR_ROLES: { role: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    role: "ARTIST",
    title: "Sell artwork",
    description: "List originals and prints, take commissions and host exhibitions.",
    icon: Palette,
  },
  {
    role: "INSTRUCTOR",
    title: "Teach classes",
    description: "Run online or in-person workshops and get paid per seat.",
    icon: GraduationCap,
  },
  {
    role: "SUPPLIER",
    title: "Sell supplies",
    description: "List paint, canvas, tools and equipment with stock tracking.",
    icon: Package,
  },
];

function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [counts, setCounts] = useState<{ orders: number; artworks: number } | null>(null);

  async function load() {
    try {
      const user = await api.get<Me>("/api/me");
      setMe(user);
      const [orders, artworks] = await Promise.all([
        api.get<unknown[]>("/api/me/orders"),
        user.roles.includes("ARTIST")
          ? api.get<unknown[]>("/api/me/artworks")
          : Promise.resolve([]),
      ]);
      setCounts({ orders: orders.length, artworks: artworks.length });
    } catch (error) {
      toast.error(errorMessage(error, "Could not load your dashboard"));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function enable(role: string) {
    try {
      const updated = await api.post<Me>(`/api/me/roles/${role.toLowerCase()}`);
      setMe(updated);
      window.dispatchEvent(new Event("auth-changed"));
      toast.success("New tools unlocked — you can start right away.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not enable that role"));
    }
  }

  if (!me)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );

  const isAdmin = me.roles.includes("ADMIN") || me.roles.includes("SUPER_ADMIN");
  // Admins can use every creator tool (the API allows it), so they never need to "enable" a role.
  const has = (r: string) => me.roles.includes(r) || isAdmin;
  const isSeller = has("ARTIST") || has("INSTRUCTOR") || has("SUPPLIER");
  const missingRoles = CREATOR_ROLES.filter((r) => !has(r.role));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container space-y-10 py-10">
        <Card className="overflow-hidden">
          <CardContent className="relative p-8 sm:p-10">
            <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(215,182,95,0.28),transparent_72%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Studio workspace
                </div>
                <h1 className="mt-5 font-display text-4xl leading-none sm:text-5xl">
                  Welcome{me.displayName ? `, ${me.displayName}` : ""}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  {me.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={role.includes("ADMIN") ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {role.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Stat label="Orders" value={counts?.orders} />
                {has("ARTIST") && <Stat label="Artworks" value={counts?.artworks} />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Section title="Buying & learning">
          <Tool
            icon={ShoppingBag}
            title="Orders"
            description="Track payments, deliveries and confirm what you've received."
            to="/orders"
          />
          <Tool
            icon={MessageCircle}
            title="Messages"
            description="Private conversations with artists, sellers and buyers."
            to="/messages"
          />
          <Tool
            icon={Heart}
            title="Favorites"
            description="Artworks you've saved for later."
            to="/favorites"
          />
          <Tool
            icon={Users}
            title="Following"
            description="New work from artists you follow, search alerts and waitlists."
            to="/following"
          />
          <Tool
            icon={HandCoins}
            title="Offers"
            description="Offers you've made on artworks — accept counters and pay."
            to="/dashboard/offers"
          />
          <Tool
            icon={Gift}
            title="Gift cards"
            description="Buy a gift card or check the balance on yours."
            to="/gift-cards"
          />
          <Tool
            icon={Brush}
            title="My commissions"
            description="Review quotes, pay and follow custom work."
            to="/dashboard/my-commissions"
          />
          <Tool
            icon={GraduationCap}
            title="My classes"
            description="Upcoming classes you're enrolled in, with joining details."
            to="/dashboard/learning"
          />
          <Tool
            icon={Ticket}
            title="My tickets"
            description="Exhibition tickets with entry QR codes."
            to="/dashboard/tickets"
          />
        </Section>

        {isSeller && (
          <Section title="Selling">
            {has("ARTIST") && (
              <>
                <Tool
                  icon={Palette}
                  title="My artworks"
                  description="Edit, publish or archive your listings."
                  to="/dashboard/artworks"
                  action={
                    <Button size="sm" asChild>
                      <Link to="/dashboard/upload">
                        <Plus className="h-4 w-4" />
                        Upload
                      </Link>
                    </Button>
                  }
                />
                <Tool
                  icon={Inbox}
                  title="Commission inbox"
                  description="Quote on briefs and manage custom work."
                  to="/dashboard/commissions"
                />
              </>
            )}
            {(has("ARTIST") || has("INSTRUCTOR") || has("SUPPLIER")) && (
              <Tool
                icon={LayoutList}
                title="Classes, shows & supplies"
                description="Manage listings, rosters, guest lists and stock."
                to="/dashboard/listings"
              />
            )}
            {has("INSTRUCTOR") && (
              <Tool
                icon={GraduationCap}
                title="New class"
                description="Publish an online or in-person class."
                to="/dashboard/new-class"
              />
            )}
            {(has("ARTIST") || has("INSTRUCTOR")) && (
              <Tool
                icon={CalendarDays}
                title="Host an exhibition"
                description="List a show and sell or give away tickets."
                to="/dashboard/new-exhibition"
              />
            )}
            {has("SUPPLIER") && (
              <Tool
                icon={Package}
                title="New supply listing"
                description="Sell materials and equipment with stock."
                to="/dashboard/new-supply"
              />
            )}
            <Tool
              icon={Wallet}
              title="Sales & payouts"
              description="Ship orders, see earnings and withdraw to mobile money or bank."
              to="/sales"
            />
            <Tool
              icon={BarChart3}
              title="Shop stats"
              description="Sales over time, views, favourites, followers and top listings."
              to="/dashboard/stats"
            />
            <Tool
              icon={Tag}
              title="Discount codes"
              description="Create coupon codes for your listings."
              to="/dashboard/coupons"
            />
            {has("ARTIST") && (
              <Tool
                icon={HandCoins}
                title="Offers received"
                description="Accept, decline or counter offers on your artworks."
                to="/dashboard/offers"
              />
            )}
          </Section>
        )}

        {missingRoles.length > 0 && (
          <Section title={isSeller ? "Add more tools" : "Start selling on ChrisEpic Arts"}>
            {missingRoles.map((r) => (
              <Card key={r.role} className="border-dashed">
                <CardHeader>
                  <r.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="pt-2">{r.title}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" onClick={() => enable(r.role)}>
                    Enable
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Section>
        )}

        <Section title="Account">
          <Tool
            icon={Settings}
            title="Profile & security"
            description="Public profile, payout account, password and devices."
            to="/dashboard/profile"
          />
          {isAdmin && (
            <Tool
              icon={Shield}
              title="Admin panel"
              description="Moderation, payouts, platform settings and access control."
              to="/admin"
            />
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="min-w-28 rounded-2xl border border-border/60 bg-background/45 px-4 py-3">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value ?? "--"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Tool({
  icon: Icon,
  title,
  description,
  to,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col transition hover:border-primary/40">
      <CardHeader className="flex-1">
        <div className="w-fit rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="pt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Button size="sm" variant="outline" asChild>
          <Link to={to}>Open</Link>
        </Button>
        {action}
      </CardContent>
    </Card>
  );
}
