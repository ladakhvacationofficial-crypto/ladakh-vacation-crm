import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, X, Clock, MapPin, CalendarDays, Users, ArrowUpRight, Bed, Utensils, AlertTriangle } from 'lucide-react';
import { PACKAGES, getPackage, packagesFor } from '@/lib/packages';
import { COLLECTIONS, getCollection } from '@/lib/collections';
import { ORIGIN_CITIES } from '@/lib/origin-cities';
import { CollectionPage } from '@/components/collection-page';
import { getDestination, TONE_HERO } from '@/lib/destinations';
import { getTravelStyle } from '@/lib/travel-styles';
import { PackageCard, SectionHead, Faq, JsonLd } from '@/components/cards';
import { PageHero, FactStrip } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { StickyMobileCta } from '@/components/sticky-mobile-cta';
import { SITE, inr, whatsAppLink } from '@/lib/site';

type Params = Promise<{ slug: string }>;

/**
 * This route serves two page types on one flat URL space: individual packages
 * and curated collections (`/packages/leh-ladakh-road-trip-packages`).
 * Slugs are disjoint, so a package always wins the lookup and collections
 * fill in behind it. Keeping them flat matters — these collection slugs are
 * the exact commercial queries they target.
 */
export function generateStaticParams() {
  return [
    ...PACKAGES.map((p) => ({ slug: p.slug })),
    ...COLLECTIONS.map((c) => ({ slug: c.slug })),
  ];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPackage(slug);

  if (!p) {
    const c = getCollection(slug);
    if (!c) return {};
    return {
      title: c.seoTitle,
      description: c.metaDescription,
      alternates: { canonical: `/packages/${c.slug}` },
      openGraph: {
        title: c.seoTitle,
        description: c.metaDescription,
        url: `${SITE.domain}/packages/${c.slug}`,
        type: 'website',
      },
    };
  }

  const title = `${p.name} — ${p.nights} Nights ${p.days} Days ${p.destinationName} Package from ${inr(p.priceFrom)}`;
  const description = `${p.summary} Day-by-day itinerary, clear inclusions and exclusions, pricing from ${inr(p.priceFrom)} per person. Route: ${p.route.join(' → ')}.`;

  return {
    title,
    description,
    alternates: { canonical: `/packages/${p.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE.domain}/packages/${p.slug}`,
      type: 'website',
    },
  };
}

