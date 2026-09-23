/**
 * Canonical hosts for the two public surfaces.
 *
 * The site is served at the bare domain ladakhvacation.in; www is redirected
 * onto it, so any URL still pointing at www costs a redirect hop and, in the
 * SEO dashboard, would show a second copy of the site.
 *
 * Build public URLs from here rather than hardcoding a host. Hardcoding is how
 * the two domains drifted apart across the SEO module, the PDF templates and
 * the CRM in the first place.
 */

/**
 * Public NAP. The website's site.ts is the other copy; these two must stay
 * the same. There is no GSTIN in the repo, so tax invoices name the business
 * and stop there rather than inventing a registration number.
 */
export const COMPANY = {
  name: 'Ladakh Vacation',
  street: 'Main Bazaar',
  city: 'Leh',
  region: 'Ladakh',
  postalCode: '194101',
  phoneDisplay: '+91 96229 55386',
  email: 'ladakhvacation@gmail.com',
  website: 'www.ladakhvacation.in',
} as const;

/** Public marketing site (Next.js on Vercel). */
export const SITE_DOMAIN = 'https://ladakhvacation.in';

/** Hosts retired in favour of SITE_DOMAIN. */
export const LEGACY_HOSTS = ['www.ladakhvacation.in'];

/**
 * Internal CRM origin, used to build links inside transactional email.
 *
 * Read from CRM_BASE_URL because the deployed origin is set per environment
 * (Render holds the production value) and is not knowable from the repo. The
 * fallback is a guess — set the env var in any environment that sends mail, or
 * password-reset links will point at a host that may not resolve.
 */
export function crmBaseUrl(configured?: string | null): string {
  return (configured || 'https://ladakh-vacation-crm.vercel.app').replace(/\/+$/, '');
}

/** Rewrite a URL onto the canonical host, leaving its path and query intact. */
export function toCanonicalHost(url: string): string {
  try {
    const u = new URL(url);
    if (LEGACY_HOSTS.includes(u.hostname)) {
      u.protocol = 'https:';
      u.hostname = new URL(SITE_DOMAIN).hostname;
    }
    return u.toString();
  } catch {
    return url;
  }
}
