import type { CheckoutQuote } from "@/lib/types";
import { formatZmw } from "@/lib/utils";

/** Itemised totals for a checkout quote, plus any reason a code wasn't applied. */
export function PriceSummary({ quote, loading }: { quote?: CheckoutQuote; loading?: boolean }) {
  if (!quote) {
    return loading ? (
      <p className="mb-4 text-sm text-muted-foreground">Calculating total…</p>
    ) : null;
  }
  const rows: [string, number, string?][] = [["Subtotal", Number(quote.subtotalZmw)]];
  if (Number(quote.discountZmw) > 0)
    rows.push([`Discount (${quote.couponCode})`, -Number(quote.discountZmw)]);
  rows.push([
    "Delivery",
    Number(quote.shippingZmw),
    Number(quote.shippingZmw) === 0 ? "Free / arranged with seller" : undefined,
  ]);
  if (Number(quote.giftCardZmw) > 0) rows.push(["Gift card", -Number(quote.giftCardZmw)]);

  return (
    <div className="mb-4 rounded-lg border border-border bg-background/50 p-4 text-sm">
      <dl className="space-y-1.5">
        {rows.map(([label, value, note]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={value < 0 ? "text-primary" : undefined}>
              {note ?? (value < 0 ? `−${formatZmw(-value)}` : formatZmw(value))}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
          <dt>Total to pay</dt>
          <dd className="font-display text-lg">{formatZmw(quote.totalZmw)}</dd>
        </div>
      </dl>
      {quote.couponMessage && (
        <p className="mt-2 text-xs text-destructive">{quote.couponMessage}</p>
      )}
      {quote.giftCardMessage && (
        <p className="mt-2 text-xs text-destructive">{quote.giftCardMessage}</p>
      )}
      {quote.giftCardBalanceZmw != null && Number(quote.giftCardZmw) > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Gift card balance after this order:{" "}
          {formatZmw(Number(quote.giftCardBalanceZmw) - Number(quote.giftCardZmw))}
        </p>
      )}
    </div>
  );
}
