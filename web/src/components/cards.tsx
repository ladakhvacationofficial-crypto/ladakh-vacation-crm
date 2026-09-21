import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Clock, MapPin, Star } from 'lucide-react';
import type { Destination } from '@/lib/destinations';
import { TONE_BG } from '@/lib/destinations';
import type { Pkg } from '@/lib/packages';
import { inr } from '@/lib/site';
import type { Review } from '@/lib/reviews';

/* ---------------------------------------------------------------- destination */

export function DestinationCard({ d, tall = false }: { d: Destination; tall?: boolean }) {
  return (
    <Link
      href={`/destinations/${d.slug}`}
      className="lift zoom-wrap edge-gold group relative block overflow-hidden rounded-2xl shadow-md"
    >
      <div
        className={`zoom relative overflow-hidden ${tall ? 'aspect-[3/4.4]' : 'aspect-[4/5]'}`}
      >
        {d.image ? (
          <Image
            src={d.image}
            alt={`${d.name} Tour Packages & Travel Guide — Ladakh Vacation`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="size-full" style={{ background: TONE_BG[d.tone] }} />
        )}
      </div>
      {/* legibility scrim, separate layer so the zoom doesn't stretch it */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/35 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <div className="kicker kicker-light">
          {d.idealDuration} · from {inr(d.startingFrom)}
        </div>
        <h3 className="display mt-2 text-[27px] leading-none text-paper-50 md:text-[31px]">
          {d.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[34ch] text-[12.5px] leading-relaxed text-paper-200/80">
          {d.headline}
        </p>

        {/* slides up on hover */}
        <div className="mt-3 max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-h-14 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gold-300">
            Explore {d.name}
            <ArrowUpRight className="size-3.5" strokeWidth={2.2} />
          </span>
        </div>
      </div>

      <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-paper-50/92 text-ink-900 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-45">
        <ArrowUpRight className="size-4" strokeWidth={2} />
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------- package */

export function PackageCard({ p }: { p: Pkg }) {
  return (
    <article className="lift edge-gold group relative flex flex-col overflow-hidden rounded-2xl border border-paper-200 bg-white shadow-sm">
      <Link href={`/packages/${p.slug}`} className="zoom-wrap relative block">
        <div className="zoom aspect-[16/10] relative overflow-hidden">
          {p.image ? (
            <Image
              src={p.image}
              alt={`${p.name} — ${p.nights} Nights ${p.days} Days ${p.destinationName} Tour Package by Ladakh Vacation`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="size-full" style={{ background: TONE_BG[p.tone] }} />
          )}
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent"
        />
        <span className="absolute left-4 top-4 rounded-full bg-paper-50/92 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-800 backdrop-blur">
          {p.destinationName}
        </span>
        <div className="absolute inset-x-4 bottom-3 flex items-center gap-3 text-[11.5px] font-medium text-paper-100">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" strokeWidth={2} />
            {p.nights}N / {p.days}D
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" strokeWidth={2} />
            {p.route.length} stops
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="display text-[21px] leading-tight text-ink-900">
          <Link href={`/packages/${p.slug}`} className="link-sweep">
            {p.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-600">
          {p.summary}
        </p>

        {/* route ribbon */}
        <div className="scroll-x mt-3.5 flex items-center gap-1.5 pb-1">
          {p.route.map((stop, i) => (
            <span key={`${stop}-${i}`} className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-md bg-paper-100 px-2 py-1 text-[11px] font-medium text-ink-600">
                {stop}
              </span>
              {i < p.route.length - 1 && (
                <span aria-hidden className="text-[10px] text-paper-400">
                  ›
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-ink-500">From</p>
            <p className="display text-[24px] leading-none text-ink-900">
              {inr(p.priceFrom)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">per person</p>
          </div>
          <Link
            href={`/packages/${p.slug}`}
            className="btn btn-pine !min-h-0 !px-4 !py-2.5 !text-[12.5px]"
          >
            View itinerary
            <ArrowUpRight className="arrow-slide size-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------------- review */

export function ReviewCard({ r }: { r: Review }) {
  return (
    <figure className="lift flex h-full flex-col rounded-2xl border border-paper-200 bg-white p-6 shadow-sm">
      <div className="flex gap-0.5 text-gold-400">
        {Array.from({ length: r.rating }).map((_, i) => (
          <Star key={i} className="size-4 fill-current" strokeWidth={0} />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-700">
        &ldquo;{r.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 border-t border-paper-200 pt-4">
        <p className="text-[13.5px] font-semibold text-ink-900">{r.author}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-500">
          {r.from} · {r.trip}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-400">{r.month}</p>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------- section */

export function SectionHead({
  kicker,
  title,
  lede,
  align = 'left',
  light = false,
}: {
  kicker: string;
  title: React.ReactNode;
  lede?: string;
  align?: 'left' | 'center';
  light?: boolean;
}) {
  return (
    <div
      data-reveal
      className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}
    >
      <p className={light ? 'kicker kicker-light' : 'kicker'}>{kicker}</p>
      <h2 className={`display d2 mt-3 ${light ? 'text-paper-50' : 'text-ink-900'}`}>
        {title}
      </h2>
      {lede && (
        <p className={`lede mt-4 ${light ? '!text-paper-200/75' : ''}`}>{lede}</p>
      )}
    </div>
  );
}

/** Native <details> accordion styled for FAQ blocks. */
export function Faq({ items, light = false }: { items: { q: string; a: string }[]; light?: boolean }) {
  return (
    <div
      className={`divide-y ${light ? 'divide-paper-100/12 border-y border-paper-100/12' : 'divide-paper-200 border-y border-paper-200'}`}
    >
      {items.map((f) => (
        <details key={f.q} className="acc group">
          <summary
            className={`flex items-start justify-between gap-5 py-5 text-[16px] font-medium transition-colors duration-200 ${
              light
                ? 'text-paper-50 hover:text-gold-300'
                : 'text-ink-900 hover:text-gold-700'
            }`}
          >
            <span className="flex-1">{f.q}</span>
            <span className="acc-icon mt-0.5 text-[22px] leading-none text-gold-500">+</span>
          </summary>
          <p
            className={`pb-5 pr-10 text-[14.5px] leading-relaxed ${
              light ? 'text-paper-200/75' : 'text-ink-600'
            }`}
          >
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/** Structured-data emitter. Keeps JSON-LD out of the page bodies. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
