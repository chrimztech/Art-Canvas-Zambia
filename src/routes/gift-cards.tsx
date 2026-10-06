import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutResponse, GiftCard } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/page-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { continuePayment } from "@/lib/payments";
import { cn, errorMessage, formatZmw } from "@/lib/utils";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({
    meta: [
      { title: "Gift cards — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "Give the gift of Zambian art. Gift cards work on artworks, supplies, classes and exhibition tickets.",
      },
    ],
  }),
  component: GiftCards,
});

const AMOUNTS = [200, 500, 1000, 2500, 5000];

function GiftCards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState("");
  const [recipient, setRecipient] = useState({ name: "", email: "", message: "" });
  const [paying, setPaying] = useState(false);
  const [checkCode, setCheckCode] = useState("");
  const [balance, setBalance] = useState<{ code: string; balanceZmw: number } | null>(null);
  const { data: mine = [] } = useQuery({
    queryKey: ["gift-cards"],
    queryFn: () => api.get<GiftCard[]>("/api/me/gift-cards"),
    enabled: !!user,
  });
  const value = custom ? Number(custom) : amount;
  const validAmount = value >= 50 && value <= 20000;

  async function buy(payment: CheckoutRequest) {
    if (!validAmount) {
      toast.error("Choose an amount between K50 and K20,000");
      return;
    }
    setPaying(true);
    try {
      const res = await api.post<CheckoutResponse>("/api/gift-cards/checkout", {
        amountZmw: value,
        recipientName: recipient.name || undefined,
        recipientEmail: recipient.email || undefined,
        message: recipient.message || undefined,
        payment,
      });
      const message = await continuePayment(res);
      if (message === null) return;
      toast.success(message);
      navigate({ to: "/orders/$orderId", params: { orderId: res.orderId } });
    } catch (e) {
      toast.error(errorMessage(e, "Could not buy the gift card"));
    } finally {
      setPaying(false);
    }
  }

  async function check(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBalance(
        await api.get<{ code: string; balanceZmw: number }>(
          `/api/gift-cards/${encodeURIComponent(checkCode.trim().toUpperCase())}/balance`,
        ),
      );
    } catch (err) {
      setBalance(null);
      toast.error(errorMessage(err, "Gift card not found"));
    }
  }

  return (
    <PageShell
      title="Gift cards"
      description="Give the gift of Zambian art — spend it on originals, prints, supplies, classes and exhibition tickets."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 via-card to-card p-8">
            <Gift className="h-8 w-8 text-primary" />
            <p className="mt-6 font-display text-5xl font-semibold">
              {validAmount ? formatZmw(value) : "K—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              ChrisEpic Arts gift card · never expires · emailed instantly once paid
            </p>
          </div>

          {!user ? (
            <p className="rounded-xl border border-border bg-card p-5 text-sm">
              <Link
                to="/auth"
                search={{ redirect: "/gift-cards" }}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>{" "}
              to buy a gift card.
            </p>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-medium">Amount</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAmount(a);
                        setCustom("");
                      }}
                      aria-pressed={!custom && amount === a}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm",
                        !custom && amount === a
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary",
                      )}
                    >
                      {formatZmw(a)}
                    </button>
                  ))}
                  <Input
                    type="number"
                    min={50}
                    max={20000}
                    placeholder="Other amount"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-36"
                    aria-label="Custom amount"
                  />
                </div>
              </fieldset>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-medium">
                  Who's it for?{" "}
                  <span className="text-muted-foreground">(leave blank for yourself)</span>
                </legend>
                <div>
                  <Label htmlFor="gc-name">Recipient name</Label>
                  <Input
                    id="gc-name"
                    value={recipient.name}
                    onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gc-email">Recipient email</Label>
                  <Input
                    id="gc-email"
                    type="email"
                    value={recipient.email}
                    onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="gc-message">Personal message</Label>
                  <Textarea
                    id="gc-message"
                    maxLength={500}
                    rows={3}
                    value={recipient.message}
                    onChange={(e) => setRecipient({ ...recipient, message: e.target.value })}
                  />
                </div>
              </fieldset>
              <CheckoutForm
                busy={paying}
                onSubmit={buy}
                submitLabel={validAmount ? `Pay ${formatZmw(value)}` : "Choose an amount"}
              />
            </>
          )}
        </div>

        <aside className="space-y-6">
          {user && (
            <form onSubmit={check} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Check a balance</h2>
              <div className="mt-3 flex gap-2">
                <Input
                  value={checkCode}
                  onChange={(e) => setCheckCode(e.target.value)}
                  placeholder="GIFT-XXXX-XXXX"
                  className="font-mono uppercase"
                  aria-label="Gift card code"
                />
                <Button type="submit" variant="outline" disabled={!checkCode.trim()}>
                  Check
                </Button>
              </div>
              {balance && (
                <p className="mt-3 text-sm">
                  <span className="font-mono">{balance.code}</span> has{" "}
                  <strong>{formatZmw(balance.balanceZmw)}</strong> left.
                </p>
              )}
            </form>
          )}
          {mine.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Your gift cards</h2>
              <ul className="mt-3 space-y-3">
                {mine.map((g) => (
                  <li key={g.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{g.code ?? "Awaiting payment"}</span>
                      <Badge variant={g.status === "active" ? "default" : "secondary"}>
                        {g.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {formatZmw(g.balanceZmw)} of {formatZmw(g.initialAmountZmw)} left
                      {g.recipientName ? ` · for ${g.recipientName}` : ""}
                    </p>
                    {g.code && (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => {
                          void navigator.clipboard.writeText(g.code!);
                          toast.success("Code copied");
                        }}
                      >
                        <Copy className="h-3 w-3" /> Copy code
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <h2 className="font-display text-lg font-semibold text-foreground">How it works</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Pay by mobile money or card.</li>
              <li>The code is emailed to the recipient (or you) once payment clears.</li>
              <li>
                Enter the code in the “Gift card” box at checkout. Unused balance stays on the card.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
