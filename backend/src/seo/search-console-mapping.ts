/**
 * Pure mapping between Search Console API responses and our rows.
 * No network, no Nest, no Prisma, so every unit conversion is testable without
 * credentials.
 *
 * CTR UNITS. The API returns `ctr` as a FRACTION (0.0 - 1.0). Everything on our
 * side stores CTR as a PERCENT: SeoOffPage.searchConsoleCtr feeds
 * calculatePageSignalPoints, which awards points at `ctr >= 5` and `ctr >= 2`.
 * Writing the raw fraction would mean a genuinely excellent 8% CTR lands as
 * 0.08 and scores zero, forever, with nothing erroring. Everything goes through
 * ctrToPercent().
 *
 * DATES. Search Console reports in Pacific Time and its data lags roughly two
 * to three days. A sync that asks for "today" gets an empty result, not an
 * error, so the default window ends several days back. See DATA_LAG_DAYS.
 *
 * PROPERTY FORMS. A Search Console property is either a domain property
 * (`sc-domain:ladakhvacation.in`) or a URL-prefix property
 * (`https://ladakhvacation.in/`). They are different properties with different
 * data, and the string is used verbatim in the request path.
 */

/** Search Console finalises data about this far behind today. */
export const DATA_LAG_DAYS = 3;

/** API hard cap per request. Beyond this, paginate with startRow. */
export const MAX_ROW_LIMIT = 25_000;

/** Longest page URL we store. Keeps the natural-key btree index in bounds. */
export const MAX_PAGE_LEN = 500;
/** Longest query string we store. */
export const MAX_QUERY_LEN = 300;

/** Dimensions we request, in the order the API returns them in `keys`. */
export const SYNC_DIMENSIONS = ['date', 'page', 'query'] as const;

/**
 * Fraction to percent, rounded to two decimals.
 *
 * The API's 0.0817... becomes 8.17, which is what an operator reads as a CTR
 * and what the scoring bands expect.
 */
export function ctrToPercent(ctr: unknown): number {
  const n = typeof ctr === 'number' ? ctr : Number(ctr);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100 * 100) / 100;
}

/** Coerce an API number, treating absent or unparseable as zero. */
export function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** YYYY-MM-DD in UTC. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Search Console only accepts YYYY-MM-DD, and the value goes into a request
 * body rather than a query string, so this is a correctness guard rather than
 * an injection one. Still rejected early: a malformed date returns an empty
 * result set, which reads as "no traffic" instead of "bad request".
 */
