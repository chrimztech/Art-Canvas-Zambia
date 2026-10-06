import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "Unsubscribe — ChrisEpic Arts" }, { name: "robots", content: "noindex" }],
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function confirm() {
    setState("busy");
    try {
      await api.post("/api/public/newsletter/unsubscribe", { token });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <PageShell title="Newsletter">
      <div className="max-w-xl rounded-xl border border-border bg-card p-6">
        {!token ? (
          <p className="text-muted-foreground">
            This unsubscribe link is incomplete. Use the link at the bottom of any newsletter email.
          </p>
        ) : state === "done" ? (
          <p>
            You've been unsubscribed and won't receive the newsletter any more.{" "}
            <Link to="/" className="text-primary hover:underline">
              Back to the gallery
            </Link>
          </p>
        ) : (
          <>
            <p>Stop receiving new-work and event emails from ChrisEpic Arts?</p>
            {state === "error" && (
              <p className="mt-2 text-sm text-destructive">
                Something went wrong — please try again.
              </p>
            )}
            <Button className="mt-4" onClick={confirm} disabled={state === "busy"}>
              {state === "busy" ? "Unsubscribing…" : "Unsubscribe"}
            </Button>
          </>
        )}
      </div>
    </PageShell>
  );
}
