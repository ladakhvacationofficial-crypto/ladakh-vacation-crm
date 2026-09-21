import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SITE, inr } from '@/lib/site';
import { PACKAGES } from '@/lib/packages';
import { DESTINATIONS } from '@/lib/destinations';
import { TRAVEL_STYLES } from '@/lib/travel-styles';
import { COLLECTIONS } from '@/lib/collections';
import { ORIGIN_CITIES } from '@/lib/origin-cities';
import { PackageCard, SectionHead, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = {
  title: 'All Tour Packages — Kashmir, Ladakh, Himachal & Vaishno Devi',
  description:
    'Every Ladakh Vacation tour package in one place. Kashmir, Ladakh, Himachal and Vaishno Devi itineraries with day-by-day plans, clear inclusions and GST-inclusive pricing from ₹9,500 per person.',
  alternates: { canonical: '/packages' },
};

export default function PackagesIndex() {
  const cheapest = Math.min(...PACKAGES.map((p) => p.priceFrom));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
        { '@type': 'ListItem', position: 2, name: 'Packages', item: `${SITE.domain}/packages` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Tour packages by Ladakh Vacation',
      numberOfItems: PACKAGES.length,
      itemListElement: PACKAGES.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${p.name} — ${p.nights} nights`,
        url: `${SITE.domain}/packages/${p.slug}`,
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`${PACKAGES.length} itineraries · from ${inr(cheapest)} per person`}
        title="Every package, honestly priced."
        lede="Day-by-day plans, real inclusions, and exclusions written plainly rather than buried. Each one is a starting point — tell us your dates and we reshape it around you."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Packages' }]}
        background="linear-gradient(180deg, rgba(7,15,31,0.42) 0%, rgba(7,15,31,0.92) 100%), radial-gradient(140% 120% at 30% 8%, #1e4fa8 0%, #101f3d 46%, #070f1f 100%)"
      />

      {/* jump links — client-free filtering by anchor keeps this fully static */}
      <nav
        aria-label="Filter packages by destination"
        className="sticky top-[68px] z-30 border-b border-paper-200 bg-paper-50/92 backdrop-blur-lg md:top-[80px]"
      >
        <div className="wrap scroll-x flex items-center gap-2 py-3">
          <span className="shrink-0 pr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Jump to
          </span>
          {DESTINATIONS.map((d) => (
            <a
              key={d.slug}
              href={`#${d.slug}`}
              className="shrink-0 rounded-full border border-paper-300 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
            >
              {d.name}
            </a>
          ))}
        </div>
      </nav>

      <div className="mesh-warm">
        {DESTINATIONS.map((dest) => {
          const list = PACKAGES.filter((p) => p.destination === dest.slug);
          if (list.length === 0) return null;
          return (
            <section
              key={dest.slug}
              id={dest.slug}
              className="section-sm scroll-mt-[132px] border-b border-paper-200 last:border-0 md:scroll-mt-[152px]"
            >
              <div className="wrap">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <SectionHead
                    kicker={`${list.length} ${list.length === 1 ? 'itinerary' : 'itineraries'}`}
                    title={dest.seoTitle}
                  />
                  <Link
                    href={`/destinations/${dest.slug}`}
                    data-reveal="right"
                    className="link-sweep text-[13.5px] font-medium text-gold-700"
                  >
                    Full {dest.name} guide →
                  </Link>
                </div>
                <div data-reveal-group className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <PackageCard key={p.slug} p={p} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/*
        Departure-city hub.
        These pages were orphaned on first ship — in the sitemap but with no
        internal link pointing at them, which means almost no link equity
        reached them and they would have taken months to rank. Link analysis
        is still a live ranking system; a page nothing links to is a page
        Google has little reason to trust. This block is the fix.
      */}
      <section className="section border-t border-paper-200">
        <div className="wrap">
          <SectionHead
            kicker="Departing from"
            title="Packages priced from your city."
            lede="Same land package, different airfare and a different first day. These pages carry the flight and rail picture from each city, and an itinerary built around when you actually land."
          />
          <div data-reveal-group className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORIGIN_CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/packages/from/${c.slug}`}
                className="lift group flex items-center justify-between gap-3 rounded-xl border border-paper-300 bg-paper-50 px-5 py-4 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <span>
                  <span className="display block text-[18px] text-ink-900">
                    Kashmir from {c.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-500">{c.state}</span>
                </span>
                <ArrowUpRight
                  className="arrow-slide size-4 shrink-0 text-gold-600"
                  strokeWidth={2.2}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison collections — the commercial queries people actually type. */}
      <section className="section border-t border-paper-200 bg-paper-100">
        <div className="wrap">
          <SectionHead
            kicker="Compare by"
            title="The questions people ask before booking."
            lede="Length, budget, who is travelling, whether flights are in. Each of these compares the relevant itineraries side by side rather than making you open six tabs."
          />
          <div data-reveal-group className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/packages/${c.slug}`}
                className="lift group rounded-xl border border-paper-300 bg-white p-5 transition-colors hover:border-gold-400"
              >
                <h3 className="display text-[18px] leading-snug text-ink-900">{c.h1}</h3>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
                  {c.lede}
                </p>
                <span className="mt-3 inline-block text-[12px] font-medium text-gold-700">
                  Compare &rarr;
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/routes"
              className="lift inline-flex items-center gap-2 rounded-xl border border-paper-300 bg-white px-5 py-3.5 text-[14px] font-medium text-ink-800 transition-colors hover:border-gold-400"
            >
              Getting here: route guides by train, flight and road
              <ArrowUpRight className="size-4 text-gold-600" strokeWidth={2.2} />
            </Link>
            <Link
              href="/guides"
              className="lift inline-flex items-center gap-2 rounded-xl border border-paper-300 bg-white px-5 py-3.5 text-[14px] font-medium text-ink-800 transition-colors hover:border-gold-400"
            >
              All travel guides
              <ArrowUpRight className="size-4 text-gold-600" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>

      {/* travel styles cross-link block */}
      <section className="section border-t border-paper-200">
        <div className="wrap">
          <SectionHead
            kicker="Not sure which fits?"
            title="Start from how you travel instead."
            lede="A honeymoon, a family trip with grandparents, and a fifteen-person offsite need different itineraries even to the same place."
          />
          <div data-reveal-group className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TRAVEL_STYLES.map((s) => (
              <Link
                key={s.slug}
                href={`/travel-styles/${s.slug}`}
                className="lift group rounded-xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <h3 className="display text-[19px] text-ink-900">{s.name}</h3>
                <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-600">
                  {s.headline}
                </p>
                <span className="mt-3 inline-block text-[12px] font-medium text-gold-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
