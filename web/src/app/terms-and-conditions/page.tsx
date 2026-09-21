import type { Metadata } from 'next';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Ladakh Vacation',
  description:
    'Review booking terms, payment schedules, permits, altitude advisories, and service guidelines for tour packages operated by Ladakh Vacation.',
  alternates: { canonical: '/terms-and-conditions' },
};

export default function TermsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms and Conditions — Ladakh Vacation',
    description: 'Commercial booking terms and conditions for Ladakh Vacation.',
    url: `${SITE.domain}/terms-and-conditions`,
    publisher: { '@id': `${SITE.domain}/#org` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Commercial Policies"
        title="Terms & Conditions"
        lede="Clear, honest terms for booking your Ladakh journey with Ladakh Vacation."
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Terms & Conditions' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap max-w-4xl">
          <div className="glass-panel rounded-3xl p-8 md:p-12 space-y-10 text-ink-800">
            <div>
              <h2 className="display d3 text-ink-950">1. Booking Confirmation & Payment Milestones</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                To confirm your holiday reservation, the following payment schedule applies unless otherwise specified in your formal quotation:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1.5 text-[14.5px] text-ink-700">
                <li><strong>Deposit:</strong> 25% of the total package value confirms your dates and locks your stays and vehicle.</li>
                <li><strong>Balance:</strong> the remaining 75% is due seven days before your arrival.</li>
                <li><strong>Methods:</strong> UPI, bank transfer and all major cards, with no-cost EMI on cards for three, six and nine months. Payments go to a company account, never to an individual.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">2. Inclusions & Price Integrity</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                Every booking comes with a written itinerary and an itemised invoice before any payment, showing what each night and each vehicle costs. What is written in your itinerary under <em>Inclusions</em> is what you get, without surcharges on arrival.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">3. High Altitude & Regional Weather Realities</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                Ladakh’s passes and lakes (Khardung La, Chang La, Pangong Tso, Hanle, Umling La and the Manali and Srinagar roads) are subject to sudden weather changes, snow, landslides and road closures by the local administration.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1.5 text-[14.5px] text-ink-700">
                <li>If a road or pass closes, our coordinator in Leh will reroute the trip or substitute sightseeing where it is safe to do so.</li>
                <li>Every itinerary is sequenced by altitude. If a traveller shows signs of acute mountain sickness, we may change the plan on the day for their safety; every vehicle carries oxygen and an oximeter.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">4. Identification & Permits</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All Indian guests must carry original government-issued photo IDs (Aadhaar / Voter ID / Passport / Driving License). For protected areas (Nubra, Pangong, Hanle, Tso Moriri and Umling La), Ladakh Vacation applies for, pays for and prints every required Inner Line Permit (ILP) before you arrive. Foreign nationals need a Protected Area Permit, which we also arrange, and must hold a valid Indian visa or e-visa.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">5. Jurisdiction & Governance</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All bookings and service agreements are governed by the laws of the Republic of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the courts at Leh, Ladakh.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
