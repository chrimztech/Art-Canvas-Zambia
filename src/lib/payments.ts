import type { CheckoutResponse, LencoWidgetConfig } from "@/lib/types";

type LencoPay = {
  getPaid: (options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    LencoPay?: LencoPay;
  }
}

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string) {
  let pending = scriptLoads.get(src);
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptLoads.delete(src);
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
      };
      document.head.appendChild(el);
    });
    scriptLoads.set(src, pending);
  }
  return pending;
}

export type WidgetOutcome = "success" | "pending" | "closed";

/** Opens Lenco's payment window and resolves when the buyer pays, is awaiting confirmation, or closes it. */
export async function openLencoWidget(config: LencoWidgetConfig): Promise<WidgetOutcome> {
  await loadScript(config.scriptUrl);
  const lenco = window.LencoPay;
  if (!lenco) throw new Error("The payment window failed to start. Please try again.");
  return new Promise<WidgetOutcome>((resolve) => {
    lenco.getPaid({
      key: config.key,
      reference: config.reference,
      email: config.email,
      amount: Number(config.amount),
      currency: config.currency,
      channels: config.channels,
      customer: config.customer,
      onSuccess: () => resolve("success"),
      onConfirmationPending: () => resolve("pending"),
      onClose: () => resolve("closed"),
    });
  });
}

/**
 * Finishes whatever the gateway needs after checkout: follow a hosted redirect, or run the in-page
 * widget. Returns the message to show (the order page then verifies payment server-side), or null
 * when the browser is leaving for a redirect.
 */
export async function continuePayment(res: CheckoutResponse): Promise<string | null> {
  if (res.redirectUrl) {
    window.location.href = res.redirectUrl;
    return null;
  }
  if (res.widget) {
    const outcome = await openLencoWidget(res.widget);
    if (outcome === "success") return "Payment received — confirming with the bank…";
    if (outcome === "pending") return "Payment submitted — waiting for confirmation.";
    return "Payment window closed. You can retry from your cart; unpaid orders cancel automatically.";
  }
  return res.message ?? "Payment started";
}
