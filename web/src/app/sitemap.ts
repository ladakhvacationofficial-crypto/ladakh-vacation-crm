import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { PACKAGES } from '@/lib/packages';
import { TRAVEL_STYLES } from '@/lib/travel-styles';
import { GUIDES } from '@/lib/guides';
import { COLLECTIONS } from '@/lib/collections';
import { ORIGIN_CITIES } from '@/lib/origin-cities';
import { ROUTES } from '@/lib/routes';
import { MONTH_HUBS } from '@/lib/month-hubs';
import { HINDI_PAGES } from '@/lib/hindi-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: SITE.domain, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.domain}/destinations`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.domain}/packages`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.domain}/plan-my-trip`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.domain}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE.domain}/hi`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE.domain}/routes`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE.domain}/partner-with-us`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE.domain}/reviews`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.domain}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.domain}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE.domain}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.domain}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.domain}/terms-and-conditions`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE.domain}/cancellation-and-refund-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const destinations: MetadataRoute.Sitemap = DESTINATIONS.map((d) => ({
    url: `${SITE.domain}/destinations/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // Highest-intent pages on the site — highest priority after the home page.
  const packages: MetadataRoute.Sitemap = PACKAGES.map((p) => ({
    url: `${SITE.domain}/packages/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const styles: MetadataRoute.Sitemap = TRAVEL_STYLES.map((s) => ({
    url: `${SITE.domain}/travel-styles/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const guides: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE.domain}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  /**
   * Curated package collections. These share the flat /packages/<slug> space
   * with individual packages and target commercial queries that already
   * convert in paid search, so they carry the same priority.
   */
  const collections: MetadataRoute.Sitemap = COLLECTIONS.map((c) => ({
    url: `${SITE.domain}/packages/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  /** Origin-city landing pages — the highest-converting template we run. */
  const originCities: MetadataRoute.Sitemap = ORIGIN_CITIES.map((c) => ({
    url: `${SITE.domain}/packages/from/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  /** Month hubs — one deep page per place, replacing 108 thin month pages. */
  const monthHubs: MetadataRoute.Sitemap = MONTH_HUBS.map((m) => ({
    url: `${SITE.domain}/guides/by-month/${m.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const routes: MetadataRoute.Sitemap = ROUTES.map((r) => ({
    url: `${SITE.domain}/routes/${r.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const hindiPages: MetadataRoute.Sitemap = HINDI_PAGES.map((h) => ({
    url: `${SITE.domain}${h.urlPath}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    ...statics,
    ...destinations,
    ...packages,
    ...collections,
    ...originCities,
    ...styles,
    ...guides,
    ...monthHubs,
    ...routes,
    ...hindiPages,
  ];
}