export function assertIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    throw new Error(`Expected a YYYY-MM-DD date, got: ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Default sync window: `days` of data ending DATA_LAG_DAYS behind today.
 *
 * Ending at today would silently return nothing for the last few days. Ending
 * at the lag boundary means every row requested is one the API actually has.
 */
export function defaultWindow(days: number, now = new Date()): { from: string; to: string } {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - DATA_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return { from: isoDay(start), to: isoDay(end) };
}

/** One row of Search Console data at date x page x query grain. */
export interface SearchAnalyticsRow {
  /** YYYY-MM-DD as reported. */
  date: string;
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  /** PERCENT, 0-100. Converted from the API's fraction. */
  ctr: number;
  /** Average position. Lower is better. */
  position: number;
}

/**
 * Map one API row to ours.
 *
 * `keys` is positional and matches the dimensions requested, so the order in
 * SYNC_DIMENSIONS and the order read here must stay in step. Returns null for a
 * row missing either identifying dimension rather than writing a row keyed on
 * an empty string.
 */
export function mapRow(
  raw: Record<string, any>,
  dimensions: readonly string[] = SYNC_DIMENSIONS,
): SearchAnalyticsRow | null {
  const keys: unknown[] = Array.isArray(raw?.keys) ? raw.keys : [];
  if (keys.length < dimensions.length) return null;

  const at = (name: string): string => {
    const i = dimensions.indexOf(name);
    return i === -1 ? '' : String(keys[i] ?? '');
  };

  const date = at('date');
  const page = at('page').slice(0, MAX_PAGE_LEN);
  const query = at('query').slice(0, MAX_QUERY_LEN);

  if (!date || !page) return null;

  return {
    date,
    page,
    query,
    clicks: Math.round(num(raw.clicks)),
    impressions: Math.round(num(raw.impressions)),
    ctr: ctrToPercent(raw.ctr),
    position: Math.round(num(raw.position) * 100) / 100,
  };
}

/** Map a whole response, dropping rows that cannot be addressed. */
export function mapRows(
  rows: unknown,
  dimensions: readonly string[] = SYNC_DIMENSIONS,
): SearchAnalyticsRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => mapRow(r, dimensions))
    .filter((r): r is SearchAnalyticsRow => r !== null);
}

/** Per-page totals, used to feed SeoOffPage.searchConsoleCtr. */
export interface PageRollup {
  page: string;
  clicks: number;
  impressions: number;
  /** PERCENT. Recomputed from totals, NOT averaged from per-query CTRs. */
  ctr: number;
  /** Impression-weighted average position. */
  position: number;
  queryCount: number;
}

/**
 * Roll per-query rows up to per-page totals.
 *
 * CTR is recomputed as clicks/impressions across the page rather than averaged
 * from the per-query CTRs: a query with 1 impression and 1 click is 100% CTR
 * and would drag a simple mean into fiction. Position is impression-weighted
 * for the same reason.
 */
export function rollupByPage(rows: SearchAnalyticsRow[]): PageRollup[] {
  const acc = new Map<
    string,
    { clicks: number; impressions: number; posWeighted: number; queries: Set<string> }
  >();

  for (const r of rows) {
    const page = normalizePageUrl(r.page) || r.page;
    let e = acc.get(page);
    if (!e) {
      e = { clicks: 0, impressions: 0, posWeighted: 0, queries: new Set() };
      acc.set(page, e);
    }
    e.clicks += r.clicks;
    e.impressions += r.impressions;
    e.posWeighted += r.position * r.impressions;
    if (r.query) e.queries.add(r.query);
  }

  return [...acc.entries()].map(([page, e]) => ({
    page,
    clicks: e.clicks,
    impressions: e.impressions,
    ctr: e.impressions > 0 ? Math.round((e.clicks / e.impressions) * 100 * 100) / 100 : 0,
    position: e.impressions > 0 ? Math.round((e.posWeighted / e.impressions) * 100) / 100 : 0,
    queryCount: e.queries.size,
  }));
}

/**
 * Queries ranking just off the first page.
 *
 * Positions 11 to 20 with real impressions are the cheapest wins available: the
 * page already ranks, so a title rewrite or an internal link often moves it
 * rather than needing a new page. Sorted by impressions because a position-11
 * query nobody searches is not an opportunity.
 */
export function strikingDistance(
  rows: SearchAnalyticsRow[],
  opts: { minPosition?: number; maxPosition?: number; minImpressions?: number } = {},
): SearchAnalyticsRow[] {
  const min = opts.minPosition ?? 11;
  const max = opts.maxPosition ?? 20;
  const minImpr = opts.minImpressions ?? 10;

  return rows
    .filter((r) => r.query && r.position >= min && r.position <= max && r.impressions >= minImpr)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * Normalise a property identifier.
 *
 * Accepts what an operator is likely to paste (a bare domain, a URL with or
 * without a trailing slash, or an explicit sc-domain: form) and returns the
 * string Search Console expects. A URL-prefix property MUST keep its trailing
 * slash; without it the API returns 403 rather than a helpful error.
 */
export function normalisePropertyUrl(input: string): string {
  const s = (input ?? '').trim();
  if (!s) return '';
  if (s.startsWith('sc-domain:')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s.endsWith('/') ? s : `${s}/`;
  }
  // A bare hostname is ambiguous; domain property is the more common setup and
  // covers both http/https and every subdomain.
  return `sc-domain:${s.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Normalise a page URL so that manifest, audit, and Search Console URLs match.
 *
 * Trailing slashes on non-root paths are stripped (e.g. `/packages/delhi/` -> `/packages/delhi`).
 * Root `/` retains its single slash.
 * Query strings and fragments are stripped for page identity.
 */
export function normalizePageUrl(input: string): string {
  const s = (input ?? '').trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    if (s.length > 1 && s.endsWith('/')) {
      return s.replace(/\/+$/, '');
    }
    return s;
  }
}

/** One day of a date x <dimension> pull. `key` is '' for the site-level pull. */
export interface DimensionDailyRow {
  date: string;
  key: string;
  clicks: number;
  impressions: number;
  /** PERCENT, 0-100. */
  ctr: number;
  position: number;
}

/**
 * Map a pull made WITHOUT the query dimension: date alone for site totals, or
 * date plus one of page, device or country.
 *
 * These exist because Google omits anonymized queries from any breakdown by
 * query while still counting them in totals, so site and page figures must come
 * from pulls that do not group by query.
 *
 * Page keys are normalised so a trailing-slash variant lands on the same key.
 */
export function mapDimensionRows(rows: unknown, dimensions: readonly string[]): DimensionDailyRow[] {
  if (!Array.isArray(rows)) return [];
  const dateIdx = dimensions.indexOf('date');
  const keyIdx = dimensions.findIndex((d) => d !== 'date');
  const isPage = keyIdx !== -1 && dimensions[keyIdx] === 'page';
  const out: DimensionDailyRow[] = [];

  for (const raw of rows as any[]) {
    const keys: unknown[] = Array.isArray(raw?.keys) ? raw.keys : [];
    const date = dateIdx === -1 ? '' : String(keys[dateIdx] ?? '');
    if (!date) continue;

    let key = keyIdx === -1 ? '' : String(keys[keyIdx] ?? '').slice(0, MAX_PAGE_LEN);
    if (keyIdx !== -1 && !key) continue;
    if (isPage) key = normalizePageUrl(key) || key;

    out.push({
      date,
      key,
      clicks: Math.round(num(raw.clicks)),
      impressions: Math.round(num(raw.impressions)),
      ctr: ctrToPercent(raw.ctr),
      position: Math.round(num(raw.position) * 100) / 100,
    });
  }
  return out;
}

/**
 * Collapse rows sharing a date and key, which happens once page URLs are
 * normalised. CTR is recomputed from the totals and position is weighted by
 * impressions, rather than averaging the two rows.
 */
export function mergeDimensionRows(rows: DimensionDailyRow[]): DimensionDailyRow[] {
  const acc = new Map<string, { date: string; key: string; clicks: number; impressions: number; posWeighted: number }>();
  for (const r of rows) {
    const k = JSON.stringify([r.date, r.key]);
    let e = acc.get(k);
    if (!e) {
      e = { date: r.date, key: r.key, clicks: 0, impressions: 0, posWeighted: 0 };
      acc.set(k, e);
    }
    e.clicks += r.clicks;
    e.impressions += r.impressions;
    e.posWeighted += r.position * r.impressions;
  }
  return [...acc.values()].map((e) => ({
    date: e.date,
    key: e.key,
    clicks: e.clicks,
    impressions: e.impressions,
    ctr: e.impressions > 0 ? Math.round((e.clicks / e.impressions) * 100 * 100) / 100 : 0,
    position: e.impressions > 0 ? Math.round((e.posWeighted / e.impressions) * 100) / 100 : 0,
  }));
}
