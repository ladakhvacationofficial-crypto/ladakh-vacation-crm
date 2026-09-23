'use client';

import { VisitTracker } from '@/components/visit-tracker';
import { usePathname } from 'next/navigation';
import { isCrmPath } from '@/lib/crm-routes';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WhatsAppFloat } from '@/components/wa-float';

/**
 * Conditionally renders public site chrome (header, footer, WhatsApp float).
 * Suppresses them on every staff route listed in `lib/crm-routes`, which the
 * middleware reads too, so the two can never disagree about what is CRM.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  const isCrmRoute = isCrmPath(pathname);

  if (isCrmRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <VisitTracker />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
