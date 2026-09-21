import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Users, Star, Clock } from 'lucide-react';
import { SITE } from '@/lib/site';
import { SectionHead, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';

export const metadata: Metadata = {
  title: 'About Us — A Srinagar-Based Himalayan DMC',
  description: `Ladakh Vacation is a destination management company based in Hawal, Srinagar. Founded ${SITE.founded}, ${SITE.stats.guests} guests hosted across Kashmir, Ladakh, Himachal and Vaishno Devi.`,
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    n: '01',
    t: 'We answer our own phone',
    b: 'No call centre, no ticketing queue. The specialist who quotes your trip is the one who runs it and the one who picks up when you call from a mountain road.',
  },
  {
    n: '02',
    t: 'We would rather lose the booking',
    b: 'If your dates are wrong for what you want, we say so. Some of our best reviews are from people we talked out of travelling — they came back in a better month.',
  },
  {
    n: '03',
    t: 'We only sell what we know',
    b: 'Four destinations, not forty. Every hotel slept in, every road driven, every operator known personally. It is a smaller catalogue and a much better trip.',
  },
  {
    n: '04',
    t: 'The price is the price',
    b: 'GST included, exclusions listed plainly, no surprise charges at a barrier gate. If we quote it, that is what you pay.',
  },
];

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE.name}`,
    url: `${SITE.domain}/about`,
    mainEntity: { '@id': `${SITE.domain}/#org` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`Founded ${SITE.founded} · Hawal, Srinagar`}
        title="Locals who fell in love with hosting."
        lede="We started because we were tired of watching agencies a thousand miles away mis-sell our own valley to people who deserved better."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
        background="linear-gradient(180deg, rgba(6,12,16,0.40) 0%, rgba(6,12,16,0.92) 100%), radial-gradient(140% 120% at 26% 8%, #3b7183 0%, #17384a 46%, #060e14 100%)"
      />

      <section className="section-sm mesh-warm">
        <div className="wrap grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7" data-reveal>
            <div className="space-y-5">
              <p className="text-[17.5px] leading-[1.75] text-ink-800">
                Ladakh Vacation started in {SITE.founded} when a few Srinagar friends
                grew tired of watching agencies from Delhi and Mumbai sell our valley
                to visitors who then arrived to find the itinerary did not match the
                place. We opened a small office in Hawal, bought one Innova, and
                started arranging trips for friends of friends.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink-600">
                Twelve years and {SITE.stats.guests} guests later we still work the same
                way. We answer every enquiry ourselves. We host every itinerary
                ourselves. We stand behind every hotel we book, because someone on
                this team has slept in it. When you message us at 11pm from Gulmarg,
                you are texting the same people who quoted your trip.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink-600">
                We now run Kashmir, Ladakh, Himachal and Vaishno Devi. Different
                geographies, same principle: local hands, local knowledge, and
                pricing you can read without a magnifying glass.
              </p>
              <p className="text-[15.5px] leading-[1.8] text-ink-600">
                What we are not is a marketplace. We do not list four hundred hotels
                we have never visited or sell packages to states we have never worked
                in. Four destinations is a deliberate limit, and it is the reason we
                can answer a question about a specific road on a specific week
                without checking.
              </p>
            </div>
          </div>

          <aside className="md:col-span-5" data-reveal="right">
            <div className="rounded-2xl border border-paper-300 bg-paper-100 p-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-700">
                At a glance
              </h2>
              <dl className="mt-5 space-y-4">
                {[
                  [Clock, 'Founded', `${SITE.founded}, Srinagar`],
                  [Users, 'Guests hosted', `${SITE.stats.guests} and counting`],
                  [Star, 'Rating', `${SITE.stats.rating} from ${SITE.stats.reviewCount} reviews`],
                  [MapPin, 'Coverage', 'Kashmir · Ladakh · Himachal · Vaishno Devi'],
                ].map(([Icon, k, v]) => {
                  const I = Icon as typeof Clock;
                  return (
                    <div key={k as string} className="flex gap-3.5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-gold-100 text-gold-700">
                        <I className="size-4" strokeWidth={1.9} />
                      </span>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-500">
                          {k as string}
                        </dt>
                        <dd className="mt-0.5 text-[14px] font-medium text-ink-900">
                          {v as string}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-6 border-t border-paper-300 pt-5">
                <p className="text-[13px] leading-relaxed text-ink-600">
                  {SITE.address.street}, {SITE.address.city}
                  <br />
                  {SITE.address.region} {SITE.address.postalCode}
                </p>
                <p className="mt-3 text-[13px] text-ink-600">{SITE.hours}</p>
                <Link href="/contact" className="btn btn-gold mt-5 w-full">
                  Talk to us
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-8%] top-[8%] h-[420px] w-[420px]"
          style={{ background: 'rgba(232,185,35,0.14)' }}
        />
        <div className="wrap relative">
          <SectionHead light kicker="How we work" title="Four rules we do not bend." />
          <div data-reveal-group className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.n} className="group">
                <span className="display text-[13px] tabular-nums text-gold-300/50">
                  {v.n}
                </span>
                <h3 className="display mt-3 text-[24px] leading-snug text-paper-50">
                  {v.t}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-paper-200/70">
                  {v.b}
                </p>
                <div className="mt-6 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold-400 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-t border-paper-200 bg-paper-100">
        <div className="wrap grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <SectionHead
              kicker="Say hello"
              title="Ask us something specific."
              lede="Not a generic enquiry form response. Ask about a road, a hotel, a month, a route — the more specific the question, the more useful our answer."
            />
          </div>
          <div data-reveal="right" className="rounded-2xl border border-paper-300 bg-white p-6 shadow-md md:p-8">
            <EnquiryForm source="about_page" />
          </div>
        </div>
      </section>
    </>
  );
}
