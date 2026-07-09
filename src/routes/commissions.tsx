import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api, getAuthToken } from "@/lib/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Brush, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/commissions")({
  head: () => ({
    meta: [
      { title: "Commission Custom Art — ChrisEpic Arts" },
      { name: "description", content: "Request a custom artwork from a Zambian artist. Portraits, murals, illustrations and more." },
    ],
  }),
  component: Commissions,
});

function Commissions() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!getAuthToken()) {
      toast.error("Please sign in to request a commission");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await api.post("/api/commissions", {
        title: String(fd.get("title") ?? ""),
        brief: String(fd.get("brief") ?? ""),
        budgetZmw: fd.get("budget") ? Number(fd.get("budget")) : null,
        deadline: (fd.get("deadline") as string) || null,
      });
      toast.success("Commission request submitted");
      setDone(true);
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <Brush className="h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-4xl font-semibold">Commission custom art</h1>
            <p className="mt-3 text-muted-foreground">Tell us what you'd like and we'll match you with a Zambian artist. Portraits, murals, illustrations, gifts — anything.</p>
            <ol className="mt-6 space-y-3 text-sm">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>Describe your idea and budget below.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>An artist sends a quote within 48 hours.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>You accept, pay a deposit, and track progress.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">4</span>Receive your finished piece.</li>
            </ol>
          </div>

          <Card className="p-6">
            {done ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <h2 className="mt-4 font-display text-xl font-semibold">Request submitted</h2>
                <p className="mt-2 text-sm text-muted-foreground">Artists will review and respond shortly. Track your requests from the dashboard.</p>
                <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Go to dashboard →</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required placeholder="e.g. Portrait of my grandmother" />
                </div>
                <div>
                  <Label htmlFor="brief">Brief</Label>
                  <Textarea id="brief" name="brief" required rows={5} placeholder="Describe the subject, style, size, references, and any details that matter." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (ZMW)</Label>
                    <Input id="budget" name="budget" type="number" min={0} step={50} placeholder="2000" />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Needed by</Label>
                    <Input id="deadline" name="deadline" type="date" />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit request"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">You'll need to <Link to="/auth" className="text-primary hover:underline">sign in</Link> to submit.</p>
              </form>
            )}
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
