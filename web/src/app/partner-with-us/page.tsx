import type { Metadata } from 'next';
import { ShieldCheck, Car, Building2, Headphones, Sparkles, CheckCircle2 } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'B2B Travel Agent Partner Program — Ground DMC for Kashmir & Ladakh',
  description:
    'Partner directly with Ladakh Vacation as your local ground DMC in Srinagar & Leh. Guaranteed hotel allocations, dedicated commercial fleet, white-label client vouchers, and 24/7 on-ground assistance.',
  alternates: { canonical: '/partner-with-us' },
};

export default function PartnerWithUsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'B2B Travel Agent Ground DMC Service',
    provider: { '@id': `${SITE.domain}/#org` },
    description: 'Ground destination management services in Kashmir and Ladakh for retail travel agents across India.',
    url: `${SITE.domain}/partner-with-us`,
  };

  const advantages = [
    {
      icon: Car,
      title: 'Company-Owned Fleet & Union Protection',
      desc: 'Dedicated Innovas, Crystas, Tempo Travellers, and 4x4 snow-chain equipped vehicles without third-party taxi union disputes.',
    },
    {
      icon: Building2,
      title: 'Guaranteed Peak Season Room Inventory',
      desc: 'Contracted allocations across leading 3★, 4★, and 5★ heritage luxury hotels and Nigeen Lake luxury houseboats in Srinagar, Gulmarg, and Pahalgam.',
    },
    {
      icon: ShieldCheck,
      title: '100% White-Label Client Protection',
      desc: 'All hotel vouchers, arrival welcome boards, and transport itineraries carry your travel agency logo and branding. Your client stays your client.',
    },
    {
      icon: Headphones,
      title: 'Dedicated Srinagar On-Ground Ops Manager',
      desc: 'A single point of contact in Srinagar coordinating daily airport transfers, hotel check-ins, Gondola tickets, and emergency assistance 24/7.',
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="B2B Travel Partner Network"
        title="Your Ground DMC Partner in Kashmir & Ladakh"
        lede="Join 120+ retail travel agencies across India who trust Ladakh Vacation to manage their clients on the ground with zero friction and guaranteed service quality."
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Partner With Us' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap">
          <div className="grid gap-12 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-12">
              <div>
                <p className="kicker">Why Retail Agents Choose Us</p>
                <h2 className="display d2 mt-2 text-ink-950">
                  The Local Advantage Your Agency Needs in the Valley
                </h2>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700 max-w-xl">
                  Selling Kashmir and Ladakh from Mumbai, Delhi, Ahmedabad, or Bangalore can be fraught with unpredictable union taxi rules, sold-out Gondola tickets, and remote hotel communication. We eliminate that friction.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {advantages.map((adv) => {
                  const Icon = adv.icon;
                  return (
                    <div key={adv.title} className="glass-panel card-tilt rounded-2xl p-6">
                      <div className="size-11 rounded-xl bg-gold-100 grid place-items-center text-gold-700">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-semibold text-[16px] text-ink-950 mt-4">{adv.title}</h3>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{adv.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-7 rounded-2xl bg-pine-900 text-paper-50 space-y-4">
                <div className="flex items-center gap-2 text-gold-300 font-semibold text-[14px]">
                  <Sparkles className="size-4" /> B2B Partner Commission & Credit Terms
                </div>
                <p className="text-[14px] leading-relaxed text-paper-200/80">
                  We offer competitive net B2B DMC tariffs, transparent margin calculations, flexible payment cycles for verified agency partners, and seasonal volume milestone rebates.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[13px] text-paper-100">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-gold-400" /> Instant Turnaround Quotes</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-gold-400" /> GST-compliant B2B Invoices</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="glass-panel glow-gold rounded-3xl p-7 md:p-9 border border-gold-400/30">
                <p className="kicker">Register Your Agency</p>
                <h3 className="display d3 mt-1 text-ink-950">Request B2B Tariff Sheet</h3>
                <p className="mt-2 text-[13.5px] text-ink-600">
                  Fill in your agency details to receive our seasonal confidential B2B rates and assign a dedicated relationship manager.
                </p>

                <div className="mt-6">
                  <EnquiryForm source="B2B_PARTNER_PORTAL" packageName="B2B Agent Partnership" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
