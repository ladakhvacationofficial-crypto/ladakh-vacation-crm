import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { Faq, SectionHead, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Booking, Payments & Travel',
  description:
    'Answers on booking, payments, EMI, Inner Line Permits, altitude, the best months for Ladakh and what our Ladakh tour packages include.',
  alternates: { canonical: '/faq' },
};

const GENERAL = [
  {
    q: "How do I book a trip with Ladakh Vacation?",
    a: "Send an enquiry or WhatsApp us with your dates, group size and the shape of the trip you have in mind. A planner in Leh comes back with a written itinerary and an itemised quote, usually the same day. A 25% deposit confirms the booking, and the balance is due seven days before you arrive.",
  },
  {
    q: "Are you a registered travel agency, and how do I know my money is safe?",
    a: "Yes — we are a Ladakh-registered tour operator with an office in Leh, not an intermediary reselling someone else’s trip. You get a written itinerary and an itemised invoice before any payment, a 25% deposit confirms the booking, and the balance is only due seven days before you arrive. Payments go to a company account, never to an individual.",
  },
  {
    q: "Why book with a Leh-based operator rather than a big portal?",
    a: "Because the people answering your questions are the people running your trip. We own the relationships with the drivers, camps and hotels directly, so there is no chain of commissions between you and the person actually serving you — and when a pass closes at 11pm, the person who replies is sitting in Leh, not in a call centre in another state.",
  },
  {
    q: "How does payment work? Is EMI available?",
    a: "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum.",
  },
  {
    q: "Can the itinerary be changed?",
    a: "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries.",
  },
  {
    q: "How bad is the altitude, honestly?",
    a: "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us.",
  },
  {
    q: "Do I need permits, and do you arrange them?",
    a: "Yes — Nubra, Pangong, Hanle, Tso Moriri and Umling La all sit in protected or border zones requiring an Inner Line Permit (a Protected Area Permit for foreign nationals). We apply, pay and print every permit before you arrive; they are waiting at your hotel on day one. We only need a scan of your photo ID at booking.",
  },
  {
    q: "When should I actually visit?",
    a: "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close.",
  },
  {
    q: "What kind of hotels do you use?",
    a: "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request.",
  },
  {
    q: "Should I fly into Leh or drive up?",
    a: "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out.",
  },
  {
    q: "Do you book flights?",
    a: "You book the flight; we handle everything that happens after you land. Send us your flight times before you ticket and we will confirm they fit the itinerary. We time the airport pickup to your actual arrival, and if your connection slips we move the pickup at no charge.",
  },
  {
    q: "Is the Manali–Leh highway safe?",
    a: "It is a well-travelled route from roughly late May to mid-October, and our drivers run it weekly through the season. The road crosses five passes above 4,000 m, so we break the journey at Jispa and Sarchu rather than pushing through in a single day — that pacing is the biggest safety factor there is.",
  },
  {
    q: "Is the Srinagar–Leh road open all year?",
    a: "No. The Zoji La section typically opens from May to late October and closes with the first heavy snow. Outside that window we fly you into Leh and run the Ladakh half only, or move your dates — we will always tell you honestly rather than sell you a closed pass.",
  },
  {
    q: "Do you work with travel agents and B2B partners?",
    a: "Yes. We run ground operations in Ladakh for agencies across India. Use the partner page or contact us directly for partner rates and terms.",
  },
  {
    q: "What if something goes wrong during the trip?",
    a: "You have one WhatsApp thread and one named coordinator sitting in Leh for the whole trip. Passes close and plans change in Ladakh; what matters is that the person who picks up is here, and can reroute you the same day.",
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
        background="linear-gradient(180deg, rgba(7,15,31,0.42) 0%, rgba(7,15,31,0.92) 100%), radial-gradient(140% 120% at 30% 8%, #1e4fa8 0%, #101f3d 46%, #070f1f 100%)"
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
