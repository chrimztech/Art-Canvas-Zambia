import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Smartphone, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import type { CheckoutRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePaymentProvider } from "@/hooks/use-site-settings";

export function CheckoutForm({
  busy,
  onSubmit,
  submitLabel,
  requireShipping = false,
}: {
  busy: boolean;
  onSubmit: (req: CheckoutRequest) => void | Promise<void>;
  submitLabel: string;
  /** Collect delivery details (artworks and supplies are physical goods). */
  requireShipping?: boolean;
}) {
  const provider = usePaymentProvider();
  const lenco = provider === "lenco";
  const [method, setMethod] = useState<"card" | "momo">("momo");
  const [operator, setOperator] = useState<"" | "airtel" | "mtn" | "zamtel">("");
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "ZMB",
  });
  const [shipping, setShipping] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const setShip = (k: keyof typeof shipping) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShipping({ ...shipping, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\+?\d[\d\s-]{7,}$/.test(form.phone.trim())) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (
      requireShipping &&
      delivery === "delivery" &&
      (!shipping.address.trim() || !shipping.city.trim())
    ) {
      toast.error("Please enter a delivery address and city");
      return;
    }
    const req: CheckoutRequest = {
      ...(method === "card"
        ? lenco
          ? { firstName: form.firstName, lastName: form.lastName }
          : form
        : {}),
      ...(lenco && method === "momo" && operator ? { operator } : {}),
      paymentMethod: method,
      phone: form.phone.trim(),
      ...(requireShipping
        ? {
            deliveryMethod: delivery,
            shippingName: shipping.name || undefined,
            shippingPhone: shipping.phone || undefined,
            shippingAddress: delivery === "delivery" ? shipping.address : undefined,
            shippingCity: delivery === "delivery" ? shipping.city : undefined,
            shippingNotes: shipping.notes || undefined,
          }
        : {}),
    };
    await onSubmit(req);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5">
      {requireShipping && (
        <fieldset className="mb-6">
          <legend className="text-sm font-medium">Delivery</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ChoiceButton active={delivery === "delivery"} onClick={() => setDelivery("delivery")}>
              <Truck className="h-4 w-4" /> Deliver to me
            </ChoiceButton>
            <ChoiceButton active={delivery === "pickup"} onClick={() => setDelivery("pickup")}>
              <Store className="h-4 w-4" /> Collect from seller
            </ChoiceButton>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ship-name">Recipient name</Label>
              <Input
                id="ship-name"
                value={shipping.name}
                onChange={setShip("name")}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="ship-phone">Contact phone</Label>
              <Input
                id="ship-phone"
                value={shipping.phone}
                onChange={setShip("phone")}
                placeholder="Same as payment"
                autoComplete="tel"
              />
            </div>
            {delivery === "delivery" && (
              <>
                <div className="col-span-2">
                  <Label htmlFor="ship-address">Delivery address</Label>
                  <Input
                    id="ship-address"
                    value={shipping.address}
                    onChange={setShip("address")}
                    placeholder="Plot / street / area"
                    autoComplete="street-address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ship-city">City / town</Label>
                  <Input
                    id="ship-city"
                    value={shipping.city}
                    onChange={setShip("city")}
                    placeholder="Lusaka"
                    autoComplete="address-level2"
                    required
                  />
                </div>
              </>
            )}
            <div className={delivery === "delivery" ? "" : "col-span-2"}>
              <Label htmlFor="ship-notes">Notes for the seller</Label>
              <Input
                id="ship-notes"
                value={shipping.notes}
                onChange={setShip("notes")}
                placeholder="Landmarks, best time…"
              />
            </div>
          </div>
          {delivery === "pickup" && (
            <p className="mt-2 text-xs text-muted-foreground">
              The seller will contact you to arrange collection.
            </p>
          )}
        </fieldset>
      )}

      <p className="text-sm font-medium">Pay with</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ChoiceButton active={method === "momo"} onClick={() => setMethod("momo")}>
          <Smartphone className="h-4 w-4" /> Mobile Money
        </ChoiceButton>
        <ChoiceButton active={method === "card"} onClick={() => setMethod("card")}>
          <CreditCard className="h-4 w-4" /> Card
        </ChoiceButton>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="checkout-phone">
            {method === "momo" ? "Mobile money number" : "Phone number"}
          </Label>
          <Input
            id="checkout-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="0971234567"
            autoComplete="tel"
            required
          />
          {method === "momo" && (
            <p className="mt-1 text-xs text-muted-foreground">
              You'll get a prompt on this phone to approve the payment.
            </p>
          )}
        </div>
        {lenco && method === "momo" && (
          <div>
            <Label htmlFor="checkout-operator">Network</Label>
            <select
              id="checkout-operator"
              value={operator}
              onChange={(e) => setOperator(e.target.value as typeof operator)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Detect from number</option>
              <option value="airtel">Airtel Money</option>
              <option value="mtn">MTN MoMo</option>
              <option value="zamtel">Zamtel Kwacha</option>
            </select>
          </div>
        )}
        {lenco && method === "card" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="checkout-firstName">First name</Label>
                <Input
                  id="checkout-firstName"
                  value={form.firstName}
                  onChange={set("firstName")}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="checkout-lastName">Last name</Label>
                <Input
                  id="checkout-lastName"
                  value={form.lastName}
                  onChange={set("lastName")}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You'll enter your card details in Lenco's secure payment window — they never touch our
              servers.
            </p>
          </div>
        )}
        {!lenco && method === "card" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="checkout-firstName">First name</Label>
              <Input
                id="checkout-firstName"
                value={form.firstName}
                onChange={set("firstName")}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkout-lastName">Last name</Label>
              <Input
                id="checkout-lastName"
                value={form.lastName}
                onChange={set("lastName")}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="checkout-address">Billing address</Label>
              <Input
                id="checkout-address"
                value={form.address}
                onChange={set("address")}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkout-city">City</Label>
              <Input id="checkout-city" value={form.city} onChange={set("city")} required />
            </div>
            <div>
              <Label htmlFor="checkout-state">Province</Label>
              <Input id="checkout-state" value={form.state} onChange={set("state")} required />
            </div>
            <div>
              <Label htmlFor="checkout-zipCode">Postal code</Label>
              <Input
                id="checkout-zipCode"
                value={form.zipCode}
                onChange={set("zipCode")}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkout-country">Country</Label>
              <Input id="checkout-country" value={form.country} onChange={set("country")} />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors",
        active ? "border-primary bg-accent" : "border-border hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}
