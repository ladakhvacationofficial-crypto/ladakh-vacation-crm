import type { Metadata } from 'next';
import { ShieldCheck, Car, Building2, Headphones, Sparkles, CheckCircle2 } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { EnquiryForm } from '@/components/enquiry-form';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Travel Agent Partners — Ground Operations in Ladakh',
  description:
    'Partner with Ladakh Vacation for ground operations in Ladakh: a Leh-based team with direct relationships with drivers, camps and hotels, environmental fees and permits handled, and 24×7 on-ground support.',
  alternates: { canonical: '/partner-with-us' },
};

export default function PartnerWithUsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Ground operations in Ladakh for travel agents',
    provider: { '@id': `${SITE.domain}/#org` },
    description: 'Ground operations in Ladakh for travel agents across India: vehicles, stays, permits and on-ground support from a Leh-based team.',
    url: `${SITE.domain}/partner-with-us`,
  };

  const advantages = [
    {
      icon: Car,
      title: 'Private 4×4s, Ladakhi drivers',
      desc: 'Innova Crysta or Xylo with drivers who run these passes every week of the season, each vehicle carrying oxygen, an oximeter and a first-aid kit.',
    },
    {
      icon: Building2,
      title: 'Direct relationships with stays',
      desc: 'Hotels in Leh and camps at Nubra, Pangong and Sarchu that we deal with directly and have personally inspected. No chain of commissions in between.',
    },
    {
      icon: ShieldCheck,
      title: 'Permits, handled',
      desc: 'The Ladakh environmental fee for Indian guests, and Protected Area Permits for foreign nationals, for Nubra, Pangong, Hanle, Tso Moriri and Umling La, paid and printed before your clients arrive.',
    },
    {
      icon: Headphones,
      title: 'A named coordinator in Leh',
      desc: 'One point of contact in Leh for airport transfers, check-ins, route changes when a pass closes, and on-ground assistance 24×7.',
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="B2B Travel Partner Network"
        title="Your ground team in Ladakh"
        lede="Sell Ladakh with a Leh-based team running the ground for you: vehicles, stays, permits and a coordinator who is actually in Leh."
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
                  The local team your clients need at 3,500 m
                </h2>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink-700 max-w-xl">
                  Selling Ladakh from Mumbai, Delhi, Ahmedabad or Bengaluru means answering for permits, altitude, closed passes and camps you have never seen. We handle all of that on the ground, and sequence every route by altitude so your clients have the trip you sold them.
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
                  <Sparkles className="size-4" /> Partner rates and terms
                </div>
                <p className="text-[14px] leading-relaxed text-paper-200/80">
                  Net rates for travel agents, itemised so you can see what each night and each vehicle costs. Tell us about your agency and the trips you sell, and we will send our rates and terms.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[13px] text-paper-100">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-gold-400" /> Same-day quotes</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-gold-400" /> Itemised pricing</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="glass-panel glow-gold rounded-3xl p-7 md:p-9 border border-gold-400/30">
                <p className="kicker">Register Your Agency</p>
                <h3 className="display d3 mt-1 text-ink-950">Request partner rates</h3>
                <p className="mt-2 text-[13.5px] text-ink-600">
                  Send your agency details and we will come back with our partner rates and terms.
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
