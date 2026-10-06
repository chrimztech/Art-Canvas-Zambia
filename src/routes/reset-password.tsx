import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api, setSessionHint } from "@/lib/api-client";
import { errorMessage } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" && search.token ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "Reset password — ChrisEpic Arts" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await api.post("/api/auth/reset-password", { token, newPassword: password });
      // Every session was signed out by the reset, including this browser's.
      setSessionHint(false);
      toast.success("Password updated — please sign in");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Could not reset password"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Choose a new password</h1>
        {!token ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This link is incomplete.{" "}
            <Link to="/forgot-password" className="text-primary hover:underline">
              Request a new reset link
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You'll be signed out on every device and can sign in with the new password.
            </p>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
