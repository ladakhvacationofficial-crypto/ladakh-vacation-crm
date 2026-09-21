/**
 * Shared types for the page health audit.
 *
 * Every check records what it rests on. `google` checks follow published
 * Google Search documentation, linked in docUrl. `house` checks are Ladakh Vacation's
 * own people-first standards that Google does not document as signals; they
 * carry little weight and the dashboard labels them as such.
 */

export type CheckCategory = 'indexing' | 'content' | 'appearance' | 'experience' | 'links';
export type CheckSeverity = 'pass' | 'warn' | 'fail' | 'na';
export type CheckBasis = 'google' | 'house';

/**
 * Why a check did not score. `not-applicable` checks never count; a
 * `not-measured` check could apply but lacked data (no PageSpeed key, a
 * single-page audit without crawl data), which lowers the score's coverage.
 */
export type NotScoredReason = 'not-applicable' | 'not-measured';

export interface CheckResult {
  id: string;
  label: string;
  category: CheckCategory;
  severity: CheckSeverity;
  weight: number;
  /** Points earned: the weight for pass, half for warn, nothing for fail or na. */
  score: number;
  basis: CheckBasis;
  /** `page` checks come from this page alone, `site` checks from the whole crawl. */
  scope: 'page' | 'site';
  /** A failed gate means Google cannot index the page, which caps the score. */
  gate?: boolean;
  na?: NotScoredReason;
  detail?: string;
  task?: string;
  docUrl?: string;
}

/** Bumped when checks or weights change incompatibly; older audits need a re-audit. */
export const AUDIT_VERSION = 2;

export function pointsFor(severity: CheckSeverity, weight: number): number {
  if (severity === 'pass') return weight;
  if (severity === 'warn') return weight / 2;
  return 0;
}

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  indexing: 'Crawling and indexing',
  content: 'Helpful content',
  appearance: 'Search appearance',
  experience: 'Page experience',
  links: 'Internal links',
};

/** Google documentation each check cites. Every URL verified to resolve. */
export const DOCS = {
  starterGuide: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide',
  helpfulContent: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
  spamPolicies: 'https://developers.google.com/search/docs/essentials/spam-policies',
  pageExperience: 'https://developers.google.com/search/docs/appearance/page-experience',
  vitals: 'https://web.dev/articles/vitals',
  titleLinks: 'https://developers.google.com/search/docs/appearance/title-link',
  snippets: 'https://developers.google.com/search/docs/appearance/snippet',
  images: 'https://developers.google.com/search/docs/appearance/google-images',
  links: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  robots: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt',
  sitemaps: 'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
  canonical: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  noindex: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
  structuredData: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
  reviewSnippet: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet',
  article: 'https://developers.google.com/search/docs/appearance/structured-data/article',
  localized: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
  httpStatus: 'https://developers.google.com/search/docs/crawling-indexing/http-network-errors',
  mobile: 'https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing',
} as const;
