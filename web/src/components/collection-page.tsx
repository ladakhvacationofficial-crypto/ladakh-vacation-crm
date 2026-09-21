import Link from 'next/link';
import { Info, ArrowUpRight, MapPin } from 'lucide-react';
import type { Collection } from '@/lib/collections';
import { getPackage } from '@/lib/packages';
import { TONE_HERO } from '@/lib/destinations';
import { PackageCard, Faq, JsonLd } from '@/components/cards';
import { PageHero, FactStrip } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { StickyMobileCta } from '@/components/sticky-mobile-cta';
import { SITE, inr, whatsAppLink } from '@/lib/site';

/**
 * Renders a package collection — a curated listing that answers one
 * commercial query. Shares the visual language of the package detail page so
 * the two read as the same site, but leads with editorial rather than an
 * itinerary, because the job here is to help someone choose.
 */
export function CollectionPage({ c }: { c: Collection }) {
  const packages = c.packages
    .map((s) => getPackage(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const cheapest = packages.reduce(
    (min, p) => (p.priceFrom < min ? p.priceFrom : min),
    Infinity,
  );
  const basePath = c.basePath ?? '/packages';
  const url = `${SITE.domain}${basePath}/${c.slug}`;

  const parentCrumb = basePath.includes('honeymoon')
    ? { label: 'Honeymoon', href: '/travel-styles/honeymoon' }
    : { label: 'Packages', href: '/packages' };

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: c.h1,
      description: c.metaDescription,
      url,
      provider: { '@id': `${SITE.domain}/#org` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: packages.length,
        itemListElement: packages.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'TouristTrip',
            name: p.name,
            description: p.summary,
            url: `${SITE.domain}/packages/${p.slug}`,
            offers: {
              '@type': 'Offer',
              price: p.priceFrom,
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
            },
          },
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: parentCrumb.label, item: `${SITE.domain}${parentCrumb.href}` },
        { '@type': 'ListItem', position: 3, name: c.crumbLabel, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={c.kicker}
        title={c.h1}
        lede={c.lede}
        crumbs={[
          { label: 'Home', href: '/' },
          parentCrumb,
          { label: c.crumbLabel },
        ]}
        background={TONE_HERO[c.tone]}
        heroImage={packages[0]?.image}
        heroImageAlt={`${c.h1} — Ladakh Vacation`}
      >
        <FactStrip
          facts={[
            ['From', `${inr(cheapest)} per person`],
            ['Itineraries', `${packages.length} to compare`],
            ['Pricing', 'Twin-sharing · GST included'],
            ['Operated by', 'Our own Srinagar office'],
          ]}
        />
      </PageHero>

      <div className="mesh-warm">
        <div className="wrap section-sm grid gap-12 lg:grid-cols-12">
          {/* ───────────── main column */}
          <div className="lg:col-span-8">
            <section data-reveal>
              <div className="space-y-5">
                {c.body.map((para) => (
                  <p key={para.slice(0, 40)} className="text-[15px] leading-relaxed text-ink-600">
                    {para}
                  </p>
                ))}
              </div>
            </section>

            {c.compare && (
              <aside
                data-reveal
                className="mt-10 flex gap-4 rounded-2xl border border-gold-200 bg-gold-50 p-6"
              >
                <Info className="mt-0.5 size-5 shrink-0 text-gold-600" strokeWidth={2} />
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-700">
                    {c.compare.heading}
                  </p>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
                    {c.compare.note}
                  </p>
                </div>
              </aside>
            )}

            <section className="mt-16" data-reveal>
              <p className="kicker">Itineraries</p>
              <h2 className="display d3 mt-2 text-ink-900">Compare them side by side.</h2>
              <div data-reveal-group className="mt-9 grid gap-5 md:grid-cols-2">
                {packages.map((p) => (
                  <PackageCard key={p.slug} p={p} />
                ))}
              </div>
            </section>

            <section className="mt-16" data-reveal>
              <p className="kicker">Before you book</p>
              <h2 className="display d3 mb-8 mt-2 text-ink-900">The questions that matter here.</h2>
              <Faq items={c.faqs} />
            </section>
          </div>

          {/* ───────────── sticky sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[104px]">
              <div className="overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-lg">
                <div className="relative px-6 py-7" style={{ background: TONE_HERO[c.tone] }}>
                  <div aria-hidden className="grain absolute inset-0" />
                  <p className="relative text-[10.5px] uppercase tracking-[0.16em] text-paper-200/70">
                    Starting from
                  </p>
                  <p className="display relative mt-1.5 text-[40px] leading-none text-paper-50">
                    {inr(cheapest)}
                  </p>
                  <p className="relative mt-2 text-[12px] text-paper-200/70">
                    per person · twin-sharing · GST included
                  </p>
                </div>

                <div className="p-6">
                  <p className="text-[13.5px] leading-relaxed text-ink-600">
                    Every price on this page is the real, complete land cost —
                    not a teaser that grows when you enquire. Exclusions are
                    published on each package page rather than buried.
                  </p>

                  <div className="mt-6 grid gap-2.5">
                    <a
                      href={whatsAppLink(c.h1.toLowerCase())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-gold btn-shine w-full"
                    >
                      Get a custom quote
                    </a>
                    <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost w-full">
                      Call {SITE.phone.display}
                    </a>
                  </div>

                  <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-500">
                    {SITE.stats.rating}★ from {SITE.stats.reviewCount} Google reviews.
                  </p>
                </div>
              </div>

              <Link
                href="/packages"
                className="lift group mt-5 flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <div>
                  <p className="kicker">See everything</p>
                  <p className="display mt-1.5 text-[19px] text-ink-900">All packages</p>
                </div>
                <ArrowUpRight className="arrow-slide size-5 shrink-0 text-gold-600" strokeWidth={2} />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ───────────── enquiry */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-6%] top-[6%] h-[400px] w-[400px]"
          style={{ background: 'rgba(232,185,35,0.15)' }}
        />
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Not quite it?</p>
            <h2 className="display d2 mt-3 text-paper-50">
              These are templates. Yours will be different.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              Add a night, change the hotel category, start from another city,
              travel with fifteen people instead of two. Tell us what changes and
              we rebuild the itinerary and the quote around it.
            </p>
            <div className="mt-8">
              <MapPin className="mb-3 size-5 text-gold-300" strokeWidth={1.8} />
              <p className="text-[13.5px] leading-relaxed text-paper-200/60">
                {SITE.address.street}, {SITE.address.city} — every quote comes
                from the specialist who will actually run your trip.
              </p>
            </div>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8" id="enquiry">
            <EnquiryForm source={`collection_${c.slug}`} destination="Kashmir" light />
          </div>
        </div>
      </section>

      <StickyMobileCta packageName={c.h1} priceFrom={cheapest} />
    </>
  );
}
