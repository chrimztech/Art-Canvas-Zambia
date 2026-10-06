import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "The terms that apply when you buy, sell, commission, teach or attend events on ChrisEpic Arts.",
      },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      updated="6 October 2026"
      intro={
        <p>
          These terms govern your use of ChrisEpic Arts (“we”, “the platform”), an online
          marketplace connecting collectors with Zambian artists, instructors, exhibition organisers
          and art-supply sellers. By creating an account or making a purchase you agree to them.
        </p>
      }
      sections={[
        {
          heading: "Accounts",
          body: (
            <ul>
              <li>
                You must give accurate information and keep your password secure. You're responsible
                for activity on your account.
              </li>
              <li>
                You can enable seller tools (artist, instructor, supplier) at any time. We may
                verify sellers and display a verified badge.
              </li>
              <li>
                We may suspend accounts that break these terms, infringe others' rights or put
                buyers at risk.
              </li>
            </ul>
          ),
        },
        {
          heading: "Buying",
          body: (
            <ul>
              <li>
                Prices are in Zambian Kwacha (ZMW). There are no buyer fees on top of the listed
                price.
              </li>
              <li>
                An order is confirmed only once payment is confirmed by our payment provider.
                Original artworks are sold to the first buyer whose payment clears.
              </li>
              <li>
                Buyers should confirm receipt of physical items from their order page once
                delivered.
              </li>
            </ul>
          ),
        },
        {
          heading: "Selling",
          body: (
            <ul>
              <li>
                Sellers must own, or have the right to sell, everything they list, and must describe
                items accurately (medium, size, condition, edition).
              </li>
              <li>
                Sellers must dispatch or hand over paid items promptly and keep shipment details up
                to date on the platform.
              </li>
              <li>
                The platform deducts a platform fee and a developer royalty from each sale. The
                current rates are applied automatically and shown against every sale on your sales
                page.
              </li>
              <li>
                Earnings become available for payout once an order is paid. Payouts to mobile money
                or bank are reviewed by an administrator before they are sent.
              </li>
            </ul>
          ),
        },
        {
          heading: "Commissions",
          body: (
            <p>
              A commission becomes a contract between the customer and the artist when the customer
              pays the artist's quote. The artist agrees to deliver work that reasonably matches the
              brief; the customer agrees that a custom piece is not a stock item and may differ in
              detail from references. Disputes should first be raised with each other and, if
              unresolved, with us via the{" "}
              <Link to="/contact" className="text-primary hover:underline">
                contact page
              </Link>
              .
            </p>
          ),
        },
        {
          heading: "Classes and exhibitions",
          body: (
            <ul>
              <li>
                Instructors and organisers are responsible for running their events as described,
                including the venue or online link.
              </li>
              <li>
                Seats and tickets are limited to the published capacity. A seat or ticket is
                confirmed once it shows as confirmed in your dashboard.
              </li>
              <li>
                If an event is cancelled by its host, ticket and seat holders will be contacted
                about a refund.
              </li>
            </ul>
          ),
        },
        {
          heading: "Payments and refunds",
          body: (
            <p>
              Payments are processed by ZynlePay. Failed or abandoned payments are cancelled
              automatically and nothing is charged. Refund requests for items that did not arrive or
              were significantly not as described should be sent to us with your order number;
              refunds are returned to the original payment method where possible.
            </p>
          ),
        },
        {
          heading: "Content and intellectual property",
          body: (
            <p>
              Artists keep copyright in their work. By listing, sellers grant us a licence to
              display their images and descriptions to promote the listing and the platform. Buying
              a physical artwork does not transfer copyright or reproduction rights unless the
              artist agrees in writing.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              We provide the marketplace and payment flow but are not the seller of items listed by
              others. To the extent permitted by law, our liability for any claim is limited to the
              fees we earned on the transaction concerned.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              We may update these terms; material changes will be announced on the site. Questions?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact us
              </Link>
              . These terms are governed by the laws of the Republic of Zambia.
            </p>
          ),
        },
      ]}
    />
  );
}
