import type { Metadata } from 'next';
import { PageHero } from '@/components/page-hero';
import { JsonLd } from '@/components/cards';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy — Ladakh Vacation',
  description:
    'Learn how Ladakh Vacation collects, protects, and manages customer travel enquiry data, cookies, and communications in accordance with data protection standards.',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy — Ladakh Vacation',
    description: 'Privacy Policy and data protection terms for Ladakh Vacation.',
    url: `${SITE.domain}/privacy-policy`,
    publisher: { '@id': `${SITE.domain}/#org` },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHero
        kicker="Transparency & Trust"
        title="Privacy Policy"
        lede="We respect your privacy. Here is a clear, plain-language breakdown of what information we collect when you plan a holiday with us and how we protect it."
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Privacy Policy' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap max-w-4xl">
          <div className="glass-panel rounded-3xl p-8 md:p-12 space-y-10 text-ink-800">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-600 font-semibold">
                Last updated: August 2026
              </p>
              <h2 className="display d3 mt-2 text-ink-950">1. Information We Collect</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                When you request a quotation or enquire about a tour package through our website, we collect:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1.5 text-[14.5px] text-ink-700">
                <li><strong>Contact Information:</strong> Full name, mobile/WhatsApp number, and email address.</li>
                <li><strong>Trip Preferences:</strong> Intended destination, travel dates, party size, and custom requirements.</li>
                <li><strong>Technical & Attribution Data:</strong> IP address, device type, browser, referring URL, and campaign parameters (UTMs) to evaluate marketing efficiency.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">2. How We Use Your Information</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                We use your details strictly for facilitating your travel journey:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1.5 text-[14.5px] text-ink-700">
                <li>Designing tailored day-by-day travel itineraries and generating transparent price estimates.</li>
                <li>Connecting you with an assigned Srinagar-based tour specialist via phone, WhatsApp, or email.</li>
                <li>Processing hotel, houseboat, and local transport bookings upon quotation confirmation.</li>
                <li><strong>Strict Supplier Protection:</strong> We never sell, rent, or trade your personal information to third-party marketing databases.</li>
              </ul>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">3. Cookies & Analytics</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                Our site uses first-party functional session cookies and Google Tag Manager (GTM) to understand website performance and improve page speed. You can configure your browser to reject cookies without affecting your ability to browse our itineraries or contact our desk.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">4. Data Retention & Security</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                All lead and booking records are securely stored on encrypted servers with role-based staff access restrictions. If you would like us to update or delete your contact records from our enquiry database, simply email our data privacy team at{' '}
                <a href={`mailto:${SITE.email}`} className="text-pine-600 font-medium underline underline-offset-4 hover:text-gold-600">
                  {SITE.email}
                </a>.
              </p>
            </div>

            <div className="border-t border-paper-300 pt-8">
              <h2 className="display d3 text-ink-950">5. Contact Our Privacy Officer</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                For questions regarding our privacy practices or data handling policies, reach us at:
              </p>
              <div className="mt-4 p-5 rounded-2xl bg-paper-100 border border-paper-200 text-[14px] text-ink-800">
                <p className="font-semibold text-ink-950">{SITE.legalName}</p>
                <p>{SITE.address.street}, {SITE.address.city}, {SITE.address.region} {SITE.address.postalCode}, India</p>
                <p className="mt-1">Direct: {SITE.phone.display} · Email: {SITE.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
