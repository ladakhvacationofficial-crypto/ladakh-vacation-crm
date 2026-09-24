/**
 * The staff area's top-level paths, in one place.
 *
 * Two things read this list, and they must agree: `middleware.ts` marks these
 * paths noindex, and `SiteChrome` keeps the public header, footer and WhatsApp
 * button off them. When the two lists were maintained separately, a new CRM
 * screen (/follow-ups, /reports, /integrations) shipped with the public site's
 * header and footer wrapped around it.
 *
 * Every folder in `src/app/(app)` must appear here. `scripts/sync-crm.mjs`
 * fails the build if one is missing, so adding a CRM screen cannot silently
 * leak the public chrome again.
 */
export const CRM_ROUTE_SEGMENTS = [
  // authentication, which lives outside the (app) group
  'login',
  'forgot-password',
  'reset-password',
  // the staff app
  'attribution',
  'b2b-partners',
  'bookings',
  'dashboard',
  'finance',
  'fleet',
  'follow-ups',
  'integrations',
  'interviews',
  'invoices',
  'itineraries',
  'leads',
  'marketing',
  'people',
  'permits',
  'reports',
  'seo',
  'settings',
  'users',
  'vendors',
] as const;

/** True for any path inside the staff area, e.g. `/leads/abc123`. */
export function isCrmPath(pathname: string): boolean {
  const segment = pathname.split('/')[1] ?? '';
  return (CRM_ROUTE_SEGMENTS as readonly string[]).includes(segment);
}
