import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, KeyRound, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

type Field = {
  name: string;
  secret: boolean;
  source: "admin" | "server" | "demo" | "none";
  preview: string | null;
};

type Status = {
  activeProvider: string;
  lencoEnvironment: "sandbox" | "live";
  lencoReady: boolean;
  lenco: Field[];
  zynlepay: Field[];
};

const LABELS: Record<string, { label: string; hint: string }> = {
  LENCO_API_TOKEN: { label: "API token (secret)", hint: "Lenco dashboard → Settings → API keys" },
  LENCO_PUBLIC_KEY: { label: "Public key", hint: "Used by the card payment window" },
  LENCO_ACCOUNT_ID: { label: "Account ID", hint: "The Lenco account that receives payments" },
  ZYNLEPAY_MERCHANT_ID: { label: "Merchant ID", hint: "" },
  ZYNLEPAY_API_ID: { label: "API ID", hint: "" },
  ZYNLEPAY_API_KEY: { label: "API key (secret)", hint: "" },
};

const SOURCE: Record<Field["source"], string> = {
  admin: "Saved here",
  server: "From server config",
  demo: "Demo placeholder",
  none: "Not set",
};

/** Super-admin panel for entering payment gateway keys. Secrets are write-only. */
export function PaymentGateways({ onSaved }: { onSaved?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    api
      .get<Status>("/api/admin/payment-credentials")
      .then(setStatus)
      .catch((e) => toast.error(errorMessage(e, "Could not load payment gateway settings")));
  }, []);

  async function save(values: Record<string, string>, clear: string[] = []) {
    setSaving(true);
    try {
      const next = await api.put<Status>("/api/admin/payment-credentials", { values, clear });
      setStatus(next);
      setDraft({});
      toast.success("Payment gateway settings saved");
      onSaved?.();
    } catch (e) {
      toast.error(errorMessage(e, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function test(provider: "lenco" | "zynlepay") {
    setTesting(provider);
    try {
      const r = await api.post<{ ok: boolean; message: string }>(
        `/api/admin/payment-credentials/test?provider=${provider}`,
      );
      setResults((prev) => ({ ...prev, [provider]: r }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: errorMessage(e, "Test failed") },
      }));
    } finally {
      setTesting(null);
    }
  }

  if (!status) return null;
  const pending = Object.values(draft).some((v) => v.trim());

  const section = (provider: "lenco" | "zynlepay", title: string, fields: Field[]) => (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-background/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl">{title}</h3>
        {status.activeProvider === provider && <Badge>Active gateway</Badge>}
        {provider === "lenco" && (
          <Badge variant={status.lencoReady ? "secondary" : "outline"}>
            {status.lencoReady ? "Ready" : "Needs API token"}
          </Badge>
        )}
      </div>
      {provider === "lenco" && (
        <div>
          <Label>Environment</Label>
          <div className="mt-1.5 flex gap-2">
            {(["sandbox", "live"] as const).map((env) => (
              <Button
                key={env}
                type="button"
                size="sm"
                variant={status.lencoEnvironment === env ? "default" : "outline"}
                disabled={saving}
                onClick={() => save({ LENCO_ENVIRONMENT: env })}
              >
                {env === "sandbox" ? "Sandbox (testing)" : "Live (real money)"}
              </Button>
            ))}
          </div>
        </div>
      )}
      {fields.map((f) => {
        const meta = LABELS[f.name] ?? { label: f.name, hint: "" };
        return (
          <div key={f.name}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={f.name}>{meta.label}</Label>
              <span className="text-xs text-muted-foreground">
                {SOURCE[f.source]}
                {f.preview ? ` · ${f.preview}` : ""}
                {f.source === "admin" && (
                  <button
                    type="button"
                    className="ml-2 text-destructive hover:underline"
                    onClick={() => save({}, [f.name])}
                    disabled={saving}
                  >
                    Remove
                  </button>
                )}
              </span>
            </div>
            <Input
              id={f.name}
              type={f.secret ? "password" : "text"}
              autoComplete="off"
              className="mt-1.5 font-mono"
              placeholder={
                f.source === "none" ? "Not set" : "Leave blank to keep the current value"
              }
              value={draft[f.name] ?? ""}
              onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
            />
            {meta.hint && <p className="mt-1 text-xs text-muted-foreground">{meta.hint}</p>}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => test(provider)}
          disabled={testing !== null}
        >
          {testing === provider && <Loader2 className="h-4 w-4 animate-spin" />}
          Test connection
        </Button>
        {results[provider] && (
          <span
            className={`flex items-center gap-1 text-sm ${results[provider].ok ? "text-green-600" : "text-destructive"}`}
          >
            {results[provider].ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {results[provider].message}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" /> Payment gateways
        </CardTitle>
        <CardDescription>
          Enter your gateway keys here — they're encrypted before being stored and are never shown
          again in full. Save the keys, test the connection, then choose the gateway in “Payment
          provider” above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          {section("lenco", "Lenco", status.lenco)}
          {section("zynlepay", "ZynlePay", status.zynlepay)}
        </div>
        <Button
          type="button"
          onClick={() => {
            const values = Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim()));
            void save(values);
          }}
          disabled={!pending || saving}
        >
          {saving ? "Saving…" : "Save keys"}
        </Button>
      </CardContent>
    </Card>
  );
}
