import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { CouponManager } from "@/components/coupon-manager";

export const Route = createFileRoute("/_authenticated/dashboard/coupons")({
  head: () => ({ meta: [{ title: "Discount codes — ChrisEpic Arts" }] }),
  component: () => (
    <PageShell
      title="Discount codes"
      description="Share a code with collectors. It only discounts your own listings — your payout is calculated on the discounted price."
    >
      <CouponManager basePath="/api/me/coupons" canDelete />
    </PageShell>
  ),
});
