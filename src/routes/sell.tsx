import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Sell on ChrisEpic Arts" }] }),
  component: Sell,
});

function Sell() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-16">
        <h1 className="font-display text-5xl font-semibold">Sell your art on ChrisEpic Arts</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Reach collectors across Zambia. Get paid in Kwacha. Keep most of every sale.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", t: "Create an account", d: "Sign up and enable your artist profile." },
            { n: "2", t: "Upload your work", d: "Add photos, prices and details in minutes." },
            { n: "3", t: "Get paid", d: "Receive payouts to your mobile money or bank." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="font-display text-3xl text-primary">{s.n}</div>
              <h3 className="mt-2 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <Button size="lg" className="mt-10" asChild>
          <Link to="/auth">Get started</Link>
        </Button>
      </div>
      <SiteFooter />
    </div>
  );
}
