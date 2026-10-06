import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Review } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { Stars } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Latest reviews across the platform, with removal for abusive or off-topic ones. */
export function AdminReviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const load = () =>
    api
      .get<Review[]>("/api/admin/reviews")
      .then(setRows)
      .catch((e) => toast.error(errorMessage(e, "Could not load reviews")));
  useEffect(() => {
    void load();
  }, []);

  async function remove(r: Review) {
    if (!window.confirm("Remove this review? This can't be undone.")) return;
    try {
      await api.del(`/api/admin/reviews/${r.id}`);
      toast.success("Review removed");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not remove review"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
        <CardDescription>
          Verified-purchase reviews, newest first. Remove only reviews that break the rules (abuse,
          spam, personal data).
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {rows.length === 0 && (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No reviews yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-4 px-6 py-4 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-medium">{r.reviewerName}</span>
                <span className="text-xs text-muted-foreground">
                  on “{r.itemTitle}” · {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-foreground/90">{r.comment}</p>}
              {r.sellerReply && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Seller replied: {r.sellerReply}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => remove(r)}
            >
              Remove
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
