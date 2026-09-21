import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import manifestData from './page-manifest.json';
import {
  DailyRow,
  ManifestPage,
  SearchReport,
  buildSearchReport,
  comparisonWindows,
} from './search-console-insights';

/**
 * Queries containing any of these are counted as brand searches. Brand clicks
 * come from people who already know the business, so the dashboard shows them
 * separately from the non-brand searches that SEO work actually wins.
 */
/**
 * Queries containing any of these count as BRAND searches (people who already
 * know the business) rather than organic discovery.
 *
 * Only the one-word form. "ladakh vacation" with a space is also a generic
 * phrase ("ladakh vacation packages"), and counting those as brand searches
 * would hide how much discovery traffic the site actually earns.
 */
const BRAND_TERMS = ['ladakhvacation'];

/** Reports are recomputed from stored rows; this only saves repeat work on page load. */
const CACHE_MS = 60_000;

export const MIN_REPORT_DAYS = 7;
export const MAX_REPORT_DAYS = 90;

@Injectable()
export class SearchInsightsService {
  private readonly cache = new Map<string, { at: number; report: SearchReport }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Drop cached reports for a site, called after every sync. */
  invalidate(siteId: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(`${siteId}:`)) this.cache.delete(key);
    }
  }

  async report(siteId: string, days = 28): Promise<SearchReport> {
    const span = Math.min(MAX_REPORT_DAYS, Math.max(MIN_REPORT_DAYS, Math.round(days) || 28));
    const cacheKey = `${siteId}:${span}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.report;

    const site = await this.prisma.seoSite.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Unknown site.');

    let siteHost = '';
    try {
      siteHost = new URL(site.url).hostname.replace(/^www\./, '');
    } catch {
      siteHost = '';
    }

    const windows = comparisonWindows(span);
    const gte = new Date(`${windows.previous.from}T00:00:00.000Z`);
    const lte = new Date(`${windows.current.to}T23:59:59.999Z`);

    const [dimensionRows, queryRows, lastDimension, lastQuery] = await Promise.all([
      this.prisma.seoSearchDimensionDaily.findMany({
        where: { siteId, date: { gte, lte } },
        select: { date: true, dimension: true, key: true, clicks: true, impressions: true, position: true },
      }),
      this.prisma.seoSearchAnalytics.findMany({
        where: { siteId, date: { gte, lte } },
        select: { date: true, page: true, query: true, clicks: true, impressions: true, position: true },
      }),
      this.prisma.seoSearchDimensionDaily.aggregate({ where: { siteId }, _max: { updatedAt: true } }),
      this.prisma.seoSearchAnalytics.aggregate({ where: { siteId }, _max: { updatedAt: true } }),
    ]);

    const byDimension: Record<string, DailyRow[]> = { site: [], page: [], device: [], country: [] };
    for (const r of dimensionRows) {
      const list = byDimension[r.dimension];
      if (!list) continue;
      list.push({
        date: r.date.toISOString().slice(0, 10),
        key: r.key,
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
      });
    }

    const report = buildSearchReport({
      days: span,
      windows,
      siteHost,
      site: byDimension.site,
      pages: byDimension.page,
      devices: byDimension.device,
      countries: byDimension.country,
      queries: queryRows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        page: r.page,
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
      })),
      manifest: manifestData as unknown as ManifestPage[],
      brandTerms: BRAND_TERMS,
    });

    const synced = [lastDimension._max.updatedAt, lastQuery._max.updatedAt]
      .filter((x): x is Date => x instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    report.lastSyncedAt = synced ? synced.toISOString() : null;

    this.cache.set(cacheKey, { at: Date.now(), report });
    return report;
  }
}
