import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — ChrisEpic Arts" },
      {
        name: "description",
        content:
          "What personal data ChrisEpic Arts collects, why, who it is shared with and your rights.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="6 October 2026"
      intro={
        <p>
          This policy explains what personal data ChrisEpic Arts collects, how we use it and the
          choices you have. We process personal data in line with Zambia's Data Protection Act,
          2021.
        </p>
      }
      sections={[
        {
          heading: "What we collect",
          body: (
            <ul>
              <li>
                <strong>Account details:</strong> email address, display name and password (stored
                only as a secure hash).
              </li>
              <li>
                <strong>Profile details you choose to add:</strong> bio, location, photos, website
                and social links, phone number.
              </li>
              <li>
                <strong>Orders:</strong> what you bought or sold, amounts, and the delivery details
                you enter at checkout.
              </li>
              <li>
                <strong>Payout details (sellers):</strong> mobile money number or bank account used
                for withdrawals.
              </li>
              <li>
                <strong>Security data:</strong> the IP address and browser of each signed-in
                session, so you can review and sign out devices.
              </li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul>
              <li>
                To run your account and process purchases, payouts, commissions, class enrolments
                and tickets.
              </li>
              <li>To let sellers fulfil your order — see “Who can see your data”.</li>
              <li>
                To keep the platform secure, prevent fraud and keep an audit trail of administrative
                actions.
              </li>
            </ul>
          ),
        },
        {
          heading: "Who can see your data",
          body: (
            <ul>
              <li>
                <strong>Public:</strong> your display name, bio, location, photos, specialties and
                social links if you add them. Your phone number and payout details are never shown
                on your public profile.
              </li>
              <li>
                <strong>Sellers you buy from:</strong> your name, email and the delivery details for
                that order — only after payment is confirmed.
              </li>
              <li>
                <strong>Hosts:</strong> instructors and organisers see the name and email of people
                enrolled in their class or holding tickets to their event.
              </li>
              <li>
                <strong>ZynlePay:</strong> our payment provider receives the details needed to
                process a payment or payout. Card details are entered with them, not stored by us.
              </li>
              <li>We do not sell personal data.</li>
            </ul>
          ),
        },
        {
          heading: "Retention",
          body: (
            <p>
              We keep account data while your account is open. Order and payout records are kept for
              as long as required for accounting and legal purposes, even if an account is closed.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can view and edit your profile at any time from{" "}
              <Link to="/dashboard/profile" className="text-primary hover:underline">
                Profile & security
              </Link>
              . You may ask us for a copy of your data, to correct it, or to delete your account by{" "}
              <Link to="/contact" className="text-primary hover:underline">
                contacting us
              </Link>
              .
            </p>
          ),
        },
        {
          heading: "Cookies and storage",
          body: (
            <p>
              We store your sign-in token in your browser's local storage so you stay signed in. We
              don't use advertising trackers.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about privacy?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Get in touch
              </Link>{" "}
              and we'll respond within a few business days.
            </p>
          ),
        },
      ]}
    />
  );
}
