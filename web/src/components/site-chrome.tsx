'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/wa-float';

/**
 * Conditionally renders public site chrome (header, footer, WhatsApp float).
 * Automatically suppresses them on CRM and Auth routes so that the CRM
 * remains dedicated, clean, and distraction-free.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  const isCrmRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/leads') ||
    pathname.startsWith('/itineraries') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/finance') ||
    pathname.startsWith('/vendors') ||
    pathname.startsWith('/people') ||
    pathname.startsWith('/marketing') ||
    pathname.startsWith('/seo') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/b2b-partners') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/interviews') ||
    pathname.startsWith('/attribution');

  if (isCrmRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
