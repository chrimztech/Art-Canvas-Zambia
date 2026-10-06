import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Construction } from "lucide-react";

type Props = { title: string; desc: string };

export function ComingSoon({ title, desc }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Construction className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-6 font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-3 text-muted-foreground">{desc}</p>
        <Link
          to="/browse"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Browse art
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}
