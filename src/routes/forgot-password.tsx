import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — ChrisEpic Arts" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-3xl font-semibold">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              we've sent a link to reset the password. It expires in one hour. Don't forget to check
              spam.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">Forgot your password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your account email and we'll send you a link to choose a new one.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
            <Link
              to="/auth"
              className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
