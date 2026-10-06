import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Certificate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils";
import { Printer } from "lucide-react";
import logoAsset from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/orders_/$orderId/certificate/$itemId")({
  head: () => ({ meta: [{ title: "Certificate of authenticity — ChrisEpic Arts" }] }),
  component: CertificatePage,
});

/** Printable certificate of authenticity for an original or edition the signed-in buyer owns. */
function CertificatePage() {
  const { orderId, itemId } = Route.useParams();
  const {
    data: c,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["certificate", orderId, itemId],
    queryFn: () => api.get<Certificate>(`/api/orders/${orderId}/items/${itemId}/certificate`),
    retry: false,
  });

  if (isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (error || !c)
    return (
      <div className="p-10">
        <p className="text-destructive">{errorMessage(error, "Certificate unavailable")}</p>
        <Link to="/orders/$orderId" params={{ orderId }} className="mt-4 inline-block text-primary">
          ← Back to order
        </Link>
      </div>
    );

  const rows: [string, string | null][] = [
    ["Title", c.title],
    ["Artist", c.artistName],
    ["Year", c.yearCreated ? String(c.yearCreated) : null],
    ["Medium", c.medium],
    ["Dimensions", c.dimensions],
    ["Edition", c.edition],
    [
      "Signature",
      c.signed ? `Signed${c.signatureLocation ? `, ${c.signatureLocation}` : ""}` : "Unsigned",
    ],
    ["Provenance", c.provenance],
    ["Owner", c.ownerName],
    ["Acquired", new Date(c.purchasedAt).toLocaleDateString(undefined, { dateStyle: "long" })],
    ["Order", c.orderNumber],
  ];

  return (
    <div className="min-h-screen bg-background py-10 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-3xl justify-between px-4 print:hidden">
        <Link
          to="/orders/$orderId"
          params={{ orderId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to order
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save as PDF
        </Button>
      </div>
      <article className="mx-auto max-w-3xl border-[6px] border-double border-primary/60 bg-[#fbf8f1] p-10 text-[#1f1b16] shadow-xl print:border-black print:shadow-none">
        <header className="text-center">
          <img src={logoAsset} alt="ChrisEpic Arts" className="mx-auto h-12 w-auto" />
          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-[#7a6a4f]">ChrisEpic Arts</p>
          <h1 className="mt-2 font-display text-4xl">Certificate of Authenticity</h1>
          <p className="mt-2 font-mono text-sm text-[#7a6a4f]">No. {c.certificateNumber}</p>
        </header>
        <div className="mt-8 grid gap-8 sm:grid-cols-[220px_1fr]">
          {c.imageUrl && (
            <img
              src={c.imageUrl}
              alt={c.title}
              className="w-full border border-[#d8cfbf] object-contain"
            />
          )}
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[#7a6a4f]">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
        <p className="mt-8 text-sm leading-relaxed">
          This certifies that the work described above is an authentic work by{" "}
          {c.artistName ?? "the artist"}, sold through ChrisEpic Arts to the owner named. The
          certificate number can be quoted to ChrisEpic Arts to confirm the record.
        </p>
        <footer className="mt-10 flex justify-between text-xs text-[#7a6a4f]">
          <span>Issued {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</span>
          <span>chrisepicarts · Lusaka, Zambia</span>
        </footer>
      </article>
    </div>
  );
}
