import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { LifeBuoy, Search } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help center — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "Answers about buying, paying, delivery, commissions, classes, selling and payouts on ChrisEpic Arts.",
      },
    ],
  }),
  component: Help,
});

const FAQ: { section: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    section: "Buying art & supplies",
    items: [
      {
        q: "How do I buy an artwork?",
        a: (
          <>
            Open the artwork, choose <strong>Add to cart</strong>, then go to your{" "}
            <Link to="/cart" className="text-primary hover:underline">
              cart
            </Link>
            . Enter delivery details and pay with mobile money or card. Original artworks are one of
            a kind, so they're reserved for whoever completes payment first.
          </>
        ),
      },
      {
        q: "Can I save pieces for later?",
        a: (
          <>
            Yes — tap the heart on any artwork. Everything you save is on your{" "}
            <Link to="/favorites" className="text-primary hover:underline">
              Favorites
            </Link>{" "}
            page.
          </>
        ),
      },
      {
        q: "Are there buyer fees?",
        a: "No. The price you see is the price you pay. Our platform fee is deducted from the seller's earnings, not added to your total.",
      },
      {
        q: "An item in my cart says it's no longer available",
        a: "Another collector bought it first, or the seller unpublished it. Remove it from your cart to continue with the rest of your order.",
      },
    ],
  },
  {
    section: "Payments",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "Mobile money (you approve a prompt on your phone) and Visa/Mastercard cards. Payments are processed by ZynlePay; we never see or store your card number.",
      },
      {
        q: "My payment failed — was I charged?",
        a: "No. If a payment is declined or times out, the order is cancelled automatically and your cart items stay saved so you can try again.",
      },
      {
        q: "My order still says pending",
        a: (
          <>
            Mobile money approvals can take a minute. Your order page refreshes automatically. If it
            stays pending for more than an hour,{" "}
            <Link to="/contact" className="text-primary hover:underline">
              contact us
            </Link>{" "}
            with your order number.
          </>
        ),
      },
    ],
  },
  {
    section: "Delivery",
    items: [
      {
        q: "How does delivery work?",
        a: "At checkout choose delivery to your address or collection from the seller. After payment the seller packs your item and marks it shipped — often with a courier and tracking number you can see on your order page.",
      },
      {
        q: "What do I do when my item arrives?",
        a: 'Open the order and press "I\'ve received this". That completes the order and lets the seller get paid out.',
      },
    ],
  },
  {
    section: "Commissions",
    items: [
      {
        q: "How do commissions work?",
        a: (
          <>
            Post a brief from the{" "}
            <Link to="/commissions" className="text-primary hover:underline">
              commissions page
            </Link>{" "}
            — to every artist, or to one artist from their profile. Artists reply with a quote. You
            accept a quote by paying it, the artist starts work, and you confirm when you've
            received the finished piece.
          </>
        ),
      },
      {
        q: "Can I decline a quote?",
        a: (
          <>
            Yes. On{" "}
            <Link to="/dashboard/my-commissions" className="text-primary hover:underline">
              My commissions
            </Link>{" "}
            choose "Decline quote". You can withdraw a request any time before you pay.
          </>
        ),
      },
    ],
  },
  {
    section: "Classes & exhibitions",
    items: [
      {
        q: "Where do I find my classes?",
        a: (
          <>
            Under{" "}
            <Link to="/dashboard/learning" className="text-primary hover:underline">
              My classes
            </Link>
            . Online classes show a joining link once your seat is confirmed.
          </>
        ),
      },
      {
        q: "Where is my exhibition ticket?",
        a: (
          <>
            Under{" "}
            <Link to="/dashboard/tickets" className="text-primary hover:underline">
              My tickets
            </Link>
            . Show the QR code at the door — free tickets are issued instantly, paid ones once
            payment clears.
          </>
        ),
      },
    ],
  },
  {
    section: "Selling & payouts",
    items: [
      {
        q: "How do I start selling?",
        a: (
          <>
            Create an account, then on your{" "}
            <Link to="/dashboard" className="text-primary hover:underline">
              dashboard
            </Link>{" "}
            enable artist, instructor or supplier tools. You can enable more than one.
          </>
        ),
      },
      {
        q: "How and when do I get paid?",
        a: (
          <>
            Each paid sale adds your earnings (sale price minus the platform fee) to your balance on{" "}
            <Link to="/sales" className="text-primary hover:underline">
              Sales & payouts
            </Link>
            . Request a payout to mobile money or a bank account; an administrator approves it and
            the transfer is sent through ZynlePay.
          </>
        ),
      },
      {
        q: "What do I do when I make a sale?",
        a: 'Paid orders appear under "To ship" on your sales page with the buyer\'s delivery details. Pack the item, mark it shipped (add the courier and tracking number if you have them), and the buyer confirms receipt.',
      },
    ],
  },
  {
    section: "Account & security",
    items: [
      {
        q: "How do I change my password?",
        a: (
          <>
            Go to{" "}
            <Link to="/dashboard/profile" className="text-primary hover:underline">
              Profile & security
            </Link>
            . Changing your password signs out all your other devices.
          </>
        ),
      },
      {
        q: "I see a device I don't recognise",
        a: "On the same page, sign that device out and change your password.",
      },
    ],
  },
];

function text(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (node && typeof node === "object" && "props" in node)
    return text((node as { props: { children?: React.ReactNode } }).props.children);
  return "";
}

function Help() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const sections = FAQ.map((s) => ({
    ...s,
    items: s.items.filter((i) => !q || `${i.q} ${text(i.a)}`.toLowerCase().includes(q)),
  })).filter((s) => s.items.length);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <LifeBuoy className="h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-4xl font-semibold">Help center</h1>
        <p className="mt-2 text-muted-foreground">
          Answers to common questions. Can't find yours?{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles"
            className="pl-9"
            aria-label="Search help"
          />
        </div>
        {sections.length === 0 && (
          <p className="mt-10 text-muted-foreground">No answers match "{query}".</p>
        )}
        {sections.map((s) => (
          <section key={s.section} className="mt-10">
            <h2 className="font-display text-2xl">{s.section}</h2>
            <Accordion type="multiple" className="mt-2">
              {s.items.map((i) => (
                <AccordionItem key={i.q} value={i.q}>
                  <AccordionTrigger className="text-left">{i.q}</AccordionTrigger>
                  <AccordionContent className="text-foreground/85 leading-relaxed">
                    {i.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}
