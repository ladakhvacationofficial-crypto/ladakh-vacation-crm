import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpRight, AlertTriangle, Equal, Sparkles } from 'lucide-react';
import { TRAVEL_STYLES, getTravelStyle } from '@/lib/travel-styles';
import { packagesForStyle } from '@/lib/packages';
import { COLLECTIONS } from '@/lib/collections';
import { PackageCard, SectionHead, Faq, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE } from '@/lib/site';

/** Month verdicts get a colour and a word, so the table scans without reading. */
const VERDICT = {
  best: { label: 'Best', cls: 'bg-pine-100 text-pine-700 border-pine-200' },
  good: { label: 'Good', cls: 'bg-gold-50 text-gold-700 border-gold-200' },
  mixed: { label: 'Mixed', cls: 'bg-paper-100 text-ink-600 border-paper-300' },
  avoid: { label: 'Avoid', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return TRAVEL_STYLES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = getTravelStyle(slug);
  if (!s) return {};
  const description = s.metaDescription ?? s.intro.slice(0, 158);
  return {
    title: s.seoTitle,
    description,
    alternates: { canonical: `/travel-styles/${s.slug}` },
    openGraph: {
      title: s.seoTitle,
      description,
      url: `${SITE.domain}/travel-styles/${s.slug}`,
      type: 'website',
    },
  };
}

export default async function TravelStylePage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = getTravelStyle(slug);
  if (!s) notFound();

  const pkgs = packagesForStyle(s.slug);
  const url = `${SITE.domain}/travel-styles/${s.slug}`;

  /** Collections tagged with this style. */
  const related = COLLECTIONS.filter((c) => c.styles.includes(s.slug));

  const jsonLd = [
    ...(s.author
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: s.seoTitle,
            description: s.metaDescription ?? s.intro,
            url,
            author: { '@type': 'Person', name: s.author.name, jobTitle: s.author.role },
            publisher: { '@id': `${SITE.domain}/#org` },
            ...(s.updatedAt ? { dateModified: s.updatedAt } : {}),
          },
        ]
      : []),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: s.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Travel styles', item: `${SITE.domain}/packages` },
        { '@type': 'ListItem', position: 3, name: s.name, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        tall
        kicker={`${s.name} travel`}
        title={s.headline}
        lede={s.intro}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Packages', href: '/packages' },
          { label: s.name },
        ]}
        background={s.hero}
      />

      {/* ── direct answer: the primary query, answered before anything else */}
      {s.answer && (
        <section className="section-sm mesh-warm">
          <div className="wrap-narrow" data-reveal>
            <div className="rounded-2xl border border-paper-300 bg-white p-7 shadow-lg md:p-9">
              <h2 className="display d3 text-ink-900">{s.answer.heading}</h2>
              <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-paper-200 py-5">
                <span className="display text-[44px] leading-none text-gold-700 tabular-nums">
                  {s.answer.figure}
                </span>
                <span className="text-[13px] text-ink-500">{s.answer.figureNote}</span>
              </div>
              <p className="mt-6 text-[16px] leading-[1.75] text-ink-700">{s.answer.body}</p>
              {s.author && (
                <p className="mt-6 border-t border-paper-200 pt-4 text-[12.5px] text-ink-500">
                  Written by <span className="font-medium text-ink-800">{s.author.name}</span>,{' '}
                  {s.author.role}
                  {s.updatedAt && (
                    <>
                      {' '}&middot; last verified{' '}
                      <time dateTime={s.updatedAt}>
                        {new Date(s.updatedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </time>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── price decoder: the information gain competitors will not publish */}
      {s.priceDecoder && (
        <section className="section-sm border-y border-paper-200 bg-paper-100">
          <div className="wrap-narrow" data-reveal>
            <p className="kicker">Read the small print</p>
            <h2 className="display d2 mt-3 text-ink-900">{s.priceDecoder.heading}</h2>
            <p className="mt-5 text-[15.5px] leading-[1.8] text-ink-600">
              {s.priceDecoder.intro}
            </p>

            <div className="scroll-x mt-9 overflow-x-auto rounded-2xl border border-paper-300 bg-white">
              <table className="w-full min-w-[540px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-paper-300 bg-paper-100">
                    <th scope="col" className="w-[34%] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      What you see
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      What it usually means
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.priceDecoder.rows.map((r, i) => (
                    <tr
                      key={r.claim}
                      className={i < s.priceDecoder!.rows.length - 1 ? 'border-b border-paper-200' : ''}
                    >
                      <th scope="row" className="px-5 py-4 align-top font-medium text-ink-900">
                        {r.claim}
                      </th>
                      <td className="px-5 py-4 align-top leading-relaxed text-ink-600">
                        {r.reality}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-7 rounded-2xl border-l-[3px] border-gold-400 bg-gold-50 p-5 text-[14.5px] leading-relaxed text-ink-700">
              {s.priceDecoder.conclusion}
            </p>
          </div>
        </section>
      )}

      {/* long-form */}
      <section className="section-sm mesh-warm">
        <div className="wrap-narrow" data-reveal>
          <p className="kicker">How we do it</p>
          <div className="mt-4 space-y-5">
            {s.body.map((para, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'text-[17.5px] leading-[1.75] text-ink-800'
                    : 'text-[15.5px] leading-[1.8] text-ink-600'
                }
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── commodity vs real differentiators */}
      {s.commodity && (
        <section className="section-sm">
          <div className="wrap-narrow">
            <div data-reveal>
              <p className="kicker">Comparing operators</p>
              <h2 className="display d2 mt-3 text-ink-900">{s.commodity.heading}</h2>
              <p className="mt-5 text-[15.5px] leading-[1.8] text-ink-600">
                {s.commodity.intro}
              </p>
            </div>

            <div data-reveal className="mt-9 rounded-2xl border border-paper-300 bg-paper-100 p-6">
              <h3 className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                <Equal className="size-4" strokeWidth={2.4} />
                Identical everywhere — ignore when comparing
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {s.commodity.same.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-paper-300 bg-white px-3.5 py-1.5 text-[13px] text-ink-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div data-reveal-group className="mt-5 grid gap-4 md:grid-cols-2">
              {s.commodity.different.map((d) => (
                <div
                  key={d.label}
                  className="rounded-2xl border border-paper-300 bg-white p-6"
                >
                  <h3 className="flex items-start gap-2.5 text-[15px] font-semibold text-ink-900">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-600" strokeWidth={2.2} />
                    {d.label}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-ink-600">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── month table */}
      {s.months && (
        <section className="section-sm border-y border-paper-200 bg-paper-100">
          <div className="wrap-narrow" data-reveal>
            <p className="kicker">Month by month</p>
            <h2 className="display d2 mt-3 text-ink-900">
              When to go, and the month to skip.
            </h2>
            <div className="scroll-x mt-8 overflow-x-auto rounded-2xl border border-paper-300 bg-white">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-paper-300 bg-paper-100">
                    <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      Month
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      Verdict
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      What to expect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.months.map((m, i) => (
                    <tr
                      key={m.month}
                      className={i < s.months!.length - 1 ? 'border-b border-paper-200' : ''}
                    >
                      <th scope="row" className="whitespace-nowrap px-5 py-3.5 font-medium text-ink-900">
                        {m.month}
                      </th>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${VERDICT[m.verdict].cls}`}
                        >
                          {VERDICT[m.verdict].label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 leading-relaxed text-ink-600">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── the honest negative */}
      {s.negative && (
        <section className="section-sm">
          <div className="wrap-narrow" data-reveal>
            <div className="flex gap-5 rounded-2xl border border-paper-300 bg-white p-7 md:p-9">
              <AlertTriangle className="mt-1 size-6 shrink-0 text-gold-600" strokeWidth={1.9} />
              <div>
                <h2 className="display text-[26px] leading-snug text-ink-900">
                  {s.negative.heading}
                </h2>
                <p className="mt-4 text-[15.5px] leading-[1.8] text-ink-600">
                  {s.negative.body}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* promises */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob left-[-6%] top-[8%] h-[400px] w-[400px]"
          style={{ background: 'rgba(201,169,97,0.15)' }}
        />
        <div className="wrap relative">
          <SectionHead
            light
            kicker="What changes"
            title={`Four things we do differently for ${s.name.toLowerCase()} trips.`}
          />
          <div data-reveal-group className="mt-12 grid gap-x-10 gap-y-9 md:grid-cols-2">
            {s.promises.map((pr, i) => (
              <div key={pr.title} className="group">
                <div className="flex items-center gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-400/12 text-gold-300 transition-all duration-500 group-hover:bg-gold-400 group-hover:text-ink-950">
                    <Check className="size-4" strokeWidth={2.6} />
                  </span>
                  <span className="display text-[13px] tabular-nums text-paper-200/30">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="display mt-4 text-[21px] text-paper-50">{pr.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-paper-200/70">
                  {pr.body}
                </p>
                <div className="mt-5 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold-400 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* packages */}
      {pkgs.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead
              kicker={`${pkgs.length} matching ${pkgs.length === 1 ? 'itinerary' : 'itineraries'}`}
              title={`Packages that suit ${s.name.toLowerCase()} travel.`}
              lede="Starting points, not fixed products. Every one gets rebuilt around your dates, group and pace."
            />
            <div data-reveal-group className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {pkgs.map((p) => (
                <PackageCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* faqs */}
      <section className="section border-y border-paper-200 bg-paper-100">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHead kicker="Frequently asked" title={`${s.name} questions.`} />
            <p className="mt-6 text-[14px] leading-relaxed text-ink-600">
              Anything else?{' '}
              <Link href="/contact" className="link-sweep font-medium text-gold-700">
                Ask us directly
              </Link>
              .
            </p>
          </div>
          <div className="lg:col-span-8" data-reveal>
            <Faq items={s.faqs} />
          </div>
        </div>
      </section>

      {/*
        Style-specific collection links. Contextual main-content links from a
        topically-matched page are the strongest internal signal available, so
        the honeymoon pillar feeds the honeymoon collections directly rather
        than leaving them on a single hub link.
      */}
      {related.length > 0 && (
        <section className="section-sm border-t border-paper-200">
          <div className="wrap">
            <p className="kicker" data-reveal>
              Go deeper on {s.name.toLowerCase()}
            </p>
            <div data-reveal-group className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`${c.basePath ?? '/packages'}/${c.slug}`}
                  className="lift group rounded-xl border border-paper-300 bg-paper-50 p-5 transition-colors hover:border-gold-400 hover:bg-white"
                >
                  <h3 className="display text-[18px] leading-snug text-ink-900">{c.h1}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
                    {c.lede}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gold-700">
                    See prices
                    <ArrowUpRight className="size-3.5" strokeWidth={2.2} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* other styles */}
      <section className="section-sm">
        <div className="wrap">
          <p className="kicker" data-reveal>
            Other travel styles
          </p>
          <div data-reveal-group className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRAVEL_STYLES.filter((x) => x.slug !== s.slug).map((x) => (
              <Link
                key={x.slug}
                href={`/travel-styles/${x.slug}`}
                className="lift group flex items-center justify-between gap-3 rounded-xl border border-paper-300 bg-paper-50 px-5 py-4 transition-colors hover:border-gold-400 hover:bg-white"
              >
                <span className="display text-[18px] text-ink-900">{x.name}</span>
                <ArrowUpRight
                  className="arrow-slide size-4 shrink-0 text-gold-600"
                  strokeWidth={2.2}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* enquiry */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Start planning</p>
            <h2 className="display d2 mt-3 text-paper-50">
              Tell us who&rsquo;s travelling.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              Group size, ages, dates, and anything that would make or break the
              trip. That is enough for us to come back with something real.
            </p>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8">
            <EnquiryForm source={`style_${s.slug}`} packageName={`${s.name} trip`} light />
          </div>
        </div>
      </section>
    </>
  );
}
