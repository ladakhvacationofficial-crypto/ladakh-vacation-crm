import type { Metadata } from 'next';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { SITE } from '@/lib/site';
import { REVIEWS } from '@/lib/reviews';
import { ReviewCard, SectionHead, JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';

export const metadata: Metadata = {
  title: 'Guest Reviews — What Travellers Say About Ladakh Vacation',
  description: `What travellers say about their Ladakh trips with Ladakh Vacation. Rated ${SITE.stats.rating} out of 5 across ${SITE.stats.reviewCount.toLocaleString('en-IN')}+ reviews on Google.`,
  alternates: { canonical: '/reviews' },
};

export default function ReviewsPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
        { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${SITE.domain}/reviews` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker={`${SITE.stats.rating} out of 5 · ${SITE.stats.reviewCount} reviews`}
        title="The reviews are the itinerary."
        lede="A few of the things travellers have told us after their trips. The full, unfiltered set lives on our Google Business Profile."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]}
        background="linear-gradient(180deg, rgba(10,8,4,0.42) 0%, rgba(10,8,4,0.92) 100%), radial-gradient(140% 120% at 30% 8%, #a8842f 0%, #634d22 46%, #120d04 100%)"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-6 fill-gold-400 text-gold-400" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[14px] text-paper-200/75">
            Averaged across Google and direct guest feedback
          </span>
        </div>
      </PageHero>

      <section className="mesh-warm section">
        <div className="wrap">
          <div data-reveal-group className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <ReviewCard key={r.author} r={r} />
            ))}
          </div>

          <p data-reveal className="mx-auto mt-12 max-w-xl text-center text-[13px] leading-relaxed text-ink-500">
            Every review above is from a guest who travelled with us. We will not
            publish a testimonial we cannot trace to a real booking, which is why
            there are fewer of them here than on most travel sites.
          </p>
        </div>
      </section>

      <section className="section border-t border-paper-200 bg-paper-100">
        <div className="wrap grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <SectionHead
              kicker="Your turn"
              title="Let's make the next one."
              lede="Tell us the dates and the group. We reply with a real itinerary, not a brochure."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/packages" className="btn btn-ghost">
                Browse packages
              </Link>
              <Link href="/destinations" className="btn btn-ghost">
                Explore destinations
              </Link>
            </div>
          </div>
          <div data-reveal="right" className="rounded-2xl border border-paper-300 bg-white p-6 shadow-md md:p-8">
            <EnquiryForm source="reviews_page" />
          </div>
        </div>
      </section>
    </>
  );
}
