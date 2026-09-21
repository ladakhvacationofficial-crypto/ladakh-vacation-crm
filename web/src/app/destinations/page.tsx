import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SITE, inr } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { packagesFor } from '@/lib/packages';
import { DestinationCard, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = {
  title: 'Destinations — Kashmir, Ladakh, Himachal & Vaishno Devi',
  description:
    'Explore our four Himalayan destinations. Kashmir, Ladakh, Himachal and Vaishno Devi tour packages from a Srinagar-based DMC, with honest advice on where to go and when.',
  alternates: { canonical: '/destinations' },
};

export default function DestinationsIndex() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
        { '@type': 'ListItem', position: 2, name: 'Destinations', item: `${SITE.domain}/destinations` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Himalayan destinations by Ladakh Vacation',
      itemListElement: DESTINATIONS.map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: d.name,
        url: `${SITE.domain}/destinations/${d.slug}`,
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Where we operate"
        title="Four regions we know by heart."
        lede="We do not sell every destination in India. We sell four, because those are the four we can stand behind — the roads, the hotels, the drivers and the weather."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Destinations' }]}
        background="linear-gradient(180deg, rgba(7,15,31,0.40) 0%, rgba(7,15,31,0.90) 100%), radial-gradient(140% 120% at 24% 8%, #3670d8 0%, #16294f 46%, #070f1f 100%)"
      />

      <section className="mesh-warm section">
        <div className="wrap">
          <div data-reveal-group className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DESTINATIONS.map((d) => (
              <DestinationCard key={d.slug} d={d} tall />
            ))}
          </div>
        </div>
      </section>

      {/* Long-form rows — one per destination, each an internal-link hub */}
      <section className="section border-t border-paper-200 bg-paper-100">
        <div className="wrap space-y-16">
          {DESTINATIONS.map((d, i) => {
            const pkgs = packagesFor(d.slug);
            return (
              <article
                key={d.slug}
                data-reveal
                className="grid gap-8 border-b border-paper-300 pb-16 last:border-0 last:pb-0 md:grid-cols-12"
              >
                <div className="md:col-span-4">
                  <span className="display text-[13px] tabular-nums text-paper-400">
                    0{i + 1}
                  </span>
                  <h2 className="display d3 mt-2 text-ink-900">
                    <Link href={`/destinations/${d.slug}`} className="link-sweep">
                      {d.seoTitle}
                    </Link>
                  </h2>
                  <dl className="mt-5 space-y-2.5 text-[13px]">
                    {[
                      ['Best time', d.bestMonths],
                      ['Ideal length', d.idealDuration],
                      ['Starts from', `${inr(d.startingFrom)} pp`],
                      ['Airport', d.airport],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-[92px] shrink-0 text-ink-500">{k}</dt>
                        <dd className="font-medium text-ink-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="md:col-span-8">
                  <p className="lede">{d.intro}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {d.regions.map((r) => (
                      <span
                        key={r.name}
                        className="rounded-full border border-paper-300 bg-paper-50 px-3 py-1.5 text-[12px] text-ink-600 transition-colors duration-200 hover:border-gold-400 hover:text-gold-700"
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>

                  {pkgs.length > 0 && (
                    <div className="mt-7">
                      <p className="kicker">Packages</p>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {pkgs.map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={`/packages/${p.slug}`}
                              className="group flex items-center justify-between gap-3 rounded-lg border border-paper-300 bg-paper-50 px-3.5 py-3 text-[13px] transition-all duration-200 hover:border-gold-400 hover:bg-white hover:shadow-sm"
                            >
                              <span className="font-medium text-ink-800">
                                {p.name}
                                <span className="ml-1.5 text-ink-500">
                                  · {p.nights}N
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5 text-gold-700">
                                {inr(p.priceFrom)}
                                <ArrowUpRight
                                  className="arrow-slide size-3.5"
                                  strokeWidth={2.2}
                                />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    href={`/destinations/${d.slug}`}
                    className="btn btn-ghost group mt-7"
                  >
                    Full {d.name} guide
                    <ArrowUpRight className="arrow-slide size-4" strokeWidth={2.2} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
