'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, ChevronDown, ArrowRight } from 'lucide-react';
import { SITE, inr } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { TRAVEL_STYLES } from '@/lib/travel-styles';
import { Wordmark } from './logo';

type Drop = 'destinations' | 'styles' | null;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<Drop>(null);
  const [solid, setSolid] = useState(false);

  /* The header starts transparent over the hero and turns to paper once the
     user scrolls past it. Cheap rAF-throttled scroll, no layout reads. */
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setSolid(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Close everything on navigation.
  useEffect(() => {
    setOpen(false);
    setDrop(null);
  }, [pathname]);

  // Lock body scroll behind the mobile drawer.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape closes the open dropdown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrop(null);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const linkBase =
    'link-sweep text-[13.5px] font-medium text-ink-700 hover:text-gold-700 transition-colors duration-200';

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-pine-800 focus:px-4 focus:py-2 focus:text-paper-50"
      >
        Skip to content
      </a>

      <header
        className={[
          'sticky top-0 z-50 transition-all duration-300',
          solid
            ? 'border-b border-paper-300/70 bg-paper-50/88 backdrop-blur-xl shadow-[0_1px_20px_-8px_rgba(13,15,13,0.14)]'
            : 'border-b border-transparent bg-paper-50/60 backdrop-blur-sm',
        ].join(' ')}
        onMouseLeave={() => setDrop(null)}
      >
        <div className="wrap flex h-[68px] items-center justify-between gap-4 md:h-[80px]">
          <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0">
            <Wordmark />
          </Link>

          {/* ---------- desktop nav ---------- */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            <DropTrigger
              label="Destinations"
              active={drop === 'destinations'}
              onEnter={() => setDrop('destinations')}
              onToggle={() => setDrop(drop === 'destinations' ? null : 'destinations')}
            />
            <Link href="/packages" className={linkBase}>
              Packages
            </Link>
            <DropTrigger
              label="Travel styles"
              active={drop === 'styles'}
              onEnter={() => setDrop('styles')}
              onToggle={() => setDrop(drop === 'styles' ? null : 'styles')}
            />
            <Link href="/reviews" className={linkBase}>
              Reviews
            </Link>
            <Link href="/about" className={linkBase}>
              About
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={`tel:${SITE.phone.tel}`}
              className="group flex items-center gap-2 rounded-full border border-paper-300 px-3.5 py-2 text-[13px] font-medium text-ink-700 transition-colors duration-200 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
            >
              <Phone className="size-3.5 transition-transform duration-300 group-hover:rotate-12" strokeWidth={2} />
              {SITE.phone.display}
            </a>
            <Link href="/plan-my-trip" className="btn btn-gold btn-shine">
              Plan my trip
            </Link>
          </div>

          <button
            className="grid size-11 place-items-center rounded-lg text-ink-800 transition-colors hover:bg-paper-200 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* ---------- desktop mega panel ---------- */}
        <div
          className={[
            'absolute inset-x-0 top-full hidden origin-top overflow-hidden border-b border-paper-300 bg-paper-50/97 backdrop-blur-xl transition-all duration-300 lg:block',
            drop
              ? 'pointer-events-auto max-h-[520px] opacity-100 shadow-[0_28px_60px_-30px_rgba(13,15,13,0.35)]'
              : 'pointer-events-none max-h-0 opacity-0',
          ].join(' ')}
        >
          {drop === 'destinations' && (
            <div className="wrap grid grid-cols-4 gap-3 py-8">
              {DESTINATIONS.map((d) => (
                <Link
                  key={d.slug}
                  href={`/destinations/${d.slug}`}
                  className="group rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-paper-300 hover:bg-paper-100"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="display d4 text-ink-900">{d.name}</span>
                    <ArrowRight className="arrow-slide size-4 text-gold-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                    {d.regions.length} regions · {d.idealDuration}
                  </p>
                  <p className="mt-2 text-[12px] font-medium text-gold-700">
                    from {inr(d.startingFrom)} pp
                  </p>
                </Link>
              ))}
            </div>
          )}
          {drop === 'styles' && (
            <div className="wrap grid grid-cols-5 gap-3 py-8">
              {TRAVEL_STYLES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/travel-styles/${s.slug}`}
                  className="group rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-paper-300 hover:bg-paper-100"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="display text-[19px] text-ink-900">{s.name}</span>
                    <ArrowRight className="arrow-slide size-4 text-gold-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-ink-500">
                    {s.headline}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ---------- mobile drawer ---------- */}
      {open && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="anim-rise absolute inset-x-0 top-0 max-h-[92dvh] overflow-y-auto rounded-b-2xl bg-paper-50 pb-6 shadow-xl">
            <div className="flex h-[68px] items-center justify-between px-5">
              <Wordmark />
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-lg text-ink-700 hover:bg-paper-200"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="hair mx-5" />

            <nav className="px-5 pt-3" aria-label="Mobile">
              <MobileGroup label="Destinations">
                {DESTINATIONS.map((d) => (
                  <MobileLink key={d.slug} href={`/destinations/${d.slug}`}>
                    {d.name}
                    <span className="text-[12px] text-ink-500">
                      from {inr(d.startingFrom)}
                    </span>
                  </MobileLink>
                ))}
              </MobileGroup>

              <MobileGroup label="Travel styles">
                {TRAVEL_STYLES.map((s) => (
                  <MobileLink key={s.slug} href={`/travel-styles/${s.slug}`}>
                    {s.name}
                  </MobileLink>
                ))}
              </MobileGroup>

              <div className="mt-2 space-y-0.5">
                {[
                  ['/packages', 'All packages'],
                  ['/reviews', 'Reviews'],
                  ['/about', 'About us'],
                  ['/partner-with-us', 'Travel agent partners'],
                  ['/contact', 'Contact'],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block rounded-lg px-3 py-3 text-[15px] font-medium text-ink-800 transition-colors hover:bg-paper-200"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="mt-5 grid gap-2.5">
                <Link href="/plan-my-trip" className="btn btn-gold w-full">
                  Plan my trip
                </Link>
                <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost w-full">
                  <Phone className="size-4" strokeWidth={2} />
                  {SITE.phone.display}
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function DropTrigger({
  label,
  active,
  onEnter,
  onToggle,
}: {
  label: string;
  active: boolean;
  onEnter: () => void;
  onToggle: () => void;
}) {
  return (
    <button
      onMouseEnter={onEnter}
      onClick={onToggle}
      aria-expanded={active}
      className={[
        'flex items-center gap-1 text-[13.5px] font-medium transition-colors duration-200',
        active ? 'text-gold-700' : 'text-ink-700 hover:text-gold-700',
      ].join(' ')}
    >
      {label}
      <ChevronDown
        className={`size-3.5 transition-transform duration-300 ${active ? 'rotate-180' : ''}`}
        strokeWidth={2}
      />
    </button>
  );
}

function MobileGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="acc group border-b border-paper-200 py-1">
      <summary className="flex items-center justify-between px-3 py-3 text-[15px] font-medium text-ink-800">
        {label}
        <span className="acc-icon text-[20px] leading-none text-gold-600">+</span>
      </summary>
      <div className="pb-2 pl-3">{children}</div>
    </details>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] text-ink-600 transition-colors hover:bg-paper-200 hover:text-ink-900"
    >
      {children}
    </Link>
  );
}
