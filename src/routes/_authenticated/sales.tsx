import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AvailableBalance, PayoutRequest, Sale } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales & Payouts — ChrisEpic Arts" }] }),
  component: Sales,
});

const PAYOUT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  processing: "secondary",
  approved: "secondary",
  requested: "outline",
  rejected: "destructive",
  failed: "destructive",
};

function Sales() {
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<AvailableBalance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [method, setMethod] = useState<"momo" | "bank">("momo");
  const [form, setForm] = useState({ amountZmw: "", phone: "", bankName: "", receiverId: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [sales, bal, myPayouts, me] = await Promise.all([
      api.get<Sale[]>("/api/me/sales"),
      api.get<AvailableBalance>("/api/me/payouts/balance"),
      api.get<PayoutRequest[]>("/api/me/payouts"),
      api.get<{ id: string }>("/api/me"),
    ]);
    setRows(sales);
    setBalance(bal);
    setPayouts(myPayouts);
    try {
      const profile = await api.get<{
        payoutMethod: string | null; payoutPhone: string | null;
        payoutBankName: string | null; payoutReceiverId: string | null;
      }>(`/api/profiles/${me.id}`);
      if (profile.payoutMethod === "bank" || profile.payoutMethod === "momo") setMethod(profile.payoutMethod);
      setForm((f) => ({
        ...f,
        phone: f.phone || profile.payoutPhone || "",
        bankName: f.bankName || profile.payoutBankName || "",
        receiverId: f.receiverId || profile.payoutReceiverId || "",
      }));
    } catch {
      // no stored payout account yet - leave the form blank
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/me/payouts", {
        amountZmw: Number(form.amountZmw),
        method,
        phone: method === "momo" ? form.phone : undefined,
        bankName: method === "bank" ? form.bankName : undefined,
        receiverId: method === "bank" ? form.receiverId : undefined,
      });
      toast.success("Payout requested");
      setForm({ amountZmw: "", phone: "", bankName: "", receiverId: "" });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not request payout");
    } finally {
      setSubmitting(false);
    }
  }

  const paid = rows.filter((r) => r.orderStatus === "paid" || r.orderStatus === "fulfilled");
  const totalSales = paid.reduce((s, r) => s + Number(r.lineTotalZmw ?? 0), 0);
  const totalPayout = paid.reduce((s, r) => s + Number(r.artistPayoutZmw ?? 0), 0);
  const itemsSold = paid.reduce((s, r) => s + Number(r.quantity ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Sales & payouts</h1>
        <p className="mt-1 text-muted-foreground">Your earnings, broken down per sale. Request a payout to your mobile money or bank account.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Items sold" value={loading ? "—" : String(itemsSold)} />
          <Stat icon={<Coins className="h-4 w-4 text-primary" />} label="Gross sales" value={loading ? "—" : `K${totalSales.toLocaleString()}`} />
          <Stat icon={<Wallet className="h-4 w-4 text-primary" />} label="Your earnings" value={loading ? "—" : `K${totalPayout.toLocaleString()}`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Request a payout</CardTitle>
              <CardDescription>Available balance: {balance ? `K${Number(balance.availableBalance).toLocaleString()}` : "—"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={requestPayout} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMethod("momo")}
                    className={`rounded-md border p-2.5 text-sm transition-colors ${method === "momo" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}>
                    Mobile Money
                  </button>
                  <button type="button" onClick={() => setMethod("bank")}
                    className={`rounded-md border p-2.5 text-sm transition-colors ${method === "bank" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}>
                    Bank transfer
                  </button>
                </div>
                <div>
                  <Label htmlFor="amountZmw">Amount (ZMW)</Label>
                  <Input id="amountZmw" type="number" min={1} step="0.01" required value={form.amountZmw}
                    onChange={(e) => setForm({ ...form, amountZmw: e.target.value })} />
                </div>
                {method === "momo" ? (
                  <div>
                    <Label htmlFor="payoutPhone">Mobile money number</Label>
                    <Input id="payoutPhone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0971234567" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bankName">Bank</Label>
                      <Input id="bankName" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. zanaco" />
                    </div>
                    <div>
                      <Label htmlFor="receiverId">Account number</Label>
                      <Input id="receiverId" required value={form.receiverId} onChange={(e) => setForm({ ...form, receiverId: e.target.value })} />
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Request payout"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Your payout requests</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {payouts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No payout requests yet.</p>}
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-medium">K{Number(p.amountZmw).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.method === "momo" ? p.phone : `${p.bankName} · ${p.receiverId}`}</p>
                      {p.adminNote && <p className="mt-1 text-xs text-destructive">{p.adminNote}</p>}
                    </div>
                    <Badge variant={PAYOUT_STATUS_VARIANT[p.status] ?? "secondary"} className="capitalize">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Sales history</h2>
        {!loading && rows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No sales yet. Once a buyer purchases your work, it shows up here.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Artwork</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Sale</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">You earn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.title}<span className="ml-2 text-xs text-muted-foreground">×{r.quantity}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.orderNumber ?? "—"}</td>
                    <td className="px-4 py-3"><Badge variant={r.orderStatus === "paid" || r.orderStatus === "fulfilled" ? "default" : "secondary"} className="capitalize">{r.orderStatus ?? "—"}</Badge></td>
                    <td className="px-4 py-3 text-right">K{Number(r.lineTotalZmw).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">−K{(Number(r.platformFeeZmw) + Number(r.royaltyZmw)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">K{Number(r.artistPayoutZmw).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
