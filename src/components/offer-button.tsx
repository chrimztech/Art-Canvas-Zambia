import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { ArtworkDetail, Offer } from "@/lib/types";
import { errorMessage, formatZmw } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** "Make an offer" on an artwork whose artist accepts offers. Offers must be at least half the price. */
export function OfferButton({ artwork }: { artwork: ArtworkDetail }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Offer | null>(null);
  if (
    !artwork.acceptsOffers ||
    artwork.status !== "published" ||
    artwork.sellerOnVacation ||
    user?.id === artwork.artistId
  ) {
    return null;
  }
  const price = Number(artwork.priceZmw);
  const min = Math.ceil(price / 2);
  const value = Number(amount);
  const valid = value >= min && value < price;

  function start() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setOpen(true);
  }

  async function send() {
    setSending(true);
    try {
      const offer = await api.post<Offer>("/api/offers", {
        artworkId: artwork.id,
        amountZmw: value,
        message: message || undefined,
      });
      setSent(offer);
      toast.success("Offer sent to the artist");
    } catch (e) {
      toast.error(errorMessage(e, "Could not send offer"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button size="lg" variant="outline" onClick={start}>
        <HandCoins className="h-4 w-4" /> Make an offer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make an offer</DialogTitle>
            <DialogDescription>
              Listed at {formatZmw(price)}. The artist has 3 days to accept, decline or counter. If
              they accept, you can pay your agreed price from your offers page.
            </DialogDescription>
          </DialogHeader>
          {sent ? (
            <div className="space-y-3 text-sm">
              <p>
                Your offer of <strong>{formatZmw(sent.amountZmw)}</strong> is with{" "}
                {artwork.artistDisplayName ?? "the artist"}. We'll notify you when they respond.
              </p>
              <Link to="/dashboard/offers" className="text-primary hover:underline">
                See your offers →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="offer-amount">Your offer (K)</Label>
                <Input
                  id="offer-amount"
                  type="number"
                  inputMode="decimal"
                  min={min}
                  max={price - 1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(Math.round(price * 0.85))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Between {formatZmw(min)} and {formatZmw(price - 1)}.
                </p>
              </div>
              <div>
                <Label htmlFor="offer-message">Message (optional)</Label>
                <Textarea
                  id="offer-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {sent ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={send} disabled={!valid || sending}>
                  {sending ? "Sending…" : valid ? `Offer ${formatZmw(value)}` : "Send offer"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
