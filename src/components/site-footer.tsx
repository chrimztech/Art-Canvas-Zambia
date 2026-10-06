import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/newsletter-form";

const FOOTER_LINKS = {
  discover: [
    { to: "/browse" as const, label: "Browse art" },
    { to: "/artists" as const, label: "Artists" },
    { to: "/exhibitions" as const, label: "Exhibitions" },
    { to: "/collections" as const, label: "Curated collections" },
    { to: "/gift-cards" as const, label: "Gift cards" },
  ],
  create: [
    { to: "/sell" as const, label: "Sell on ChrisEpic Arts" },
    { to: "/commissions" as const, label: "Take commissions" },
    { to: "/classes" as const, label: "Teach a class" },
  ],
  support: [
    { to: "/about" as const, label: "About" },
    { to: "/contact" as const, label: "Contact" },
    { to: "/contact" as const, label: "Art advisory", search: { topic: "advisory" } },
    { to: "/help" as const, label: "Help center" },
    { to: "/terms" as const, label: "Terms" },
    { to: "/privacy" as const, label: "Privacy" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="mt-24">
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/55 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="grid gap-10 border-b border-border/60 px-6 py-10 sm:px-8 lg:grid-cols-[1.45fr_0.85fr_0.85fr_0.85fr] lg:px-10">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Premium art commerce
              </div>
              <h2 className="mt-5 font-display text-3xl leading-tight text-foreground sm:text-[2.5rem]">
                A sharper digital home for Zambian artists, collectors, and creative businesses.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                ChrisEpic Arts brings original work, exhibitions, commissions, classes, and supplies
                into one polished marketplace built to feel credible, modern, and artist-first.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/browse">
                    Explore the collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/sell">Open your studio</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/50 px-3 py-2">
                  Curated listings
                </span>
                <span className="rounded-full border border-border/70 bg-background/50 px-3 py-2">
                  Secure admin controls
                </span>
                <span className="rounded-full border border-border/70 bg-background/50 px-3 py-2">
                  Artist-first payouts
                </span>
              </div>
              <div className="mt-8">
                <p className="text-sm font-medium text-foreground">
                  New work and events, once a fortnight
                </p>
                <div className="mt-2">
                  <NewsletterForm />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                Discover
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {FOOTER_LINKS.discover.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                Create & earn
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {FOOTER_LINKS.create.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/80">
                Support
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {FOOTER_LINKS.support.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      search={"search" in link ? link.search : undefined}
                      className="transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5 text-sm text-muted-foreground sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Lusaka, Zambia
              </div>
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Professional tools for galleries, artists, and buyers
              </div>
            </div>
            <p>Copyright {new Date().getFullYear()} ChrisEpic Arts. Made in Zambia.</p>
          </div>
        </div>
      </div>
    </footer>
  );

  /*
  return (
    <footer className="mt-24">
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/55 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="grid gap-10 border-b border-border/60 px-6 py-10 sm:px-8 lg:grid-cols-[1.45fr_0.85fr_0.85fr_0.85fr] lg:px-10">
          <div>
            <div className="font-display text-xl font-semibold">ChrisEpic Arts</div>
            <p className="mt-2 text-sm text-muted-foreground">Zambia's marketplace for original art, commissions, classes and supplies.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Discover</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse">Browse art</Link></li>
              <li><Link to="/artists">Artists</Link></li>
              <li><Link to="/exhibitions">Exhibitions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Create & Earn</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sell">Sell on ChrisEpic Arts</Link></li>
              <li><Link to="/commissions">Take commissions</Link></li>
              <li><Link to="/classes">Teach a class</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help">Help center</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} ChrisEpic Arts Art Marketplace. Made in Zambia.</p>
      </div>
    </footer>
  );
  */
}
