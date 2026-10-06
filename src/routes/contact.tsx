import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
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

      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
          <MessageCircle className="h-3.5 w-3.5" />
          Contact
        </div>
        <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
          We'd love to hear from you.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
          Questions about buying, selling, commissions, classes or your account — reach out and the
          team will get back to you.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6 lg:px-8">
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
