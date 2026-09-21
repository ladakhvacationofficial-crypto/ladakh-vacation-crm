import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { Faq, SectionHead, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Booking, Payments & Travel',
  description:
    'Answers on booking, payments, cancellation, permits, safety, best times to travel and what our Kashmir, Ladakh, Himachal and Vaishno Devi packages include.',
  alternates: { canonical: '/faq' },
};

const GENERAL = [
  {
    q: 'How do I book a trip with Ladakh Vacation?',
    a: 'Send an enquiry or WhatsApp us with your dates, group size and rough plan. We come back with a custom itinerary and quote within a few hours. Once you are happy, a booking advance confirms your hotels and vehicles, and the balance is due before arrival.',
  },
  {
    q: 'How much advance do you need to confirm a booking?',
    a: 'Typically 25% of the package value to confirm hotels and vehicles, with the balance before arrival. For peak-season dates or where a hotel demands full prepayment, we tell you upfront rather than after you have committed.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Bank transfer (NEFT/RTGS/IMPS) and UPI. We issue a GST invoice for every booking. We do not ask for payment to a personal account — if anyone claiming to be us does, stop and call our office number.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'It varies by season and by what the hotels have already charged us. As a rule, more than 30 days out you recover most of the advance; inside 15 days, hotel and transport commitments are largely non-refundable. The exact terms are written into every quote before you pay anything.',
  },
  {
    q: 'Are your prices per person or for the whole group?',
    a: 'All listed prices are per person on twin-sharing, GST included. Single occupancy, triple rooms, extra beds and children pricing are quoted separately based on your actual group.',
  },
  {
    q: 'Do prices change with season?',
    a: 'Yes, substantially. Peak windows — May–June, Christmas–New Year, Navratri for Vaishno Devi — can run 30–50% above shoulder season for the identical itinerary. The starting prices on this site reflect shoulder season.',
  },
  {
    q: 'Do you handle flights?',
    a: 'No. We do not book airfare, because you will almost always find a better fare yourself and we would just be adding a margin. We do advise on which airports to fly into and out of so your itinerary is not wasting a day backtracking.',
  },
  {
    q: 'Can you customise a package?',
    a: 'Every package on this site is a starting point. Add nights, change hotel category, start from a different city, travel with fifteen people instead of two — tell us what changes and we rebuild the itinerary and the quote.',
  },
  {
    q: 'Do you work with travel agents and B2B partners?',
    a: 'Yes. We handle ground operations for agencies across India as a DMC. Contact us directly for partner rates and terms.',
  },
  {
    q: 'What if something goes wrong during the trip?',
    a: 'You have one named coordinator on WhatsApp for the whole trip, and our office number reaches a person, not a queue. Hotels get changed, routes get rerouted, and roads get closed — what matters is how fast someone picks up.',
  },
];

export default function FaqPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: GENERAL.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE.domain}/faq` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Frequently asked"
        title="Booking, payments and the fine print."
        lede="The questions that come up before every trip, answered plainly. Destination-specific questions live on each destination page."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'FAQ' }]}
        background="linear-gradient(180deg, rgba(6,14,10,0.42) 0%, rgba(6,14,10,0.92) 100%), radial-gradient(140% 120% at 30% 8%, #2f6b52 0%, #143528 46%, #060f0b 100%)"
      />

      <section className="mesh-warm section-sm">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[108px]">
              <SectionHead kicker="General" title="Booking & payments" />
              <p className="mt-6 text-[14px] leading-relaxed text-ink-600">
                Looking for something destination-specific? Each hub page has its own
                FAQ covering permits, altitude, weather and access.
              </p>
              <ul className="mt-5 space-y-2">
                {DESTINATIONS.map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/destinations/${d.slug}#faq`}
                      className="link-sweep text-[13.5px] font-medium text-gold-700"
                    >
                      {d.name} FAQ →
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="btn btn-gold mt-8">
                Ask us something else
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8" data-reveal>
            <Faq items={GENERAL} />
          </div>
        </div>
      </section>
    </>
  );
}
