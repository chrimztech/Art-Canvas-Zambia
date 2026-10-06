import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PaymentProvider, PublicSiteSettings } from "@/lib/types";

/** Public platform settings; the active payment gateway decides which checkout fields to show. */
export function usePaymentProvider(): PaymentProvider {
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: () => api.get<PublicSiteSettings>("/api/public/site-settings"),
    staleTime: 5 * 60_000,
  });
  return data?.paymentProvider ?? "zynlepay";
}

/** Banks Lenco can pay out to (empty when another gateway is active), for payout-account suggestions. */
export function usePayoutBanks() {
  const { data = [] } = useQuery({
    queryKey: ["payout-banks"],
    queryFn: () => api.get<string[]>("/api/public/banks"),
    staleTime: 60 * 60_000,
  });
  return data;
}
