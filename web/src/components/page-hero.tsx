import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

/**
 * Shared inner-page hero. Same gradient + grain + blob treatment as the home
 * hero so every page feels like the same site, but shorter so content starts
 * above the fold on a laptop.
 */
const DEFAULT_HERO_BG = 'linear-gradient(160deg, #0a1428 0%, #16294f 60%, #1e4fa8 160%)';

export function PageHero({
  kicker,
  title,
  lede,
  background = DEFAULT_HERO_BG,
  heroImage,
  heroImageAlt,
  crumbs,
  children,
  tall = false,
}: {
  kicker: string;
  title: React.ReactNode;
  lede?: string;
  background?: string;
  heroImage?: string;
  heroImageAlt?: string;
  crumbs?: { label: string; href?: string }[];
  children?: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      {heroImage ? (
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <Image
            src={heroImage}
            alt={heroImageAlt || (typeof title === 'string' ? title : 'Ladakh Vacation Kashmir')}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25 brightness-90"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/60 to-ink-950/90" />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-20 bg-cover bg-center" style={{ background: background || DEFAULT_HERO_BG }} />
      )}
      <div
        aria-hidden
        className="blob -z-10 left-[8%] top-[10%] h-[340px] w-[340px]"
        style={{ background: 'rgba(232,185,35,0.16)' }}
      />
      <div aria-hidden className="grain absolute inset-0 -z-10" />

      <div
        className={`wrap relative ${tall ? 'pb-20 pt-32 md:pb-28 md:pt-40' : 'pb-16 pt-28 md:pb-20 md:pt-36'}`}
      >
        {crumbs && (
          <nav aria-label="Breadcrumb" className="anim-fade mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-paper-200/60">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3 opacity-50" strokeWidth={2} />}
                  {c.href ? (
                    <Link href={c.href} className="transition-colors hover:text-gold-300">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-paper-200/85">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <p className="anim-fade kicker kicker-light">{kicker}</p>
        <h1 className="display d1 anim-rise d-1 mt-4 max-w-[20ch] text-paper-50">{title}</h1>
        {lede && (
          <p className="anim-rise d-3 lede mt-6 max-w-2xl !text-paper-200/80">{lede}</p>
        )}
        {children && <div className="anim-rise d-4 mt-9">{children}</div>}
      </div>
    </section>
  );
}

/** Horizontal fact strip used under inner-page heroes. */
export function FactStrip({ facts }: { facts: [string, string][] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-paper-100/12 bg-paper-100/8 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
      {facts.map(([k, v]) => (
        <div key={k} className="bg-ink-950/25 px-5 py-4">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-paper-200/50">{k}</p>
          <p className="mt-1.5 text-[13.5px] font-medium text-paper-50">{v}</p>
        </div>
      ))}
    </div>
  );
}
