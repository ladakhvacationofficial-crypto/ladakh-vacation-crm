import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Host-based Router for Unified Vercel Deployment.
 * Allows a single Next.js project on Vercel to serve both:
 *   1. The public SEO website on ladakhvacation.in
 *   2. The staff CRM portal on ladakh-vacation-crm.vercel.app (or crm.ladakhvacation.in)
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const { pathname } = request.nextUrl;

  // Ignore static assets, next internals, api routes, and public files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if request is coming from an explicit CRM subdomain (e.g. crm.ladakhvacation.in)
  const isCrmDomain =
    host.startsWith('crm.') ||
    host.startsWith('admin.');

  if (isCrmDomain) {
    // When visiting the root of the CRM domain, automatically show /login
    if (pathname === '/') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
