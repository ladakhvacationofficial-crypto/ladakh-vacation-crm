import { PageFacts, parsePage } from './audit-html';
import { FetchOutcome, RobotsContext } from './audit-checks';
import { RobotsFile, checkRobots, parseRobots } from './audit-robots';
import { LastmodSummary, SitemapEntry, parseSitemap, summariseLastmod } from './audit-sitemap';
import { ParsedPsi, parsePsi } from './audit-vitals';
import { SitePageInput } from './audit-site';
import { normalizePageUrl } from './search-console-mapping';
import { SITE_DOMAIN } from '../common/site';

/**
 * Network side of the audit: pages, robots.txt, sitemaps and PageSpeed
 * Insights. No database access, so a dry run can use it unchanged.
 */

export const AUDIT_USER_AGENT = `Ladakh VacationSEOAudit/2.0 (+${SITE_DOMAIN})`;

const MAX_HTML_CHARS = 3_000_000;
const MAX_SITEMAP_FILES = 25;

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '');

export function sameSite(url: string, host: string): boolean {
  try {
    return bareHost(new URL(url).hostname) === bareHost(host);
  } catch {
    return false;
  }
}

async function discard(res: Response): Promise<void> {
  await res.body?.cancel().catch(() => undefined);
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

// ============================================================================
// Pages
// ============================================================================

export interface FetchedPage {
  outcome: FetchOutcome;
  html: string | null;
}

/**
 * Fetch a page, following redirects by hand so the final URL is known. A page
 * that only resolves after a redirect is a finding, not a success.
 */
export async function fetchPage(url: string, timeoutMs = 20_000, maxRedirects = 5): Promise<FetchedPage> {
  let current = url;
  const failed = (error: string, status = 0): FetchedPage => ({
    outcome: { status, finalUrl: current, xRobotsTag: null, contentType: null, error },
    html: null,
  });

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': AUDIT_USER_AGENT, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      return failed((e as Error).message);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await discard(res);
      if (!location) return failed('Redirect without a Location header', res.status);
      try {
        current = new URL(location, current).toString();
      } catch {
        return failed(`Invalid redirect target: ${location}`, res.status);
      }
      continue;
    }

    const contentType = res.headers.get('content-type');
    const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType ?? '');
    let html: string | null = null;
    if (res.status === 200 && isHtml) html = (await res.text()).slice(0, MAX_HTML_CHARS);
    else await discard(res);

    return {
      outcome: {
        status: res.status,
        finalUrl: current,
        xRobotsTag: res.headers.get('x-robots-tag'),
        contentType,
        error: null,
      },
      html,
    };
  }
  return failed(`More than ${maxRedirects} redirects`);
}

// ============================================================================
// robots.txt and sitemaps
// ============================================================================

export interface RobotsFetch {
  file: RobotsFile | null;
  state: RobotsContext['state'];
}

export async function fetchRobots(origin: string): Promise<RobotsFetch> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': AUDIT_USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 200) return { file: parseRobots(await res.text()), state: 'ok' };
    await discard(res);
    // Google treats every 4xx except 429 as if there were no robots.txt.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return { file: null, state: 'missing' };
    return { file: null, state: 'unavailable' };
  } catch {
    return { file: null, state: 'unavailable' };
  }
}

export function robotsContextFor(robots: RobotsFetch, url: string): RobotsContext {
  if (!robots.file) return { state: robots.state, allowed: true, rule: null };
  const u = new URL(url);
  const verdict = checkRobots(robots.file, 'googlebot', `${u.pathname}${u.search}`);
  return { state: robots.state, allowed: verdict.allowed, rule: verdict.rule?.path ?? null };
}

export interface SitemapFetch {
  /** Normalised same-site URLs, or null when no sitemap could be read. */
  urls: Set<string> | null;
  entries: SitemapEntry[];
  lastmod: LastmodSummary | null;
  error: string | null;
}

export async function fetchSitemaps(origin: string, declared: string[], host: string): Promise<SitemapFetch> {
  const queue = declared.length ? [...declared] : [`${origin}/sitemap.xml`];
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  let error: string | null = null;
  let readAny = false;

  while (queue.length && seen.size < MAX_SITEMAP_FILES) {
    const loc = queue.shift()!;
    if (seen.has(loc)) continue;
    seen.add(loc);
    try {
      const res = await fetch(loc, { headers: { 'User-Agent': AUDIT_USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        error = `${loc} returned ${res.status}`;
        await discard(res);
        continue;
      }
      const parsed = parseSitemap(await res.text());
      if (parsed.kind === 'sitemapindex') {
        readAny = true;
        queue.push(...parsed.entries.map((e) => e.loc));
      } else if (parsed.kind === 'urlset') {
        readAny = true;
        entries.push(...parsed.entries);
      } else {
        error = `${loc} is not a sitemap`;
      }
    } catch (e) {
      error = `${loc}: ${(e as Error).message}`;
    }
  }

  if (!readAny) return { urls: null, entries: [], lastmod: null, error: error ?? 'No sitemap found' };
  const own = entries.filter((e) => sameSite(e.loc, host));
  return {
    urls: new Set(own.map((e) => normalizePageUrl(e.loc))),
    entries: own,
    lastmod: summariseLastmod(own),
    error,
  };
}

// ============================================================================
// PageSpeed Insights
// ============================================================================

export type PsiOutcome = { ok: true; parsed: ParsedPsi } | { ok: false; status: number; message: string };

export function pageSpeedKey(): string | null {
  return process.env.PAGESPEED_API_KEY?.trim() || null;
}

/** Performance category only: accessibility and best-practice scores are not ranking signals. */
export async function runPageSpeed(url: string, apiKey: string | null, timeoutMs = 90_000): Promise<PsiOutcome> {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('category', 'performance');
  if (apiKey) endpoint.searchParams.set('key', apiKey);
  try {
    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(timeoutMs) });
    const body: any = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, message: String(body?.error?.message ?? `HTTP ${res.status}`).slice(0, 200) };
    }
    return { ok: true, parsed: parsePsi(body) };
  } catch (e) {
    return { ok: false, status: 0, message: (e as Error).message };
  }
}

