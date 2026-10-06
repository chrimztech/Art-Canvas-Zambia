import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Shared layout for long-form policy pages (terms, privacy). */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: { heading: string; body: ReactNode }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="page-container py-16">
        <h1 className="font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-6 text-foreground/85 leading-relaxed">{intro}</div>
        <div className="mt-8 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <nav
            aria-label="Contents"
            className="rounded-xl border border-border bg-card p-5 text-sm lg:sticky lg:top-36"
          >
            <ol className="list-decimal space-y-1 pl-5">
              {sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#s${i + 1}`} className="hover:text-primary">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div>
            {sections.map((s, i) => (
              <section key={s.heading} id={`s${i + 1}`} className="mb-10 scroll-mt-36">
                <h2 className="font-display text-2xl">
                  {i + 1}. {s.heading}
                </h2>
                <div className="mt-3 space-y-3 text-foreground/85 leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
