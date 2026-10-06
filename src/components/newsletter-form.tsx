import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Email sign-up for new-work and event announcements. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/public/newsletter", { email });
      setDone(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not subscribe"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-primary">
        You're subscribed — look out for new work and events in your inbox.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex max-w-md gap-2">
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="pl-9"
          aria-label="Email address for the newsletter"
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "…" : "Subscribe"}
      </Button>
    </form>
  );
}