// ============================================================================
// Site crawl
// ============================================================================

export interface CrawlTarget {
  url: string;
  family: string | null;
  tier: number | null;
  targetKeyword: string | null;
  adsImpressions: number | null;
  source: 'home' | 'manifest' | 'crawl-path' | 'sitemap';
}

export interface CrawledPage extends CrawlTarget {
  /** normalizePageUrl(url). */
  key: string;
  fetched: FetchOutcome;
  facts: PageFacts | null;
}

export interface SiteCrawl {
  origin: string;
  host: string;
  robots: RobotsFetch;
  sitemap: SitemapFetch;
  pages: CrawledPage[];
  /** More pages were found than maxPages allowed. */
  truncated: boolean;
}

export function isIndexablePage(p: CrawledPage): boolean {
  return !!p.facts && p.fetched.status === 200 && normalizePageUrl(p.fetched.finalUrl) === p.key;
}

/**
 * Crawl the given targets plus every same-site URL in the sitemap. Links are
 * not followed beyond that: the manifest and sitemap define the site, and a
 * page linked from neither is reported through the inbound link check.
 */
export async function crawlSite(
  siteUrl: string,
  targets: CrawlTarget[],
  opts: { maxPages?: number; concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<SiteCrawl> {
  const base = new URL(siteUrl);
  const robots = await fetchRobots(base.origin);
  const sitemap = await fetchSitemaps(base.origin, robots.file?.sitemaps ?? [], base.hostname);

  const byKey = new Map<string, CrawlTarget>();
  for (const t of targets) {
    if (!sameSite(t.url, base.hostname)) continue;
    const key = normalizePageUrl(t.url);
    if (!byKey.has(key)) byKey.set(key, t);
  }
  for (const e of sitemap.entries) {
    const key = normalizePageUrl(e.loc);
    if (byKey.has(key)) continue;
    try {
      byKey.set(key, {
        url: new URL(e.loc).toString(),
        family: null,
        tier: null,
        targetKeyword: null,
        adsImpressions: null,
        source: 'sitemap',
      });
    } catch {
      // Unparseable <loc>; nothing to crawl.
    }
  }

  const all = [...byKey.entries()];
  const maxPages = opts.maxPages ?? 600;
  const list = all.slice(0, maxPages);
  let done = 0;

  const pages = await mapPool(list, opts.concurrency ?? 4, async ([key, target]) => {
    const { outcome, html } = await fetchPage(target.url);
    let facts: PageFacts | null = null;
    if (html) {
      try {
        facts = parsePage(html, outcome.finalUrl);
      } catch {
        facts = null;
      }
    }
    opts.onProgress?.(++done, list.length);
    return { ...target, key, fetched: outcome, facts };
  });

  return { origin: base.origin, host: base.hostname, robots, sitemap, pages, truncated: all.length > maxPages };
}

/** Inputs for cross-page analysis: pages that resolved to themselves with HTML. */
export function siteInputs(crawl: SiteCrawl): SitePageInput[] {
  return crawl.pages.filter(isIndexablePage).map((p) => {
    const f = p.facts!;
    return {
      url: p.key,
      // Only manifest families are meaningful groups; sitemap-only pages are compared site-wide.
      family: p.source === 'manifest' || p.source === 'home' ? p.family : null,
      title: f.titles[0] ?? null,
      description: f.metaDescriptions[0] ?? null,
      mainText: f.mainText,
      links: f.links
        .filter((l) => sameSite(l.href, crawl.host))
        .map((l) => ({ url: normalizePageUrl(l.href), inMain: f.hasMain ? l.inMain : !l.inChrome })),
    };
  });
}

/** Pages to spend PageSpeed calls on: homepage, then by manifest tier, then by Ads demand. */
export function psiPriority(pages: CrawledPage[], limit: number): CrawledPage[] {
  const rank = (p: CrawledPage) => (p.source === 'home' ? -1 : p.source === 'manifest' ? (p.tier ?? 50) : 99);
  return pages
    .filter(isIndexablePage)
    .sort((a, b) => rank(a) - rank(b) || (b.adsImpressions ?? 0) - (a.adsImpressions ?? 0))
    .slice(0, limit);
}
