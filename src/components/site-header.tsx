import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth, logout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ShoppingBag, User as UserIcon, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CartItem } from "@/lib/types";
import logoAsset from "@/assets/logo.png";

const NAV_ITEMS = [
  { to: "/browse" as const, label: "Browse Art" },
  { to: "/artists" as const, label: "Artists" },
  { to: "/exhibitions" as const, label: "Exhibitions" },
  { to: "/commissions" as const, label: "Commissions" },
  { to: "/classes" as const, label: "Classes" },
  { to: "/supplies" as const, label: "Supplies" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart = [] } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<CartItem[]>("/api/cart"),
    enabled: !!user,
    staleTime: 30_000,
  });
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const { data: unread } = useQuery({
    queryKey: ["unread-messages"],
    queryFn: () => api.get<{ count: number }>("/api/me/messages/unread-count"),
    enabled: !!user,
    refetchInterval: 60_000,
  });
  const unreadCount = unread?.count ?? 0;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="border-b border-border/40 bg-black/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground sm:px-6 lg:px-8">
          <span>Curated across Zambia</span>
          <span className="hidden md:inline">Original art, commissions, classes and supplies</span>
          <Link to="/sell" className="text-primary hover:text-primary/80">
            Open a studio
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 rounded-[1.75rem] border border-border/70 bg-card/65 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link to="/" className="group flex items-center gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <img src={logoAsset} alt="ChrisEpic Arts" className="h-10 w-auto" />
              </div>
              <div className="hidden whitespace-nowrap sm:block lg:hidden xl:block">
                <div className="font-display text-xl leading-none">ChrisEpic Arts</div>
                <div className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Collector's marketplace
                </div>
              </div>
            </Link>

            <nav className="hidden min-w-0 items-center gap-1 rounded-full border border-border/60 bg-background/45 p-1.5 lg:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-foreground/76 transition-all hover:bg-secondary/80 hover:text-foreground 2xl:px-4"
                  activeProps={{
                    className:
                      "bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(0,0,0,0.18)]",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user && (
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link
                  to="/messages"
                  aria-label={unreadCount ? `Messages, ${unreadCount} unread` : "Messages"}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </Button>
            )}
            {user && (
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                <Link to="/favorites" aria-label="Favorites">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <Button variant="outline" size="icon" asChild className="relative">
              <Link to="/cart" aria-label={cartCount ? `Cart, ${cartCount} items` : "Cart"}>
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
            {user ? (
              <>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/dashboard">
                    <UserIcon className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="hidden 2xl:inline-flex">
                  <Link to="/dashboard/profile">Profile</Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-full border border-border/60 bg-card/55 px-4 py-2 text-sm text-foreground/80 shadow-[0_10px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm transition hover:border-primary/35 hover:text-primary"
              activeProps={{
                className: "border-primary/35 bg-primary text-primary-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