export default async function PackageDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const p = getPackage(slug);

  if (!p) {
    const c = getCollection(slug);
    if (c) return <CollectionPage c={c} />;
    notFound();
  }

  const dest = getDestination(p.destination);
  const url = `${SITE.domain}/packages/${p.slug}`;
  const related = packagesFor(p.destination).filter((x) => x.slug !== p.slug).slice(0, 3);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      '@id': `${url}#trip`,
      name: p.name,
      description: p.summary,
      url,
      provider: { '@id': `${SITE.domain}/#org` },
      touristType: p.styles,
      itinerary: {
        '@type': 'ItemList',
        numberOfItems: p.itinerary.length,
        itemListElement: p.itinerary.map((day) => ({
          '@type': 'ListItem',
          position: day.day,
          item: {
            '@type': 'TouristAttraction',
            name: day.title,
            description: day.body,
          },
        })),
      },
      image: [p.image],
      author: {
        '@type': 'Organization',
        name: SITE.name,
        url: SITE.domain,
      },
      offers: {
        '@type': 'Offer',
        price: p.priceFrom,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url,
        description: `Per person on twin-sharing. ${p.nights} nights / ${p.days} days.`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Packages', item: `${SITE.domain}/packages` },
        { '@type': 'ListItem', position: 3, name: p.name, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`${p.destinationName} · ${p.nights} Nights / ${p.days} Days`}
        title={p.name}
        lede={p.summary}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Packages', href: '/packages' },
          { label: p.name },
        ]}
        background={TONE_HERO[p.tone]}
        heroImage={p.image}
        heroImageAlt={`${p.name} — ${p.nights} Nights ${p.days} Days ${p.destinationName} Tour Package`}
      >
        <FactStrip
          facts={[
            ['Duration', `${p.nights} nights / ${p.days} days`],
            ['Route', p.route.join(' → ')],
            ['Best months', p.bestMonths],
            ['From', `${inr(p.priceFrom)} per person`],
          ]}
        />
      </PageHero>

      <div className="mesh-warm">
        <div className="wrap section-sm grid gap-12 lg:grid-cols-12">
          {/* ───────────── main column */}
          <div className="lg:col-span-8">
            {/* route ribbon */}
            <div data-reveal className="scroll-x flex items-center gap-2 pb-3">
              {p.route.map((stop, i) => (
                <span key={`${stop}-${i}`} className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-paper-300 bg-paper-50 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-700">
                    {stop}
                  </span>
                  {i < p.route.length - 1 && (
                    <span aria-hidden className="text-paper-400">
                      —
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Byline: the team that plans and runs the trip */}
            <div data-reveal className="mt-4 flex items-center gap-3 rounded-xl border border-paper-300 bg-paper-50/80 px-4 py-3 text-[12.5px] text-ink-600">
              <div className="grid size-8 place-items-center rounded-full bg-gold-400 font-bold text-ink-950 text-[12px] shadow-sm">
                LV
              </div>
              <div>
                <p className="font-semibold text-ink-900 leading-none">
                  Planned and run by the {SITE.name} team in Leh
                </p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Sequenced by altitude · all permits handled · private 4×4 with a Ladakhi driver
                </p>
              </div>
            </div>

            <div data-reveal className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-ink-600">
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-gold-600" strokeWidth={1.9} />
                {p.nights} nights / {p.days} days
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-gold-600" strokeWidth={1.9} />
                {p.bestMonths}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-gold-600" strokeWidth={1.9} />
                {p.idealFor}
              </span>
            </div>

            {/* ───────────── itinerary */}
            <section className="mt-14">
              <p className="kicker">Day by day</p>
              <h2 className="display d3 mt-2 text-ink-900">
                The whole itinerary, nothing withheld.
              </h2>

              <ol className="mt-9 space-y-0">
                {p.itinerary.map((day, i) => (
                  <li key={day.day} data-reveal className="group relative flex gap-5 pb-9 last:pb-0">
                    {/* timeline rail */}
                    <div className="flex flex-col items-center">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-gold-300 bg-paper-50 text-[12px] font-bold text-gold-700 transition-all duration-500 group-hover:border-gold-500 group-hover:bg-gold-400 group-hover:text-ink-950">
                        {day.day}
                      </span>
                      {i < p.itinerary.length - 1 && (
                        <span
                          aria-hidden
                          className="mt-1 w-px flex-1 bg-gradient-to-b from-gold-300 to-paper-300"
                        />
                      )}
                    </div>

                    <div className="flex-1 pt-1.5">
                      <h3 className="display text-[21px] leading-snug text-ink-900">
                        {day.title}
                      </h3>
                      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">
                        {day.body}
                      </p>
                      {(day.stay || day.meals) && (
                        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-500">
                          {day.stay && (
                            <span className="inline-flex items-center gap-1.5">
                              <Bed className="size-3.5 text-gold-600" strokeWidth={2} />
                              {day.stay}
                            </span>
                          )}
                          {day.meals && (
                            <span className="inline-flex items-center gap-1.5">
                              <Utensils className="size-3.5 text-gold-600" strokeWidth={2} />
                              {day.meals}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* ───────────── inclusions / exclusions */}
            <section className="mt-16 grid gap-5 md:grid-cols-2" data-reveal>
              <div className="rounded-2xl border border-pine-200 bg-pine-50 p-6">
                <h2 className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-pine-700">
                  <Check className="size-4" strokeWidth={2.6} />
                  What&rsquo;s included
                </h2>
                <ul className="mt-5 space-y-3">
                  {p.inclusions.map((inc) => (
                    <li key={inc} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-pine-500" strokeWidth={2.4} />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-paper-300 bg-paper-100 p-6">
                <h2 className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-600">
                  <X className="size-4" strokeWidth={2.6} />
                  Not included
                </h2>
                <ul className="mt-5 space-y-3">
                  {p.exclusions.map((exc) => (
                    <li key={exc} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-600">
                      <X className="mt-0.5 size-4 shrink-0 text-paper-400" strokeWidth={2.4} />
                      {exc}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-paper-300 pt-4 text-[12px] leading-relaxed text-ink-500">
                  We list exclusions plainly rather than burying them. If something
                  here matters to you, ask &mdash; most can be added to the quote.
                </p>
              </div>
            </section>

            {/* ───────────── honest travel advisory / who this trip is not for */}
            <section className="mt-14 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 md:p-8" data-reveal>
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <AlertTriangle className="size-5" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="kicker !text-amber-800">Honest Travel Advisory</p>
                  <h2 className="display text-[22px] font-semibold text-ink-900 mt-1">
                    Who this {p.name} itinerary is NOT for
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-700">
                    We believe in transparent expectations before booking rather than surprises after landing. This trip may not suit you if:
                  </p>
                  <ul className="mt-4 space-y-2.5 text-[13.5px] text-ink-800">
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-700 font-bold">•</span>
                      <span><strong>Anyone who wants to rush the altitude:</strong> We will not move the high passes or Pangong earlier to fit more in. The first afternoon in Leh stays empty on every route.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-700 font-bold">•</span>
                      <span><strong>Travellers who need to stay connected everywhere:</strong> Prepaid SIMs from other states generally do not work in Ladakh, and coverage is patchy or absent at Pangong, Hanle and on the high passes. Postpaid connections work in Leh.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-amber-700 font-bold">•</span>
                      <span><strong>Anyone with a cardiac or pulmonary condition:</strong> Speak to your doctor before booking anything at this altitude, and then to us. We will build the gentlest route that is safe for you.</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-[12px] text-ink-600 border-t border-amber-200/80 pt-3">
                    If any of these apply to your party, speak to us. We will adapt the route, add rest days, or suggest a lower-altitude itinerary.
                  </p>
                </div>
              </div>
            </section>

            {/* ───────────── faqs */}
            <section className="mt-16" data-reveal>
              <p className="kicker">Before you book</p>
              <h2 className="display d3 mb-8 mt-2 text-ink-900">
                Questions on this itinerary.
              </h2>
              <Faq items={p.faqs} />
            </section>
          </div>

          {/* ───────────── sticky sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[104px]">
              <div className="overflow-hidden rounded-2xl border border-paper-300 bg-white shadow-lg">
                <div
                  className="relative px-6 py-7"
                  style={{ background: TONE_HERO[p.tone] }}
                >
                  <div aria-hidden className="grain absolute inset-0" />
                  <p className="relative text-[10.5px] uppercase tracking-[0.16em] text-paper-200/70">
                    Starting from
                  </p>
                  <p className="display relative mt-1.5 text-[40px] leading-none text-paper-50">
                    {inr(p.priceFrom)}
                  </p>
                  <p className="relative mt-2 text-[12px] text-paper-200/70">
                    per person · twin-sharing
                  </p>
                </div>

                <div className="p-6">
                  <dl className="space-y-3 text-[13px]">
                    {[
                      ['Duration', `${p.nights}N / ${p.days}D`],
                      ['Destination', p.destinationName],
                      ['Best months', p.bestMonths],
                      ['Stops', `${p.route.length} locations`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 border-b border-paper-200 pb-3 last:border-0 last:pb-0">
                        <dt className="text-ink-500">{k}</dt>
                        <dd className="text-right font-medium text-ink-900">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 grid gap-2.5">
                    <a
                      href={whatsAppLink(`the ${p.name} package (${p.nights}N/${p.days}D)`)}
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
                    Prices vary by season, hotel category and group size. We quote
                    exactly, not approximately.
                  </p>
                </div>
              </div>

              {p.styles.length > 0 && (
                <div className="mt-5 rounded-2xl border border-paper-300 bg-paper-100 p-5">
                  <p className="kicker">Good for</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.styles.map((s) => {
                      const style = getTravelStyle(s);
                      if (!style) {
                        return (
                          <span
                            key={s}
                            className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] capitalize text-ink-600"
                          >
                            {s.replace('-', ' ')}
                          </span>
                        );
                      }
                      return (
                        <Link
                          key={s}
                          href={`/travel-styles/${style.slug}`}
                          className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] text-ink-600 transition-all duration-200 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
                        >
                          {style.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {dest && (
                <Link
                  href={`/destinations/${dest.slug}`}
                  className="lift group mt-5 flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
                >
                  <div>
                    <p className="kicker">Destination guide</p>
                    <p className="display mt-1.5 text-[19px] text-ink-900">
                      {dest.seoTitle}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="arrow-slide size-5 shrink-0 text-gold-600"
                    strokeWidth={2}
                  />
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ───────────── related */}
      {related.length > 0 && (
        <section className="section border-t border-paper-200 bg-paper-100">
          <div className="wrap">
            <SectionHead
              kicker="You might also like"
              title={`Other ${p.destinationName} itineraries.`}
            />
            <div data-reveal-group className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <PackageCard key={r.slug} p={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/*
        Contextual cross-links. Package pages carry the most internal link
        equity on the site, so this is the most effective place to pass it
        down to the departure-city and comparison pages — which otherwise
        sit orphaned and rank slowly regardless of how good they are.
      */}
      <section className="section-sm border-t border-paper-200">
        <div className="wrap">
          <p className="kicker" data-reveal>
            Planning this trip
          </p>
          <div data-reveal-group className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ORIGIN_CITIES.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/packages/from/${c.slug}`}
                className="lift group flex items-center justify-between gap-3 rounded-xl border border-paper-300 bg-paper-50 px-5 py-4 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <span className="text-[14px] text-ink-800">
                  Travelling from <span className="font-medium">{c.name}</span>?
                </span>
                <ArrowUpRight
                  className="arrow-slide size-4 shrink-0 text-gold-600"
                  strokeWidth={2.2}
                />
              </Link>
            ))}
          </div>
          <div data-reveal className="mt-3 flex flex-wrap gap-2.5">
            {COLLECTIONS.map((c) => (
              <Link
                key={c.slug}
                href={`/packages/${c.slug}`}
                className="rounded-full border border-paper-300 bg-white px-4 py-2 text-[13px] text-ink-600 transition-colors hover:border-gold-400 hover:text-gold-700"
              >
                {c.crumbLabel}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── enquiry */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-6%] top-[6%] h-[400px] w-[400px]"
          style={{ background: 'rgba(201,169,97,0.15)' }}
        />
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Customise this trip</p>
            <h2 className="display d2 mt-3 text-paper-50">
              This is the template. Yours will be different.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              Add a night, swap a hotel category, start from a different city,
              travel with fifteen people instead of two. Tell us what changes and
              we rebuild the itinerary and the quote around it.
            </p>
            <div className="mt-8">
              <MapPin className="mb-3 size-5 text-gold-300" strokeWidth={1.8} />
              <p className="text-[13.5px] leading-relaxed text-paper-200/60">
                Every quote comes from our team in Leh, from the planner who will
                actually run your trip.
              </p>
            </div>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8" id="enquiry">
            <EnquiryForm
              source={`package_${p.slug}`}
              packageName={p.name}
              destination={p.destinationName}
              light
            />
          </div>
        </div>
      </section>

      <StickyMobileCta packageName={p.name} priceFrom={p.priceFrom} />
    </>
  );
}
