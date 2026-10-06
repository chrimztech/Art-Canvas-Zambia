import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AvailableBalance, PayoutRequest, RefundRequest, Sale } from "@/lib/types";
import { MessageButton } from "@/components/message-button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Coins, PackageCheck, Truck, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";
import { usePayoutBanks } from "@/hooks/use-site-settings";

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
  const banks = usePayoutBanks();

  async function load() {
    const [sales, bal, myPayouts] = await Promise.all([
      api.get<Sale[]>("/api/me/sales"),
      api.get<AvailableBalance>("/api/me/payouts/balance"),
      api.get<PayoutRequest[]>("/api/me/payouts"),
    ]);
    setRows(sales);
    setBalance(bal);
    setPayouts(myPayouts);
    try {
      const profile = await api.get<{
        payoutMethod: string | null;
        payoutPhone: string | null;
        payoutBankName: string | null;
        payoutReceiverId: string | null;
      }>("/api/me/profile");
      if (profile.payoutMethod === "bank" || profile.payoutMethod === "momo")
        setMethod(profile.payoutMethod);
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
  useEffect(() => {
    load();
  }, []);

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
    } catch (e) {
      toast.error(errorMessage(e, "Could not request payout"));
    } finally {
      setSubmitting(false);
    }
  }

  // Refunded items no longer count towards earnings.
  const paid = rows.filter(
    (r) => (r.orderStatus === "paid" || r.orderStatus === "fulfilled") && !r.refunded,
  );
  const toShip = paid.filter(
    (r) =>
      (r.itemType === "ARTWORK" || r.itemType === "SUPPLY") && r.fulfillmentStatus !== "delivered",
  );

  async function markShipped(sale: Sale) {
    const carrier =
      window.prompt("Courier / delivery method (optional)", sale.carrier ?? "") ?? undefined;
    if (carrier === undefined) return;
    const trackingNumber =
      window.prompt("Tracking number (optional)", sale.trackingNumber ?? "") ?? undefined;
    try {
      await api.post(`/api/me/sales/${sale.id}/ship`, { carrier, trackingNumber });
      toast.success("Marked as shipped — the buyer can now track it");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not update shipment"));
    }
  }
  const totalSales = paid.reduce((s, r) => s + Number(r.lineTotalZmw ?? 0), 0);
  const totalPayout = paid.reduce((s, r) => s + Number(r.artistPayoutZmw ?? 0), 0);
  const itemsSold = paid.reduce((s, r) => s + Number(r.quantity ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <h1 className="font-display text-3xl font-semibold">Sales & payouts</h1>
        <p className="mt-1 text-muted-foreground">
          Your earnings, broken down per sale. Request a payout to your mobile money or bank
          account.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            label="Items sold"
            value={loading ? "—" : String(itemsSold)}
          />
          <Stat
            icon={<Coins className="h-4 w-4 text-primary" />}
            label="Gross sales"
            value={loading ? "—" : `K${totalSales.toLocaleString()}`}
          />
          <Stat
            icon={<Wallet className="h-4 w-4 text-primary" />}
            label="Your earnings"
            value={loading ? "—" : `K${totalPayout.toLocaleString()}`}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Request a payout</CardTitle>
              <CardDescription>
                Available balance:{" "}
                {balance ? `K${Number(balance.availableBalance).toLocaleString()}` : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={requestPayout} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("momo")}
                    className={`rounded-md border p-2.5 text-sm transition-colors ${method === "momo" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("bank")}
                    className={`rounded-md border p-2.5 text-sm transition-colors ${method === "bank" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
                  >
                    Bank transfer
                  </button>
                </div>
                <div>
                  <Label htmlFor="amountZmw">Amount (ZMW)</Label>
                  <Input
                    id="amountZmw"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={form.amountZmw}
                    onChange={(e) => setForm({ ...form, amountZmw: e.target.value })}
                  />
                </div>
                {method === "momo" ? (
                  <div>
                    <Label htmlFor="payoutPhone">Mobile money number</Label>
                    <Input
                      id="payoutPhone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0971234567"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bankName">Bank</Label>
                      <Input
                        id="bankName"
                        list="payout-banks"
                        required
                        value={form.bankName}
                        onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                        placeholder="e.g. zanaco"
                      />
                    </div>
                    <div>
                      <Label htmlFor="receiverId">Account number</Label>
                      <Input
                        id="receiverId"
                        required
                        value={form.receiverId}
                        onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <datalist id="payout-banks">
                  {banks.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Request payout"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your payout requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {payouts.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No payout requests yet.
                  </p>
                )}
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-medium">K{Number(p.amountZmw).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.method === "momo" ? p.phone : `${p.bankName} · ${p.receiverId}`}
                      </p>
                      {p.adminNote && (
                        <p className="mt-1 text-xs text-destructive">{p.adminNote}</p>
                      )}
                    </div>
                    <Badge
                      variant={PAYOUT_STATUS_VARIANT[p.status] ?? "secondary"}
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {toShip.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-xl font-semibold">To ship ({toShip.length})</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paid orders waiting on you. Buyer details are shared only after payment.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {toShip.map((r) => {
                const ship = r.shippingAddress;
                return (
                  <Card key={r.id}>
                    <CardContent className="space-y-2 p-5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {r.title} <span className="text-muted-foreground">×{r.quantity}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.orderNumber} · {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={r.fulfillmentStatus === "shipped" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {r.fulfillmentStatus === "shipped" ? "Shipped" : "To ship"}
                        </Badge>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="font-medium">{ship?.name || r.buyerDisplayName || "Buyer"}</p>
                        <p className="text-muted-foreground">
                          {ship?.method === "pickup"
                            ? "Will collect from you"
                            : [ship?.address, ship?.city].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-muted-foreground">
                          {[ship?.phone, r.buyerEmail].filter(Boolean).join(" · ")}
                        </p>
                        {ship?.notes && (
                          <p className="text-muted-foreground">Notes: {ship.notes}</p>
                        )}
                      </div>
                      {r.buyerId && (
                        <MessageButton
                          recipientId={r.buyerId}
                          recipientName={r.buyerDisplayName}
                          contextType="ORDER"
                          contextId={r.orderId}
                          label="Message buyer"
                          size="sm"
                          variant="ghost"
                          placeholder="Confirm delivery details, arrange collection…"
                        />
                      )}
                      {r.fulfillmentStatus === "shipped" ? (
                        <p className="flex items-center gap-1 text-primary">
                          <Truck className="h-4 w-4" />
                          {r.carrier ?? "Shipped"}
                          {r.trackingNumber ? ` · ${r.trackingNumber}` : ""} — waiting for the buyer
                          to confirm receipt
                        </p>
                      ) : (
                        <Button size="sm" onClick={() => markShipped(r)}>
                          <PackageCheck className="h-4 w-4" />
                          {ship?.method === "pickup" ? "Mark handed over" : "Mark shipped"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <SellerRefunds />

        <h2 className="mt-10 font-display text-xl font-semibold">Sales history</h2>
        {!loading && rows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No sales yet. Once a buyer purchases your work, it shows up here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Item</th>
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
                    <td className="px-4 py-3 font-medium">
                      {r.title}
                      <span className="ml-2 text-xs text-muted-foreground">×{r.quantity}</span>
                      <span className="block text-xs font-normal capitalize text-muted-foreground">
                        {r.itemType?.toLowerCase()}
                        {r.refunded && (
                          <Badge variant="outline" className="ml-2">
                            Refunded
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.orderNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          r.orderStatus === "paid" || r.orderStatus === "fulfilled"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {r.orderStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{formatZmw(r.lineTotalZmw)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      −{formatZmw(Number(r.platformFeeZmw) + Number(r.royaltyZmw))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatZmw(r.artistPayoutZmw)}
                    </td>
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
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

/** Refund requests on this seller's sales; the seller can add their side before an admin decides. */
function SellerRefunds() {
  const [rows, setRows] = useState<RefundRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const load = () =>
    api
      .get<RefundRequest[]>("/api/me/sales/refunds")
      .then(setRows)
      .catch(() => {});
  useEffect(() => {
    void load();
  }, []);
  if (rows.length === 0) return null;

  async function respond(r: RefundRequest) {
    try {
      await api.post(`/api/refunds/${r.id}/respond`, { response: drafts[r.id] ?? "" });
      toast.success("Response sent to the admin team");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not send response"));
    }
  }

  return (
    <>
      <h2 className="mt-10 font-display text-xl font-semibold">Refund requests</h2>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.itemTitle} · {formatZmw(r.amountZmw)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.orderNumber} · {r.buyerDisplayName ?? "Buyer"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={
                    r.status === "requested"
                      ? "secondary"
                      : r.status === "refunded"
                        ? "destructive"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {r.status === "requested" ? "Awaiting decision" : r.status}
                </Badge>
              </div>
              <p>
                <span className="text-muted-foreground">Buyer's reason:</span> {r.reason}
              </p>
              {r.adminNote && (
                <p>
                  <span className="text-muted-foreground">Admin note:</span> {r.adminNote}
                </p>
              )}
              {r.status === "requested" ? (
                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    maxLength={2000}
                    value={drafts[r.id] ?? r.sellerResponse ?? ""}
                    onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                    placeholder="Your side: e.g. happy to refund, or details about delivery/condition"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond(r)}
                    disabled={!(drafts[r.id] ?? "").trim()}
                  >
                    {r.sellerResponse ? "Update response" : "Send response"}
                  </Button>
                </div>
              ) : (
                r.sellerResponse && (
                  <p>
                    <span className="text-muted-foreground">Your response:</span> {r.sellerResponse}
                  </p>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
