import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { RefundRequest } from "@/lib/types";
import { errorMessage, formatZmw } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** Admin queue of buyer refund requests. Approving records that the money was returned via the gateway. */
export function AdminRefunds() {
  const [rows, setRows] = useState<RefundRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"requested" | "all">("requested");
  const load = () =>
    api
      .get<RefundRequest[]>("/api/admin/refunds")
      .then(setRows)
      .catch((e) => toast.error(errorMessage(e, "Could not load refunds")));
  useEffect(() => {
    void load();
  }, []);

  async function resolve(r: RefundRequest, decision: "refunded" | "rejected") {
    const text =
      decision === "refunded"
        ? `Mark ${formatZmw(r.amountZmw)} as refunded to ${r.buyerDisplayName ?? "the buyer"}? Send the money back from the payment provider's dashboard first.`
        : "Decline this refund request?";
    if (!window.confirm(text)) return;
    try {
      await api.post(`/api/admin/refunds/${r.id}/resolve`, { decision, note: notes[r.id] });
      toast.success(
        decision === "refunded" ? "Refund recorded — buyer and seller notified" : "Refund declined",
      );
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not resolve refund"));
    }
  }

  const shown = filter === "requested" ? rows.filter((r) => r.status === "requested") : rows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund requests</CardTitle>
        <CardDescription>
          Return the money from the payment provider's dashboard (ZynlePay or Lenco) using the
          payment reference, then mark it refunded here. That removes the sale from the seller's
          earnings and cancels any class seat, ticket or commission.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={filter === "requested" ? "default" : "outline"}
            onClick={() => setFilter("requested")}
          >
            Open ({rows.filter((r) => r.status === "requested").length})
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No refund requests{filter === "requested" ? " waiting" : ""}.
          </p>
        )}
        {shown.map((r) => (
          <div key={r.id} className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {r.itemTitle} · {formatZmw(r.amountZmw)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.orderNumber} · requested {new Date(r.createdAt).toLocaleString()}
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
                {r.status}
              </Badge>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Buyer:</span> {r.buyerDisplayName}{" "}
                {r.buyerEmail ? `· ${r.buyerEmail}` : ""} {r.buyerPhone ? `· ${r.buyerPhone}` : ""}
              </p>
              <p>
                <span className="text-muted-foreground">Seller:</span> {r.sellerDisplayName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Paid via:</span> {r.paymentProvider ?? "—"}{" "}
                {r.paymentReference ? `· ref ${r.paymentReference}` : ""}
              </p>
            </div>
            <p>
              <span className="text-muted-foreground">Reason:</span> {r.reason}
            </p>
            {r.sellerResponse && (
              <p>
                <span className="text-muted-foreground">Seller says:</span> {r.sellerResponse}
              </p>
            )}
            {r.adminNote && (
              <p>
                <span className="text-muted-foreground">Note:</span> {r.adminNote}
              </p>
            )}
            {r.status === "requested" && (
              <div className="space-y-2 pt-1">
                <Textarea
                  rows={2}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  placeholder="Note for buyer and seller (e.g. refunded via Airtel Money, ref …)"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolve(r, "refunded")}>
                    Mark refunded
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(r, "rejected")}>
                    Decline
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
