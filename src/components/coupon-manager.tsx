import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Coupon } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, formatZmw } from "@/lib/utils";

const EMPTY = {
  code: "",
  kind: "percent",
  value: "",
  minOrder: "",
  maxRedemptions: "",
  endsAt: "",
};

/**
 * Create and manage discount codes. Sellers' codes discount only their own items; the admin
 * variant (`basePath="/api/admin/coupons"`) creates platform-wide codes.
 */
export function CouponManager({ basePath, canDelete }: { basePath: string; canDelete: boolean }) {
  const queryClient = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", basePath],
    queryFn: () => api.get<Coupon[]>(basePath),
  });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["coupons", basePath] });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(basePath, {
        code: form.code.trim().toUpperCase(),
        percentOff: form.kind === "percent" ? Number(form.value) : undefined,
        amountOffZmw: form.kind === "amount" ? Number(form.value) : undefined,
        minOrderZmw: form.minOrder ? Number(form.minOrder) : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : undefined,
      });
      toast.success("Code created");
      setForm(EMPTY);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not create the code"));
    } finally {
      setSaving(false);
    }
  }

  async function setActive(c: Coupon, active: boolean) {
    try {
      await api.patch(`${basePath}/${c.id}`, { active });
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the code"));
    }
  }

  async function remove(c: Coupon) {
    try {
      await api.del(`${basePath}/${c.id}`);
      toast.success("Code deleted");
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the code"));
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <Label htmlFor="coupon-code-new">Code</Label>
          <Input
            id="coupon-code-new"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="SUMMER20"
            pattern="[A-Za-z0-9_-]{3,30}"
            className="font-mono"
            required
          />
        </div>
        <div>
          <Label htmlFor="coupon-kind">Type</Label>
          <select
            id="coupon-kind"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="percent">% off</option>
            <option value="amount">K off</option>
          </select>
        </div>
        <div>
          <Label htmlFor="coupon-value">{form.kind === "percent" ? "Percent" : "Amount (K)"}</Label>
          <Input
            id="coupon-value"
            type="number"
            min={1}
            max={form.kind === "percent" ? 90 : undefined}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="coupon-min">Min. order (K)</Label>
          <Input
            id="coupon-min"
            type="number"
            min={0}
            value={form.minOrder}
            onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="coupon-max">Max uses</Label>
          <Input
            id="coupon-max"
            type="number"
            min={1}
            value={form.maxRedemptions}
            onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
            placeholder="Unlimited"
          />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="coupon-ends">Expires</Label>
          <Input
            id="coupon-ends"
            type="date"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </div>
        <div className="flex items-end lg:col-span-4 lg:justify-end">
          <Button type="submit" disabled={saving}>
            <Tag className="h-4 w-4" /> {saving ? "Creating…" : "Create code"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Conditions</th>
                <th className="p-3">Used</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-mono">{c.code}</td>
                  <td className="p-3">
                    {c.percentOff != null
                      ? `${Number(c.percentOff)}% off`
                      : `${formatZmw(c.amountOffZmw)} off`}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {[
                      c.minOrderZmw != null && `min ${formatZmw(c.minOrderZmw)}`,
                      c.endsAt && `until ${new Date(c.endsAt).toLocaleDateString()}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="p-3">
                    {c.redemptions}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                  </td>
                  <td className="p-3">
                    <Badge variant={c.status === "Live" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setActive(c, !c.active)}>
                        {c.active ? "Pause" : "Resume"}
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${c.code}`}
                          onClick={() => remove(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
