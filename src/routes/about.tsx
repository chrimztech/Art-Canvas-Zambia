import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowRight,
  Palette,
  Handshake,
  GraduationCap,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "ChrisEpic Arts is Zambia's marketplace for original art, commissions, classes, exhibitions and supplies.",
      },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: Palette,
    title: "Artist-first",
    desc: "Transparent, configurable payouts and low platform fees so artists keep more of every sale.",
  },
  {
    icon: Handshake,
    title: "Direct commissions",
    desc: "Buyers and artists work together directly — no middleman diluting the brief or the relationship.",
  },
  {
    icon: GraduationCap,
    title: "Skills, not just sales",
    desc: "Working artists teach classes and workshops, turning craft into a second income stream.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & safety",
    desc: "Verified artist badges, moderated listings, and admin oversight keep the marketplace credible.",
  },
];

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          About us
        </div>
        <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
          Zambia's home for original art, <em className="text-primary">made and sold direct.</em>
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
          ChrisEpic Arts connects Zambian artists, instructors and suppliers directly with
          collectors, students and buyers — one platform for paintings, sculpture, commissions,
          classes, exhibitions and art supplies.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{v.title}</CardTitle>
                </div>
                <CardDescription className="pt-2">{v.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6 lg:px-8">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Based in Lusaka, Zambia
              </div>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl">
                Building it in the open, for Zambian creatives.
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Have a question, a partnership idea, or feedback on the platform? We'd like to hear
                from you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/contact">
                  Contact us <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/sell">Sell on ChrisEpic Arts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
