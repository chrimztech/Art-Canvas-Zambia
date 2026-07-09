import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import type { CheckoutRequest } from "@/lib/types";

export function CheckoutForm({
  busy,
  onSubmit,
  submitLabel,
}: {
  busy: boolean;
  onSubmit: (req: CheckoutRequest) => void | Promise<void>;
  submitLabel: string;
}) {
  const [method, setMethod] = useState<"card" | "momo">("momo");
  const [form, setForm] = useState({
    phone: "", firstName: "", lastName: "", address: "", city: "", state: "", zipCode: "", country: "ZMB",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.phone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    const req: CheckoutRequest = { paymentMethod: method, phone: form.phone, ...(method === "card" ? form : {}) };
    await onSubmit(req);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium">Pay with</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMethod("momo")}
          className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${method === "momo" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
        >
          <Smartphone className="h-4 w-4" /> Mobile Money
        </button>
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${method === "card" ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
        >
          <CreditCard className="h-4 w-4" /> Card
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="checkout-phone">Phone number</Label>
          <Input id="checkout-phone" value={form.phone} onChange={set("phone")} placeholder="0971234567" />
        </div>
        {method === "card" && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="checkout-firstName">First name</Label><Input id="checkout-firstName" value={form.firstName} onChange={set("firstName")} /></div>
            <div><Label htmlFor="checkout-lastName">Last name</Label><Input id="checkout-lastName" value={form.lastName} onChange={set("lastName")} /></div>
            <div className="col-span-2"><Label htmlFor="checkout-address">Address</Label><Input id="checkout-address" value={form.address} onChange={set("address")} /></div>
            <div><Label htmlFor="checkout-city">City</Label><Input id="checkout-city" value={form.city} onChange={set("city")} /></div>
            <div><Label htmlFor="checkout-state">Province</Label><Input id="checkout-state" value={form.state} onChange={set("state")} /></div>
            <div><Label htmlFor="checkout-zipCode">Postal code</Label><Input id="checkout-zipCode" value={form.zipCode} onChange={set("zipCode")} /></div>
            <div><Label htmlFor="checkout-country">Country</Label><Input id="checkout-country" value={form.country} onChange={set("country")} /></div>
          </div>
        )}
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={submit} disabled={busy}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : submitLabel}
      </Button>
    </div>
  );
}
