import type { Metadata } from 'next';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { SITE, whatsAppLink } from '@/lib/site';
import { JsonLd } from '@/components/cards';
import { PageHero } from '@/components/page-hero';
import { EnquiryForm } from '@/components/enquiry-form';

export const metadata: Metadata = {
  title: 'Contact Us — Talk to a Kashmir Travel Specialist',
  description: `Contact Ladakh Vacation. WhatsApp or call ${SITE.phone.display}, email ${SITE.email}, or send an enquiry. Our Srinagar team replies within hours, ${SITE.hours}.`,
  alternates: { canonical: '/contact' },
};

const CHANNELS = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: SITE.phone.display,
    note: 'Fastest. Usually a reply within minutes during working hours.',
    href: whatsAppLink('a Himalayan holiday'),
    external: true,
    accent: 'bg-[#25D366] text-white',
  },
  {
    icon: Phone,
    label: 'Call us',
    value: SITE.phone.display,
    note: 'For anything urgent, or if you would rather just talk it through.',
    href: `tel:${SITE.phone.tel}`,
    external: false,
    accent: 'bg-gold-400 text-ink-950',
  },
  {
    icon: Mail,
    label: 'Email',
    value: SITE.email,
    note: 'Best for detailed briefs, group bookings and corporate enquiries.',
    href: `mailto:${SITE.email}`,
    external: false,
    accent: 'bg-pine-700 text-paper-50',
  },
];

export default function ContactPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Contact ${SITE.name}`,
      url: `${SITE.domain}/contact`,
      mainEntity: { '@id': `${SITE.domain}/#org` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.domain },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE.domain}/contact` },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Get in touch"
        title="Talk to someone who's actually in Kashmir."
        lede={`Our office is in Hawal, Srinagar. We are on WhatsApp ${SITE.hours} and the person who replies is the person who will run your trip.`}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        background="linear-gradient(180deg, rgba(6,12,16,0.40) 0%, rgba(6,12,16,0.92) 100%), radial-gradient(140% 120% at 26% 8%, #3b7183 0%, #17384a 46%, #060e14 100%)"
      />

      <section className="mesh-warm section-sm">
        <div className="wrap grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div data-reveal-group className="space-y-4">
              {CHANNELS.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="lift edge-gold group flex gap-4 rounded-2xl border border-paper-300 bg-white p-5 shadow-sm"
                >
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-xl ${c.accent} transition-transform duration-500 group-hover:scale-110`}
                  >
                    <c.icon className="size-5" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      {c.label}
                    </p>
                    <p className="mt-1 break-all text-[15.5px] font-medium text-ink-900">
                      {c.value}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
                      {c.note}
                    </p>
                  </div>
                </a>
              ))}

              <div className="rounded-2xl border border-paper-300 bg-paper-100 p-5">
                <div className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-paper-300 text-ink-700">
                    <MapPin className="size-5" strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      Office
                    </p>
                    <p className="mt-1 text-[15px] leading-snug text-ink-900">
                      {SITE.address.street}, {SITE.address.city}
                      <br />
                      {SITE.address.region} {SITE.address.postalCode}
                    </p>
                    <p className="mt-2.5 inline-flex items-center gap-2 text-[12.5px] text-ink-600">
                      <Clock className="size-3.5 text-gold-600" strokeWidth={2} />
                      {SITE.hours}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              data-reveal
              className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 p-5"
            >
              <p className="text-[13px] leading-relaxed text-ink-700">
                <strong className="font-semibold text-ink-900">
                  Planning for peak season?
                </strong>{' '}
                Hotels in Gulmarg and Pahalgam for May–June and the Pangong camps for
                July–August book out months ahead. Message us early even if your dates
                are not final &mdash; we will tell you what needs locking in first.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              data-reveal="right"
              className="rounded-2xl border border-paper-300 bg-white p-6 shadow-lg md:p-9"
            >
              <p className="kicker">Free itinerary</p>
              <h2 className="display d3 mt-2 text-ink-900">Send us an enquiry.</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
                Two minutes to fill, and you get a custom itinerary with honest
                pricing back within a few hours. No obligation.
              </p>
              <div className="mt-7">
                <EnquiryForm source="contact_page" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
