import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Standard page frame: header, a titled content column and the footer. */
export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold">{title}</h1>
            {description && <p className="mt-2 text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
        <div className="mt-8">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

/** Dashed placeholder for empty lists. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto flex w-fit text-muted-foreground/60">{icon}</div>
      <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
