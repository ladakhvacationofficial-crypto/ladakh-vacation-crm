import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram, Facebook, Star } from 'lucide-react';
import { SITE } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { TRAVEL_STYLES } from '@/lib/travel-styles';
import { PACKAGES } from '@/lib/packages';
import { Wordmark } from './logo';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mesh-pine grain relative isolate overflow-hidden text-paper-200">
      <div
        aria-hidden
        className="blob left-[-10%] top-[-20%] h-[420px] w-[420px]"
        style={{ background: 'rgba(201,169,97,0.13)' }}
      />

      {/* ---------- CTA band ---------- */}
      <div className="relative border-b border-paper-100/10">
        <div className="wrap flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
          <div data-reveal>
            <p className="kicker kicker-light">Still deciding?</p>
            <h2 className="display d2 mt-2 max-w-lg text-paper-50">
              Tell us the dates. We&rsquo;ll tell you the truth.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3" data-reveal="right">
            <Link href="/contact" className="btn btn-gold btn-shine">
              Plan my trip
            </Link>
            <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost-light">
              <Phone className="size-4" strokeWidth={2} />
              {SITE.phone.display}
            </a>
          </div>
        </div>
      </div>

      {/* ---------- link columns ---------- */}
      <div className="wrap relative grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Wordmark light />
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-paper-200/70">
            A Ladakh-registered tour operator with an office in Leh, running
            Ladakh journeys since {SITE.founded}. The people planning your trip
            are the people running it.
          </p>

          <div className="mt-5 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" strokeWidth={0} />
              ))}
            </div>
            <span className="text-[12.5px] text-paper-200/70">
              {SITE.stats.rating} from {SITE.stats.reviewCount} reviews
            </span>
          </div>

          <div className="mt-5 flex gap-2.5">
            {[
              [SITE.social.instagram, Instagram, 'Instagram'],
              [SITE.social.facebook, Facebook, 'Facebook'],
            ].map(([href, Icon, label]) => {
              const I = Icon as typeof Instagram;
              return (
                <a
                  key={label as string}
                  href={href as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label as string}
                  className="grid size-10 place-items-center rounded-full border border-paper-100/15 text-paper-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-gold-300"
                >
                  <I className="size-4" strokeWidth={1.8} />
                </a>
              );
            })}
          </div>
        </div>

        <FooterCol title="Destinations" className="md:col-span-2">
          {DESTINATIONS.map((d) => (
            <FooterLink key={d.slug} href={`/destinations/${d.slug}`}>
              {d.name}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="Popular packages" className="md:col-span-3">
          {PACKAGES.slice(0, 6).map((p) => (
            <FooterLink key={p.slug} href={`/packages/${p.slug}`}>
              {p.name} · {p.nights}N
            </FooterLink>
          ))}
          <FooterLink href="/packages">
            <span className="text-gold-300">View all packages →</span>
          </FooterLink>
        </FooterCol>

        <div className="md:col-span-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-50">
            Travel styles
          </h3>
          <ul className="mt-4 space-y-2.5">
            {TRAVEL_STYLES.map((s) => (
              <FooterLink key={s.slug} href={`/travel-styles/${s.slug}`}>
                {s.name}
              </FooterLink>
            ))}
          </ul>

          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-50">
            Planning & Resources
          </h3>
          <ul className="mt-3 space-y-2 text-[13px]">
            <FooterLink href="/plan-my-trip">Custom Itinerary Wizard</FooterLink>
            <FooterLink href="/guides">Travel Guides & Blog</FooterLink>
            <FooterLink href="/hi">हिंदी यात्रा गाइड (Hindi)</FooterLink>
            <FooterLink href="/partner-with-us">Travel agent partners</FooterLink>
          </ul>

          <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-50">
            Reach us
          </h3>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            <li>
              <a
                href={`tel:${SITE.phone.tel}`}
                className="flex items-center gap-2.5 text-paper-200/75 transition-colors hover:text-gold-300"
              >
                <Phone className="size-3.5 shrink-0" strokeWidth={1.8} />
                {SITE.phone.display}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE.email}`}
                className="flex items-center gap-2.5 break-all text-paper-200/75 transition-colors hover:text-gold-300"
              >
                <Mail className="size-3.5 shrink-0" strokeWidth={1.8} />
                {SITE.email}
              </a>
            </li>
            <li className="flex gap-2.5 text-paper-200/60">
              <MapPin className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
              <span>
                {SITE.address.street}, {SITE.address.city}
                <br />
                {SITE.address.region} {SITE.address.postalCode}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-paper-100/10">
        <div className="wrap flex flex-col justify-between gap-3 py-6 text-[11.5px] text-paper-200/50 md:flex-row">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <Link href="/privacy-policy" className="transition-colors hover:text-gold-300">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="transition-colors hover:text-gold-300">
              Terms & Conditions
            </Link>
            <Link href="/cancellation-and-refund-policy" className="transition-colors hover:text-gold-300">
              Cancellation & Refund
            </Link>
            <Link href="/faq" className="transition-colors hover:text-gold-300">
              FAQ
            </Link>
            <Link href="/contact" className="transition-colors hover:text-gold-300">
              Contact
            </Link>
            <span>Planned in Leh, Ladakh.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  className = '',
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-50">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="link-sweep inline-block text-[13px] text-paper-200/75 transition-colors hover:text-gold-300"
      >
        {children}
      </Link>
    </li>
  );
}
