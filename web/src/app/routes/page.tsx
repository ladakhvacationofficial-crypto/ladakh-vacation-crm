import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, TrainFront, Plane, Car } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { TONE_HERO } from '@/lib/destinations';
import { JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Getting to Kashmir — Route Guides by Train, Flight and Road',
  description:
    'Honest, dated route guides for reaching Kashmir: real timings, real fares and what has changed. Written by a Srinagar-based operator, verified rather than estimated.',
  alternates: { canonical: '/routes' },
};

const MODE_ICON = {
  train: TrainFront,
  flight: Plane,
  road: Car,
} as const;

const MODE_LABEL = { flight: 'Flight', train: 'Train', road: 'Road' } as const;

export default function RoutesIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Route guides to Kashmir',
    url: `${SITE.domain}/routes`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ROUTES.length,
      itemListElement: ROUTES.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.h1,
        url: `${SITE.domain}/routes/${r.slug}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Route guides"
        title="Getting here, answered honestly"
        lede="Timings, fares and the things that have recently changed — each one dated and sourced, because a transport page that is confidently wrong makes people miss trains."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Routes' }]}
        background={TONE_HERO.valley}
      />

      <div className="mesh-warm">
        <div className="wrap section-sm">
          <div data-reveal-group className="grid gap-5 md:grid-cols-2">
            {ROUTES.map((r) => (
              <Link
                key={r.slug}
                href={`/routes/${r.slug}`}
                className="lift group flex flex-col justify-between gap-6 rounded-2xl border border-paper-300 bg-white p-6 transition-colors hover:border-gold-400"
              >
                <div>
                  {/* Every mode this page covers — one page per pair, not per mode. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {r.modes.map((m) => {
                      const Icon = MODE_ICON[m.key];
                      return (
                        <span
                          key={m.key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-50 px-2.5 py-1 text-[11px] font-medium text-ink-600"
                        >
                          <Icon className="size-3.5 text-gold-600" strokeWidth={2.1} />
                          {MODE_LABEL[m.key]}
                        </span>
                      );
                    })}
                  </div>
                  <h2 className="display mt-3.5 text-[22px] leading-snug text-ink-900">
                    {r.h1}
                  </h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{r.lede}</p>
                </div>
                <div className="flex items-center justify-between border-t border-paper-200 pt-4">
                  <span className="text-[12px] text-ink-500">Verified {r.verifiedOn}</span>
                  <ArrowUpRight
                    className="arrow-slide size-5 shrink-0 text-gold-600"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-[14px] leading-relaxed text-ink-600">
            More routes are being added from the questions travellers actually
            ask us. If the one you need is missing,{' '}
            <a href={`tel:${SITE.phone.tel}`} className="text-gold-700 underline underline-offset-2">
              call {SITE.phone.display}
            </a>{' '}
            and we will answer it directly.
          </p>
        </div>
      </div>
    </>
  );
}
