import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api-client";
import type { SellerStats } from "@/lib/types";
import { PageShell } from "@/components/page-shell";
import { formatZmw } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/stats")({
  head: () => ({ meta: [{ title: "Shop stats — ChrisEpic Arts" }] }),
  component: Stats,
});

function Stats() {
  const { data: s, isLoading } = useQuery({
    queryKey: ["seller-stats"],
    queryFn: () => api.get<SellerStats>("/api/me/stats"),
  });
  const monthly = (s?.monthly ?? []).map((m) => ({
    ...m,
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" }),
    gross: Number(m.grossZmw),
    earnings: Number(m.earningsZmw),
  }));

  return (
    <PageShell
      title="Shop stats"
      description="How your listings are performing over the last 12 months."
      width="max-w-6xl"
    >
      {isLoading || !s ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Sales" value={formatZmw(s.grossZmw)} hint={`${s.orders} orders`} />
            <Kpi label="Your earnings" value={formatZmw(s.earningsZmw)} hint="after fees" />
            <Kpi
              label="Items sold"
              value={s.itemsSold}
              hint={`avg order ${formatZmw(s.averageOrderZmw)}`}
            />
            <Kpi label="Active listings" value={s.activeListings} />
            <Kpi label="Artwork views" value={s.totalViews.toLocaleString()} />
            <Kpi label="Favourites" value={s.totalFavorites} />
            <Kpi label="Followers" value={s.followers} />
            <Kpi
              label="Rating"
              value={s.reviewCount ? `${s.averageRating.toFixed(1)} ★` : "—"}
              hint={`${s.reviewCount} reviews`}
            />
          </div>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl font-semibold">Monthly sales</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v: number) => `K${v.toLocaleString()}`}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      formatZmw(v),
                      name === "gross" ? "Sales" : "Earnings",
                    ]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="gross" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="earnings" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {s.topArtworks.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-xl font-semibold">Top artworks</h2>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Artwork</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Views</th>
                    <th className="py-2 text-right">Favourites</th>
                    <th className="py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.topArtworks.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2">
                        <Link
                          to="/artworks/$slug"
                          params={{ slug: a.slug }}
                          className="hover:text-primary"
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className="py-2 capitalize text-muted-foreground">{a.status}</td>
                      <td className="py-2 text-right">{a.views}</td>
                      <td className="py-2 text-right">{a.favorites}</td>
                      <td className="py-2 text-right">{formatZmw(a.priceZmw)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
