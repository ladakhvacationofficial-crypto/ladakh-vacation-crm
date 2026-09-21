import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertCircle, ArrowUpRight, ExternalLink, MapPin, Plane, TrainFront, Car,
} from 'lucide-react';
import { ROUTES, getRoute } from '@/lib/routes';
import { getOriginCity } from '@/lib/origin-cities';
import { TONE_HERO } from '@/lib/destinations';
import { Faq, JsonLd } from '@/components/cards';
import { PageHero, FactStrip } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE } from '@/lib/site';

type Params = Promise<{ slug: string }>;

const MODE_ICON = { flight: Plane, train: TrainFront, road: Car } as const;

export function generateStaticParams() {
  return ROUTES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoute(slug);
  if (!r) return {};

  return {
    title: r.seoTitle,
    description: r.metaDescription,
    alternates: { canonical: `/routes/${r.slug}` },
    openGraph: {
      title: r.seoTitle,
      description: r.metaDescription,
      url: `${SITE.domain}/routes/${r.slug}`,
      type: 'article',
    },
  };
}

export default async function RoutePage({ params }: { params: Params }) {
  const { slug } = await params;
  const r = getRoute(slug);
  if (!r) notFound();

  const url = `${SITE.domain}/routes/${r.slug}`;
  const originCity = r.originCitySlug ? getOriginCity(r.originCitySlug) : undefined;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: r.h1,
      description: r.metaDescription,
      url,
      author: { '@id': `${SITE.domain}/#org` },
      publisher: { '@id': `${SITE.domain}/#org` },
      dateModified: r.verifiedOnISO,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: r.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Routes', item: `${SITE.domain}/routes` },
        { '@type': 'ListItem', position: 3, name: r.h1, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`${r.origin} → ${r.destination}`}
        title={r.h1}
        lede={r.lede}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Routes', href: '/routes' },
          { label: `${r.origin} to ${r.destination}` },
        ]}
        background={TONE_HERO.valley}
      >
        <FactStrip
          facts={[
            ['Modes compared', String(r.modes.length)],
            ['Fastest', r.modes[0]?.time ?? '—'],
            ['Verified', r.verifiedOn],
            ['Operated by', 'Our own Srinagar office'],
          ]}
        />
      </PageHero>

      <div className="mesh-warm">
        <div className="wrap section-sm grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {/* ── direct answer, before any mode detail */}
            <section data-reveal>
              <div className="rounded-2xl border border-paper-300 bg-white p-7 shadow-lg md:p-8">
                <p className="kicker">The short answer</p>
                <p className="display mt-2.5 text-[26px] leading-snug text-ink-900">
                  {r.answer.verdict}
                </p>
                <p className="mt-4 text-[15.5px] leading-[1.75] text-ink-600">
                  {r.answer.body}
                </p>
              </div>
            </section>

            {/* ── comparison table */}
            <section className="mt-14" data-reveal>
              <p className="kicker">Side by side</p>
              <h2 className="display d3 mt-2 text-ink-900">
                {r.origin} to {r.destination}, compared.
              </h2>
              <div className="scroll-x mt-7 overflow-x-auto rounded-2xl border border-paper-300 bg-white">
                <table className="w-full min-w-[560px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-paper-300 bg-paper-100">
                      <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                        Mode
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                        Time
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                        Cost
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                        Right for
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.modes.map((m, i) => {
                      const Icon = MODE_ICON[m.key];
                      return (
                        <tr key={m.key} className={i < r.modes.length - 1 ? 'border-b border-paper-200' : ''}>
                          <th scope="row" className="whitespace-nowrap px-5 py-4 align-top font-medium text-ink-900">
                            <span className="inline-flex items-center gap-2">
                              <Icon className="size-4 text-gold-600" strokeWidth={2.1} />
                              {m.label}
                            </span>
                          </th>
                          <td className="whitespace-nowrap px-5 py-4 align-top text-ink-700">{m.time}</td>
                          <td className="whitespace-nowrap px-5 py-4 align-top text-ink-700">{m.cost}</td>
                          <td className="px-5 py-4 align-top leading-relaxed text-ink-600">{m.verdict}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/*
              One self-contained section per mode. Each must answer its own
              query without depending on the sections above it — that is what
              lets passage ranking lift "delhi to srinagar train" out of a page
              whose H1 is broader.
            */}
            {r.modes.map((m) => {
              const Icon = MODE_ICON[m.key];
              return (
                <section
                  key={m.key}
                  id={`${r.origin.toLowerCase()}-to-${r.destination.toLowerCase()}-${m.key}`}
                  className="mt-16 scroll-mt-24"
                  data-reveal
                >
                  <p className="kicker inline-flex items-center gap-2">
                    <Icon className="size-4 text-gold-600" strokeWidth={2.1} />
                    {m.label}
                  </p>
                  <h2 className="display d3 mt-2 text-ink-900">
                    {r.origin} to {r.destination} {m.label.toLowerCase()}
                  </h2>

                  {m.headline && (
                    <aside className="mt-6 flex gap-4 rounded-2xl border border-gold-300 bg-gold-50 p-6">
                      <AlertCircle className="mt-0.5 size-5 shrink-0 text-gold-600" strokeWidth={2} />
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-700">
                          {m.headline.title}
                        </p>
                        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
                          {m.headline.body}
                        </p>
                      </div>
                    </aside>
                  )}

                  <div className="mt-6 space-y-4">
                    {m.body.map((para) => (
                      <p key={para.slice(0, 40)} className="text-[15px] leading-relaxed text-ink-600">
                        {para}
                      </p>
                    ))}
                  </div>

                  <div className="scroll-x mt-7 overflow-x-auto rounded-2xl border border-paper-300 bg-white">
                    <table className="w-full min-w-[420px] text-[14px]">
                      <tbody>
                        {m.facts.map((f, i) => (
                          <tr key={f.label} className={i < m.facts.length - 1 ? 'border-b border-paper-200' : ''}>
                            <th scope="row" className="w-[46%] px-5 py-3.5 text-left align-top font-normal text-ink-500">
                              {f.label}
                            </th>
                            <td className="px-5 py-3.5 align-top font-medium text-ink-900">{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {m.sources && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-500">
                      <span>Verified {r.verifiedOn}:</span>
                      {m.sources.map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gold-700 underline underline-offset-2 hover:text-gold-800"
                        >
                          {s.label}
                          <ExternalLink className="size-3" strokeWidth={2} />
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            <section className="mt-16" data-reveal>
              <p className="kicker">Questions</p>
              <h2 className="display d3 mb-8 mt-2 text-ink-900">
                {r.origin} to {r.destination}, answered.
              </h2>
              <Faq items={r.faqs} />
            </section>
          </div>

          {/* ── sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[104px] grid gap-5">
              <div className="rounded-2xl border border-paper-300 bg-white p-6 shadow-lg">
                <p className="kicker">Once you arrive</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
                  Getting here is the easy half. Tell us your arrival time and
                  we will have someone waiting, and an itinerary that starts the
                  moment you land rather than the next morning.
                </p>
                <div className="mt-6 grid gap-2.5">
                  <Link href="/packages" className="btn btn-gold btn-shine w-full">
                    See Kashmir packages
                  </Link>
                  <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost w-full">
                    Call {SITE.phone.display}
                  </a>
                </div>
              </div>

              {originCity && (
                <Link
                  href={`/packages/from/${originCity.slug}`}
                  className="lift group flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
                >
                  <div>
                    <p className="kicker">Packages</p>
                    <p className="display mt-1.5 text-[19px] text-ink-900">
                      From {originCity.name}
                    </p>
                  </div>
                  <ArrowUpRight className="arrow-slide size-5 shrink-0 text-gold-600" strokeWidth={2} />
                </Link>
              )}

              <Link
                href="/packages/vaishno-devi-kashmir-7-nights"
                className="lift group flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <div>
                  <p className="kicker">Break the journey</p>
                  <p className="display mt-1.5 text-[19px] text-ink-900">
                    Vaishno Devi &amp; Kashmir
                  </p>
                </div>
                <ArrowUpRight className="arrow-slide size-5 shrink-0 text-gold-600" strokeWidth={2} />
              </Link>

              {ROUTES.length > 1 && (
                <div className="rounded-2xl border border-paper-300 bg-paper-100 p-5">
                  <p className="kicker">Other routes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ROUTES.filter((x) => x.slug !== r.slug).map((x) => (
                      <Link
                        key={x.slug}
                        href={`/routes/${x.slug}`}
                        className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] text-ink-600 transition-all duration-200 hover:border-gold-400 hover:bg-white hover:text-gold-700"
                      >
                        {x.h1}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-6%] top-[6%] h-[400px] w-[400px]"
          style={{ background: 'rgba(201,169,97,0.15)' }}
        />
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Plan the whole trip</p>
            <h2 className="display d2 mt-3 text-paper-50">
              We do not sell tickets. We run everything after them.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              Book the rail leg yourself through IRCTC — there is no markup to
              pay us for that. Send us the arrival time and we will build the
              itinerary around it.
            </p>
            <div className="mt-8">
              <MapPin className="mb-3 size-5 text-gold-300" strokeWidth={1.8} />
              <p className="text-[13.5px] leading-relaxed text-paper-200/60">
                {SITE.address.street}, {SITE.address.city} — {SITE.stats.rating}★ from{' '}
                {SITE.stats.reviewCount} Google reviews.
              </p>
            </div>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8" id="enquiry">
            <EnquiryForm source={`route_${r.slug}`} destination="Kashmir" light />
          </div>
        </div>
      </section>
    </>
  );
}
