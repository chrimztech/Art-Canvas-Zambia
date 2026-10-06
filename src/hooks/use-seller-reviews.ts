import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ReviewSummary } from "@/lib/types";

export const sellerReviewsQueryKey = (sellerId: string) => ["seller-reviews", sellerId];

export function useSellerReviews(sellerId: string) {
  return useQuery({
    queryKey: sellerReviewsQueryKey(sellerId),
    queryFn: () => api.get<ReviewSummary>(`/api/reviews/seller/${sellerId}`),
    enabled: !!sellerId,
    staleTime: 60_000,
  });
}
