import type { Metadata } from 'next';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy — Ladakh Vacation',
  description:
    'Review transparent cancellation timelines, refund deductions, and weather contingency policies for travel packages with Ladakh Vacation.',
  alternates: { canonical: '/cancellation-and-refund-policy' },
};

export default function CancellationPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Cancellation & Refund Policy — Ladakh Vacation',
    description: 'Cancellation and refund guidelines for Ladakh Vacation.',
    url: `${SITE.domain}/cancellation-and-refund-policy`,
    publisher: { '@id': `${SITE.domain}/#org` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Peace of Mind"
        title="Cancellation & Refund Policy"
        lede="We believe in fairness and transparency. Here is our straightforward refund schedule should your travel plans change."
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Cancellation Policy' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap max-w-4xl">
          <div className="glass-panel rounded-3xl p-8 md:p-12 space-y-10 text-ink-800">
            <div>
              <h2 className="display d3 text-ink-950">1. Standard Cancellation Slabs</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                If you need to cancel your trip, notice must be received in writing via email ({SITE.email}) or our official WhatsApp ({SITE.phone.display}). Refund percentages are calculated on total tour cost:
              </p>
              <div className="mt-5 overflow-hidden rounded-2xl border border-paper-300">
                <table className="w-full text-left text-[14px]">
                  <thead className="bg-paper-200/80 text-ink-950 font-semibold border-b border-paper-300">
                    <tr>
                      <th className="p-4">Notice Period Prior to Arrival</th>
                      <th className="p-4">Cancellation Fee</th>
                      <th className="p-4">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-300 bg-paper-50">
                    <tr>
                      <td className="p-4 font-medium text-ink-900">30+ Days before arrival</td>
                      <td className="p-4 text-emerald-700 font-semibold">10% (Service token)</td>
                      <td className="p-4 text-ink-900 font-semibold">90% Refund</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-ink-900">15 to 29 Days before arrival</td>
                      <td className="p-4 text-amber-700 font-semibold">25% of total cost</td>
                      <td className="p-4 text-ink-900 font-semibold">75% Refund</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-ink-900">7 to 14 Days before arrival</td>
                      <td className="p-4 text-amber-800 font-semibold">50% of total cost</td>
                      <td className="p-4 text-ink-900 font-semibold">50% Refund</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-ink-900">Less than 7 Days / No-Show</td>
                      <td className="p-4 text-rose-700 font-semibold">100% of total cost</td>
                      <td className="p-4 text-ink-600">Non-refundable</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">2. Peak Season & Festive Bookings</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                For peak-season dates, and for camps at Nubra, Pangong and Hanle, some hotels and camps apply stricter cancellation terms of their own. Where they do, we show those terms in your quote before you pay anything, and they apply in place of the slabs above for that part of the booking.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">3. Flight Disruptions & Force Majeure</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                If a flight into Leh is cancelled for weather, or a pass or road closes because of snow, landslides or an administrative order, Ladakh Vacation will reschedule stays without penalty wherever suppliers permit and reroute the trip where it is safe to do so. Any unused transport days will be adjusted or refunded.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">4. Refund Processing Timeline</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                Approved refunds are processed via the original payment method (Bank Transfer / UPI / Card) within <strong>5 to 7 business days</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
