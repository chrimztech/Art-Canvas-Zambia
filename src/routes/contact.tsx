import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

const TOPICS = [
  ["general", "General question"],
  ["advisory", "Art advisory — help me find a piece"],
  ["order", "An order or payment"],
  ["selling", "Selling on ChrisEpic Arts"],
  ["press", "Press & partnerships"],
] as const;
type Topic = (typeof TOPICS)[number][0];

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>): { topic?: Topic } => ({
    topic: TOPICS.find(([t]) => t === search.topic)?.[0],
  }),
  head: () => ({
    meta: [
      { title: "Contact — ChrisEpic Arts" },
      { name: "description", content: "Get in touch with the ChrisEpic Arts team." },
    ],
  }),
  component: Contact,
});

const CONTACT_EMAIL = "support@chrisepicarts.com";
const CONTACT_PHONE = "+260 97 000 0000";

function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="page-container pt-16 pb-10 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
          <MessageCircle className="h-3.5 w-3.5" />
          Contact
        </div>
        <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
          We'd love to hear from you.
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          Questions about buying, selling, commissions, classes or your account — reach out and the
          team will get back to you.
        </p>
      </section>

      <section className="page-container pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary w-fit">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="pt-3">Email</CardTitle>
              <CardDescription>{CONTACT_EMAIL}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={`mailto:${CONTACT_EMAIL}`}>Send an email</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary w-fit">
                <Phone className="h-5 w-5" />
              </div>
              <CardTitle className="pt-3">Phone</CardTitle>
              <CardDescription>{CONTACT_PHONE}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`}>Call us</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary w-fit">
                <MapPin className="h-5 w-5" />
              </div>
              <CardTitle className="pt-3">Location</CardTitle>
              <CardDescription>Lusaka, Zambia</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <ContactForm />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Prefer email?</CardTitle>
            <CardDescription>
              Send us a message at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              with as much detail as you can — your account email, order or listing reference, and
              what you need help with. We typically reply within 1–2 business days.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}

function ContactForm() {
  const { topic: initialTopic } = Route.useSearch();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.displayName ?? "",
    email: user?.email ?? "",
    topic: (initialTopic ?? "general") as Topic,
    message: "",
    budget: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const advisory = form.topic === "advisory";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>("/api/public/contact", {
        name: form.name,
        email: form.email,
        topic: form.topic,
        message: form.message,
        budgetZmw: advisory && form.budget ? Number(form.budget) : undefined,
      });
      setSent(res.message);
    } catch (err) {
      toast.error(errorMessage(err, "Could not send your message"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6" id="message">
      <CardHeader>
        <CardTitle>{advisory ? "Free art advisory" : "Send us a message"}</CardTitle>
        <CardDescription>
          {advisory
            ? "Tell us about your space, taste and budget — a curator will reply with a hand-picked shortlist."
            : "We reply within 1–2 business days."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-primary">{sent}</p>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className={advisory ? "" : "sm:col-span-2"}>
              <Label htmlFor="c-topic">Topic</Label>
              <select
                id="c-topic"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value as Topic })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TOPICS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {advisory && (
              <div>
                <Label htmlFor="c-budget">Budget (K)</Label>
                <Input
                  id="c-budget"
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="c-message">Message</Label>
              <Textarea
                id="c-message"
                required
                rows={5}
                maxLength={4000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={
                  advisory
                    ? "Room, wall size, colours, styles you love, artists you like…"
                    : "How can we help?"
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
