import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowUpRight, Info } from 'lucide-react';
import { DESTINATIONS, getDestination, TONE_HERO } from '@/lib/destinations';
import { packagesFor } from '@/lib/packages';
import { PackageCard, SectionHead, Faq, JsonLd } from '@/components/cards';
import { PageHero, FactStrip } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE, inr } from '@/lib/site';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return {};

  const title = `${d.seoTitle} — ${d.idealDuration} from ${inr(d.startingFrom)}`;
  const description = `${d.seoTitle} from a Leh-based team. ${d.regions
    .slice(0, 4)
    .map((r) => r.name)
    .join(', ')}. Best time: ${d.bestMonths}. All-inclusive itineraries from ${inr(d.startingFrom)} per person.`;

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${d.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE.domain}/destinations/${d.slug}`,
      type: 'website',
    },
  };
}

export default async function DestinationHub({ params }: { params: Params }) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();

  const pkgs = packagesFor(d.slug);
  const url = `${SITE.domain}/destinations/${d.slug}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      '@id': `${url}#destination`,
      name: d.name,
      description: d.intro,
      url,
      touristType: ['Family', 'Couples', 'Adventure', 'Pilgrimage', 'Groups'],
      includesAttraction: d.regions.map((r) => ({
        '@type': 'TouristAttraction',
        name: r.name,
        description: r.note,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: d.faqs.map((f) => ({
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
        { '@type': 'ListItem', position: 2, name: 'Destinations', item: `${SITE.domain}/destinations` },
        { '@type': 'ListItem', position: 3, name: d.name, item: url },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        tall
        kicker={`${d.name} · Tour Packages`}
        title={d.headline}
        lede={d.intro}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Destinations', href: '/destinations' },
          { label: d.name },
        ]}
        background={TONE_HERO[d.tone]}
      >
        <FactStrip
          facts={[
            ['Best time', d.bestMonths],
            ['Ideal length', d.idealDuration],
            ['Starts from', `${inr(d.startingFrom)} per person`],
            ['Altitude', d.altitude],
          ]}
        />
      </PageHero>

      {/* ───────────── long-form intro */}
      <section className="section-sm mesh-warm">
        <div className="wrap grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7" data-reveal>
            <p className="kicker">The honest version</p>
            <div className="mt-4 space-y-5">
              {d.body.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-[17.5px] leading-[1.75] text-ink-800'
                      : 'text-[15.5px] leading-[1.8] text-ink-600'
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          </div>

          <aside className="md:col-span-5" data-reveal="right">
            <div className="rounded-2xl border border-paper-300 bg-paper-100 p-6">
              <div className="flex items-center gap-2.5">
                <Info className="size-4 text-gold-600" strokeWidth={2} />
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-700">
                  Know before you go
                </h2>
              </div>
              <dl className="mt-5 space-y-4">
                {d.knowBefore.map((k) => (
                  <div key={k.label}>
                    <dt className="text-[13px] font-semibold text-ink-900">{k.label}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-ink-600">
                      {k.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* ───────────── regions */}
      <section className="section border-t border-paper-200 bg-paper-100">
        <div className="wrap">
          <SectionHead
            kicker="Where you'll go"
            title={`${d.regions.length} places worth the drive.`}
          />
          <div data-reveal-group className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.regions.map((r, i) => (
              <div
                key={r.name}
                className="lift group relative overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 p-6"
              >
                <span className="display absolute right-5 top-4 text-[38px] leading-none text-paper-300 transition-colors duration-500 group-hover:text-gold-200">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="display relative text-[22px] text-ink-900">{r.name}</h3>
                <p className="relative mt-2 text-[13.5px] leading-relaxed text-ink-600">
                  {r.note}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ───────────── highlights */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div
          aria-hidden
          className="blob right-[-6%] top-[10%] h-[400px] w-[400px]"
          style={{ background: 'rgba(201,169,97,0.15)' }}
        />
        <div className="wrap relative grid gap-12 lg:grid-cols-2">
          <SectionHead
            light
            kicker="Signature experiences"
            title={`What we build every ${d.name} trip around.`}
            lede={`Best months to travel: ${d.bestMonths}. Fly into ${d.airport}.`}
          />
          <ul data-reveal-group className="space-y-0">
            {d.highlights.map((h) => (
              <li
                key={h}
                className="group flex items-start gap-4 border-b border-paper-100/12 py-4 transition-colors duration-300 last:border-0 hover:bg-paper-100/5"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-300 transition-all duration-300 group-hover:bg-gold-400 group-hover:text-ink-950">
                  <Check className="size-3.5" strokeWidth={2.6} />
                </span>
                <span className="text-[15px] leading-relaxed text-paper-100">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── packages */}
      {pkgs.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead
              kicker={`${d.name} packages`}
              title="Ready-made, then reshaped around you."
              lede="Every itinerary below is a starting point. Send us your dates and group size and we will rebuild it to fit."
            />
            <div data-reveal-group className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {pkgs.map((p) => (
                <PackageCard key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────── faqs */}
      <section className="section border-y border-paper-200 bg-paper-100">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHead
              kicker="Frequently asked"
              title={`${d.name} questions we hear every week.`}
            />
            <p className="mt-6 text-[14px] leading-relaxed text-ink-600">
              Something not covered here?{' '}
              <Link href="/contact" className="link-sweep font-medium text-gold-700">
                Ask us directly
              </Link>{' '}
              &mdash; we answer within a few hours.
            </p>
          </div>
          <div className="lg:col-span-8" data-reveal>
            <Faq items={d.faqs} />
          </div>
        </div>
      </section>

      {/* ───────────── enquiry */}
      <section className="mesh-pine grain section relative isolate overflow-hidden">
        <div className="wrap relative grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <p className="kicker kicker-light">Plan your {d.name} trip</p>
            <h2 className="display d2 mt-3 text-paper-50">
              Same-day quote. Same team for the whole trip.
            </h2>
            <p className="lede mt-5 max-w-md !text-paper-200/75">
              Tell us your dates, group size and rough idea. We come back with a
              custom itinerary and honest pricing within a few hours &mdash; no
              obligation, no follow-up spam.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/packages" className="btn btn-ghost-light group">
                Browse all packages
                <ArrowUpRight className="arrow-slide size-4" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
          <div data-reveal="right" className="glass-dark rounded-2xl p-6 md:p-8">
            <EnquiryForm
              source={`destination_${d.slug}`}
              destination={d.name}
              packageName={d.name}
              light
            />
          </div>
        </div>
      </section>
    </>
  );
}
