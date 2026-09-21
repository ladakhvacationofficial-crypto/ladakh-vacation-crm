import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Snowflake, Thermometer, Wallet, Users, PackageOpen, Ban, ArrowUpRight } from 'lucide-react';
import { MONTH_HUBS, getMonthHub, type MonthVerdict } from '@/lib/month-hubs';
import { getPackage } from '@/lib/packages';
import { TONE_HERO } from '@/lib/destinations';
import { PackageCard, Faq, JsonLd } from '@/components/cards';
import { PageHero, FactStrip } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE } from '@/lib/site';

type Params = Promise<{ slug: string }>;

const VERDICT: Record<MonthVerdict, { label: string; cls: string; dot: string }> = {
  best: { label: 'Best', cls: 'bg-pine-100 text-pine-700 border-pine-200', dot: 'bg-pine-500' },
  good: { label: 'Good', cls: 'bg-gold-50 text-gold-700 border-gold-200', dot: 'bg-gold-500' },
  mixed: { label: 'Mixed', cls: 'bg-paper-100 text-ink-600 border-paper-300', dot: 'bg-paper-400' },
  avoid: { label: 'Avoid', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

export function generateStaticParams() {
  return MONTH_HUBS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const h = getMonthHub(slug);
  if (!h) return {};
  return {
    title: h.seoTitle,
    description: h.metaDescription,
    alternates: { canonical: `/guides/by-month/${h.slug}` },
    openGraph: {
      title: h.seoTitle,
      description: h.metaDescription,
      url: `${SITE.domain}/guides/by-month/${h.slug}`,
      type: 'article',
    },
  };
}

export default async function MonthHubPage({ params }: { params: Params }) {
  const { slug } = await params;
  const h = getMonthHub(slug);
  if (!h) notFound();

  const url = `${SITE.domain}/guides/by-month/${h.slug}`;
  const pkgs = h.packages
    .map((s) => getPackage(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: h.h1,
      description: h.metaDescription,
      url,
      author: { '@type': 'Person', name: h.author.name, jobTitle: h.author.role },
      publisher: { '@id': `${SITE.domain}/#org` },
      dateModified: h.updatedAt,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: h.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.domain}/guides` },
        { '@type': 'ListItem', position: 3, name: h.h1, item: url },
      ],
    },
  ];

  const best = h.months.filter((m) => m.verdict === 'best').map((m) => m.month);

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`${h.place} · all twelve months`}
        title={h.h1}
        lede={h.lede}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Guides', href: '/guides' },
          { label: h.h1 },
        ]}
        background={TONE_HERO.valley}
      >
        <FactStrip
          facts={[
            ['Best months', best.join(', ')],
            ['Months covered', String(h.months.length)],
            ['Verified', h.updatedAt],
            ['Written in', 'Srinagar'],
          ]}
        />
      </PageHero>

      <div className="mesh-warm">
        <div className="wrap section-sm grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {/* ── direct answer */}
            <section data-reveal>
              <div className="rounded-2xl border border-paper-300 bg-white p-7 shadow-lg md:p-8">
                <p className="kicker">The short answer</p>
                <p className="display mt-2.5 text-[25px] leading-snug text-ink-900">
                  {h.answer.verdict}
                </p>
                <p className="mt-4 text-[15.5px] leading-[1.75] text-ink-600">{h.answer.body}</p>
                <p className="mt-6 border-t border-paper-200 pt-4 text-[12.5px] text-ink-500">
                  Written by <span className="font-medium text-ink-800">{h.author.name}</span>,{' '}
                  {h.author.role} &middot; last verified{' '}
                  <time dateTime={h.updatedAt}>
                    {new Date(`${h.updatedAt}T12:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </time>
                </p>
              </div>
            </section>

            {/* ── verdict table, before the prose */}
            <section className="mt-14" data-reveal>
              <p className="kicker">At a glance</p>
              <h2 className="display d3 mt-2 text-ink-900">All twelve months, ranked.</h2>
              <div className="scroll-x mt-7 overflow-x-auto rounded-2xl border border-paper-300 bg-white">
                <table className="w-full min-w-[600px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-paper-300 bg-paper-100">
                      {['Month', 'Verdict', 'Day temp', 'Snow', 'Price', 'Crowd'].map((th) => (
                        <th key={th} scope="col" className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {h.months.map((m, i) => (
                      <tr key={m.key} className={i < h.months.length - 1 ? 'border-b border-paper-200' : ''}>
                        <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-medium text-ink-900">
                          <a href={`#${m.key}`} className="hover:text-gold-700">{m.month}</a>
                        </th>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${VERDICT[m.verdict].cls}`}>
                            {VERDICT[m.verdict].label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-ink-700">{m.tempDay}</td>
                        <td className="px-4 py-3.5 text-ink-600">{m.snow.split('.')[0]}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-ink-600">{m.price.split('—')[0].trim()}</td>
                        <td className="px-4 py-3.5 text-ink-600">{m.crowd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/*
              One self-contained section per month. Each states its own
              temperatures, verdict and packing note rather than referring back
              to the month above, so passage ranking can lift it for
              "kashmir in january" independently of the page H1.
            */}
            {h.months.map((m) => (
              <section key={m.key} id={m.key} className="mt-16 scroll-mt-24" data-reveal>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="display d3 text-ink-900">
                    {h.place} in {m.month}
                  </h2>
                  <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${VERDICT[m.verdict].cls}`}>
                    {VERDICT[m.verdict].label}
                  </span>
                </div>

                <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{m.body}</p>

                <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-2xl border border-paper-300 bg-white p-6 sm:grid-cols-2">
                  {[
                    [Thermometer, 'Temperature', `${m.tempDay} day · ${m.tempNight} night`],
                    [Snowflake, 'Snow', m.snow],
                    [Wallet, 'Price', m.price],
                    [Users, 'Crowds', m.crowd],
                    [PackageOpen, 'Packing', m.packing],
                    ...(m.access ? [[Ban, 'Closed or restricted', m.access] as const] : []),
                  ].map(([Icon, label, value]) => {
                    const I = Icon as typeof Thermometer;
                    return (
                      <div key={label as string} className="flex gap-3">
                        <I className="mt-0.5 size-4 shrink-0 text-gold-600" strokeWidth={2} />
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                            {label as string}
                          </dt>
                          <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-700">
                            {value as string}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}

            <section className="mt-16" data-reveal>
              <p className="kicker">Common questions</p>
              <h2 className="display d3 mb-8 mt-2 text-ink-900">
                Timing {h.place}, answered.
              </h2>
              <Faq items={h.faqs} />
            </section>
          </div>

          {/* ── sidebar */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-[104px] grid gap-5">
              <div className="rounded-2xl border border-paper-300 bg-white p-6 shadow-lg">
                <p className="kicker">Jump to a month</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {h.months.map((m) => (
                    <a
                      key={m.key}
                      href={`#${m.key}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] text-ink-600 transition-colors hover:border-gold-400 hover:text-gold-700"
                    >
                      <span className={`size-1.5 rounded-full ${VERDICT[m.verdict].dot}`} />
                      {m.month.slice(0, 3)}
                    </a>
                  ))}
                </div>
                <div className="mt-6 grid gap-2.5">
                  <Link href="/packages" className="btn btn-gold btn-shine w-full">
                    See {h.place} packages
                  </Link>
                  <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost w-full">
                    Call {SITE.phone.display}
                  </a>
                </div>
                <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-500">
                  Tell us the month and we will tell you honestly whether it
                  suits the trip you want.
                </p>
              </div>

              <Link
                href="/guides/places-to-visit-in-kashmir"
                className="lift group flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <div>
                  <p className="kicker">Sightseeing guide</p>
                  <p className="display mt-1.5 text-[17px] text-ink-900">Places to Visit in Kashmir</p>
                </div>
                <ArrowUpRight className="arrow-slide size-5 shrink-0 text-gold-600" strokeWidth={2} />
              </Link>

              <Link
                href="/destinations/kashmir"
                className="lift group flex items-center justify-between gap-3 rounded-2xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <div>
                  <p className="kicker">Destination guide</p>
                  <p className="display mt-1.5 text-[19px] text-ink-900">{h.place}</p>
                </div>
                <ArrowUpRight className="arrow-slide size-5 shrink-0 text-gold-600" strokeWidth={2} />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {pkgs.length > 0 && (
        <section className="section border-t border-paper-200 bg-paper-100">
          <div className="wrap">
            <p className="kicker" data-reveal>
              Matched to the season
            </p>
            <h2 className="display d2 mt-3 text-ink-900" data-reveal>
              Itineraries that suit the month you pick.
            </h2>
            <div data-reveal-group className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pkgs.map((p) => (
                <PackageCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-6%] top-[6%] h-[400px] w-[400px]"
          style={{ background: 'rgba(201,169,97,0.15)' }}
        />
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Still deciding</p>
            <h2 className="display d2 mt-3 text-paper-50">
              Tell us the month. We will tell you the truth.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              If the month you have leave for is the wrong one for the trip you
              are picturing, we would rather say so now than take the booking
              and let you find out.
            </p>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8" id="enquiry">
            <EnquiryForm source={`month_hub_${h.slug}`} destination={h.place} light />
          </div>
        </div>
      </section>
    </>
  );
}
