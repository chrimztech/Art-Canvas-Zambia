import { useQueryClient } from "@tanstack/react-query";
import { sellerReviewsQueryKey, useSellerReviews } from "@/hooks/use-seller-reviews";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Review } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Stars } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Rating summary, star histogram and the latest reviews for a seller; the seller can reply publicly. */
export function SellerReviews({
  sellerId,
  title = "Reviews",
}: {
  sellerId: string;
  title?: string;
}) {
  const { data } = useSellerReviews(sellerId);
  const { user } = useAuth();
  if (!data) return null;
  const isSeller = user?.id === sellerId;

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {data.count === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No reviews yet. Reviews come only from verified purchases.
        </p>
      ) : (
        <div className="mt-4 grid gap-8 md:grid-cols-[14rem_1fr]">
          <div>
            <p className="font-display text-5xl">{data.average.toFixed(1)}</p>
            <Stars value={data.average} className="mt-1" />
            <p className="mt-1 text-sm text-muted-foreground">
              {data.count} verified review{data.count === 1 ? "" : "s"}
            </p>
            <div className="mt-4 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = data.histogram[n - 1] ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-3">{n}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${data.count ? (c / data.count) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <ul className="space-y-5">
            {data.reviews.map((r) => (
              <ReviewItem key={r.id} review={r} canReply={isSeller} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReviewItem({ review, canReply }: { review: Review; canReply: boolean }) {
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.sellerReply ?? "");

  async function save() {
    try {
      await api.post(`/api/reviews/${review.id}/reply`, { reply });
      toast.success("Reply posted");
      setReplying(false);
      queryClient.invalidateQueries({ queryKey: sellerReviewsQueryKey(review.sellerId) });
    } catch (e) {
      toast.error(errorMessage(e, "Could not post reply"));
    }
  }

  return (
    <li className="border-b border-border pb-5 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        <span className="text-sm font-medium">{review.reviewerName}</span>
        <span className="text-xs text-muted-foreground">
          · {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Purchased: {review.itemTitle}</p>
      {review.comment && (
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{review.comment}</p>
      )}
      {review.sellerReply && !replying && (
        <div className="mt-3 rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Seller's reply</p>
          <p className="mt-0.5 whitespace-pre-line">{review.sellerReply}</p>
        </div>
      )}
      {canReply && !replying && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-8 px-2"
          onClick={() => setReplying(true)}
        >
          {review.sellerReply ? "Edit reply" : "Reply publicly"}
        </Button>
      )}
      {replying && (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={2000}
            placeholder="Thank the buyer or respond to feedback"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!reply.trim()}>
              Post reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
