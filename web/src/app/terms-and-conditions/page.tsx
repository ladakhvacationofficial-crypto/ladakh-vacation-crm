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
        lede="Clear, honest terms for booking your Kashmir, Ladakh, and Himalayan journey with Ladakh Vacation."
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
                <li><strong>Advance Token Deposit:</strong> 30% of total package value to block hotel rooms, houseboats, and dedicated transport.</li>
                <li><strong>Pre-Arrival Installment:</strong> 40% due 15 days prior to arrival date.</li>
                <li><strong>Balance Clearance:</strong> 30% upon arrival in Srinagar/Leh during introductory welcome briefing.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">2. Inclusions & Price Integrity</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All rates quoted by Ladakh Vacation include applicable GST (5% for tour packages) unless explicitly noted as an itemized corporate B2B tax invoice. What is written in your itinerary under <em>Inclusions</em> is 100% guaranteed without surprise hidden surcharges on arrival.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">3. High Altitude & Regional Weather Realities</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                Himalayan destinations (Gulmarg Phase 2, Sonmarg Zero Point, Khardung La, Pangong Tso) are subject to sudden weather changes, snow accumulation, and local administration road closures.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1.5 text-[14.5px] text-ink-700">
                <li>In case of road blockages (e.g. Zojila Pass or Tangmarg snow chains requirement), our 24/7 Srinagar operations team will reroute or substitute sightseeing safely.</li>
                <li>Gondola tickets in Gulmarg are strictly managed by J&K Cable Car Corporation and subject to real-time wind conditions.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">4. Identification & Permits</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All Indian guests must carry original government-issued photo IDs (Aadhaar / Voter ID / Passport / Driving License). For protected Ladakh border sectors (Pangong, Nubra, Tso Moriri), Ladakh Vacation processes all required Inner Line Permits (ILP). Non-Indian passport holders must provide valid Indian visas / e-visas.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">5. Jurisdiction & Governance</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All bookings and service agreements are governed by the laws of Jammu & Kashmir and the Republic of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the courts in Srinagar, J&K.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
