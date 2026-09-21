import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Clock, ArrowUpRight, UserCheck } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { HINDI_PAGES } from '@/lib/hindi-pages';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'कश्मीर यात्रा गाइड एवं टूर पैकेज (हिंदी में) — Ladakh Vacation',
  description:
    'कश्मीर के प्रमुख पर्यटन स्थल, मौसम, बर्फबारी का समय, दिल्ली से टूर पैकेज और वैष्णो देवी यात्रा की पूरी जानकारी हिंदी में।',
  alternates: { canonical: '/hi' },
};

export default function HindiIndexPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'हिंदी यात्रा गाइड — Ladakh Vacation',
    description: 'कश्मीर और हिमालय की संपूर्ण यात्रा जानकारी हिंदी में।',
    url: `${SITE.domain}/hi`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="स्थानीय ज्ञान व प्रामाणिक जानकारी"
        title="कश्मीर यात्रा गाइड (हिंदी में)"
        lede="श्रीनगर स्थित हमारे स्थानीय टूर विशेषज्ञों द्वारा तैयार किए गए प्रामाणिक गाइड: दर्शनीय स्थल, यात्रा खर्च, मौसम और पैकेज।"
        crumbs={[
          { label: 'होम', href: '/' },
          { label: 'हिंदी गाइड' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap">
          <div className="grid md:grid-cols-2 gap-8">
            {HINDI_PAGES.map((page) => (
              <article key={page.urlPath} className="glass-panel card-tilt rounded-3xl overflow-hidden flex flex-col justify-between">
                <Link href={page.urlPath} className="zoom-wrap relative block aspect-[16/9] overflow-hidden">
                  <img
                    src={page.image}
                    alt={page.title}
                    className="zoom-img object-cover w-full h-full"
                  />
                  <span className="badge badge-accent absolute top-4 left-4">
                    {page.destinationName}
                  </span>
                </Link>
                <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-ink-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {page.readingTime}
                      </span>
                      <span>•</span>
                      <span>लेखक: {page.author}</span>
                    </div>
                    <h3 className="display text-2xl font-bold text-ink-950">
                      <Link href={page.urlPath} className="hover:text-pine-700 transition-colors">
                        {page.title}
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-600 line-clamp-3">
                      {page.summary}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-paper-200">
                    <Link
                      href={page.urlPath}
                      className="link-sweep inline-flex items-center gap-1.5 font-semibold text-pine-700 text-sm"
                    >
                      <span>पूरा गाइड पढ़ें</span>
                      <ArrowUpRight className="size-4 text-gold-600" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
