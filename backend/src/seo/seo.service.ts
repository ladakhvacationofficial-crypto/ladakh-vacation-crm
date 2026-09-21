import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SeoAudit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { UpdateOffPageDto } from './dto/update-offpage.dto';
import { UpdateDomainSignalsDto } from './dto/update-domain-signals.dto';
import { SITE_DOMAIN } from '../common/site';
import { normalizePageUrl } from './search-console-mapping';
import { DomainSignals, OffPageSignals, computeHealthScore, computeLocalScore } from './seo-scoring';
import { CURRENT_AUDITS, StoredAuditChecks, readStoredChecks } from './seo-audit-storage';
import { HOMEPAGE_ENTRY, MANIFEST, ManifestPage } from './seo-manifest';

/** A page the health score should describe: it returned 200 at its own URL. */
function isLivePage(stored: StoredAuditChecks): boolean {
  return stored.breakdown.blockedBy?.id !== 'http-status';
}

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- sites ----

  createSite(dto: CreateSiteDto) {
    return this.prisma.seoSite.create({
      data: {
        name: dto.name,
        url: dto.url,
        crawlPaths: dto.crawlPaths ?? [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listSites() {
    let sites = await this.prisma.seoSite.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    if (sites.length === 0) {
      try {
        sites = [
          await this.prisma.seoSite.create({
            data: {
              name: 'Ladakh Vacation Main Website',
              url: SITE_DOMAIN,
              crawlPaths: ['/', '/packages'],
              isActive: true,
            },
          }),
        ];
      } catch {
        // Created concurrently by another request.
      }
    }

    return Promise.all(
      sites.map(async (s) => {
        const [latest, lastRun] = await Promise.all([
          this.latestAudits(s.id),
          this.prisma.seoAudit.findFirst({
            where: { siteId: s.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);
        const scores = [...latest.values()]
          .filter((a) => {
            const stored = readStoredChecks(a.checks);
            return stored && isLivePage(stored);
          })
          .map((a) => a.score);
        return {
          id: s.id,
          name: s.name,
          url: s.url,
          crawlPaths: s.crawlPaths,
          isActive: s.isActive,
          lastRunAt: lastRun?.createdAt ?? null,
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          pageCount: scores.length,
        };
      }),
    );
  }

  async findSite(id: string) {
    const site = await this.prisma.seoSite.findUnique({
      where: { id },
      include: { offPageScores: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async updateSite(id: string, dto: UpdateSiteDto) {
    await this.findSite(id);
    return this.prisma.seoSite.update({
      where: { id },
      data: { ...dto },
    });
  }

  // ---- audits & rankings ----

  /** Score history. Only audits from the current framework, so the trend compares like with like. */
  async getHistory(id: string) {
    return this.prisma.seoAudit.findMany({
      where: { siteId: id, ...CURRENT_AUDITS },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        runId: true,
        url: true,
        score: true,
        perfScore: true,
        seoScore: true,
      },
    });
  }

  async latestAudit(id: string) {
    const site = await this.findSite(id);
    const latest = await this.latestAudits(id);
    const pages = [...latest.values()]
      .filter((a) => readStoredChecks(a.checks))
      .sort((a, b) => a.url.localeCompare(b.url));
    return { site, pages };
  }

  /** Newest audit per URL, keyed by normalised URL. */
  private async latestAudits(siteId: string): Promise<Map<string, SeoAudit>> {
    const rows = await this.prisma.seoAudit.findMany({
      where: { siteId },
      orderBy: [{ url: 'asc' }, { createdAt: 'desc' }],
      distinct: ['url'],
    });
    const out = new Map<string, SeoAudit>();
    for (const r of rows) {
      const key = normalizePageUrl(r.url);
      const current = out.get(key);
      if (!current || r.createdAt > current.createdAt) out.set(key, r);
    }
    return out;
  }

  /**
   * Every manifest page with its latest page health audit, plus audited pages
   * outside the manifest. Audits from the previous framework are not scored
   * here (needsReaudit) so old and new scores are never ranked together.
   */
  async getPageRankings(siteId: string) {
    const site = await this.findSite(siteId);
    const [latest, offPageRecords, domain] = await Promise.all([
      this.latestAudits(siteId),
      this.prisma.seoOffPage.findMany({ where: { siteId } }),
      this.getDomainSignals(siteId),
    ]);

    const offPageMap = new Map<string, (typeof offPageRecords)[number]>();
    for (const op of offPageRecords) offPageMap.set(normalizePageUrl(op.url), op);

    const row = (
      base: { url: string; path: string; title: string; h1?: string; tier?: number; family?: string; targetKeyword?: string } & Partial<Pick<ManifestPage, 'impr' | 'clicks' | 'conv' | 'words'>>,
      key: string,
      audit: SeoAudit | undefined,
    ) => {
      const stored = audit ? readStoredChecks(audit.checks) : null;
      const offPage = offPageMap.get(key);
      return {
        ...base,
        impr: base.impr ?? null,
        clicks: base.clicks ?? null,
        conv: base.conv ?? null,
        words: base.words ?? null,
        auditId: audit?.id ?? null,
        lastAuditedAt: audit?.createdAt ?? null,
        needsReaudit: !!audit && !stored,
        score: stored ? audit!.score : null,
        perfScore: stored ? audit!.perfScore : null,
        seoScore: null,
        lcpMs: stored ? audit!.lcpMs : null,
        clsX1k: stored ? audit!.clsX1k : null,
        inpMs: stored ? audit!.inpMs : null,
        checks: stored?.results ?? [],
        tasks: stored ? (audit!.tasks ?? []) : [],
        errors: stored ? audit!.errors : null,
        health: stored
          ? {
              breakdown: stored.breakdown,
              vitals: stored.vitals,
              pageType: stored.page.pageType,
              analysis: stored.page.analysis,
              analysedAt: stored.page.analysedAt,
            }
          : null,
        offPage: offPage
          ? {
              backlinkCount: offPage.backlinkCount,
              referringDomains: offPage.referringDomains,
              pageAuthority: offPage.pageAuthority,
              prMentions: offPage.prMentions,
              socialShares: offPage.socialShares,
              searchConsoleCtr: offPage.searchConsoleCtr,
              notes: offPage.notes,
              updatedAt: offPage.updatedAt,
            }
          : null,
      };
    };

    const seen = new Set<string>();
    const rankedList: Array<ReturnType<typeof row>> = [];

    for (const mp of [HOMEPAGE_ENTRY, ...MANIFEST]) {
      let fullUrl: string;
      try {
        fullUrl = new URL(mp.url, site.url).toString();
      } catch {
        continue;
      }
      const key = normalizePageUrl(fullUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      rankedList.push(
        row(
          {
            url: fullUrl,
            path: mp.url,
            title: mp.title || mp.h1 || mp.url,
            h1: mp.h1,
            tier: mp.tier,
            family: mp.family,
            targetKeyword: mp.primary,
            impr: mp.impr,
            clicks: mp.clicks,
            conv: mp.conv,
            words: mp.words,
          },
          key,
          latest.get(key),
        ),
      );
    }

    // Audited pages outside the manifest: sitemap-only pages and configured paths.
    for (const [key, audit] of latest) {
      if (seen.has(key)) continue;
      const stored = readStoredChecks(audit.checks);
      if (!stored) continue;
      seen.add(key);
      let path = audit.url;
      try {
        path = new URL(audit.url).pathname;
      } catch {
        // Keep the raw URL.
      }
      rankedList.push(row({ url: audit.url, path, title: path, family: stored.page.family ?? 'custom-path' }, key, audit));
    }

    rankedList.sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

    const scored = rankedList.filter((r) => r.score !== null);
    const live = scored.filter((r) => r.health && r.health.breakdown.blockedBy?.id !== 'http-status');
    const checkFails = (id: string) => scored.filter((r) => r.checks.some((c) => c.id === id && c.severity === 'fail')).length;

    return {
      site,
      stats: {
        totalPages: rankedList.length,
        auditedPages: scored.length,
        averageScore: live.length ? Math.round(live.reduce((sum, r) => sum + (r.score ?? 0), 0) / live.length) : null,
        highScoreCount: scored.filter((r) => (r.score ?? 0) >= 80).length,
        medScoreCount: scored.filter((r) => (r.score ?? 0) >= 60 && (r.score ?? 0) < 80).length,
        lowScoreCount: scored.filter((r) => (r.score ?? 0) < 60).length,
        blockedCount: scored.filter((r) => r.health?.breakdown.blockedBy).length,
        nearDuplicateCount: checkFails('unique-content'),
        needsReauditCount: rankedList.filter((r) => r.needsReaudit).length,
        vitalsMeasuredCount: scored.filter((r) => r.health?.vitals && (r.health.vitals.lcpMs || r.health.vitals.cls)).length,
      },
      familyHealth: this.familyHealth(rankedList),
      local: computeLocalScore(domain),
      rankings: rankedList,
    };
  }

  /**
   * How distinct each manifest family's pages are from each other. This is the
   * doorway-page view: a family whose pages share most of their text is the
   * first thing to rewrite.
   */
  private familyHealth(
    rows: Array<{ family?: string; health: { analysis: { uniqueShare: number | null } | null } | null; checks: Array<{ id: string; severity: string }> }>,
  ) {
    const groups = new Map<string, { pages: number; audited: number; shares: number[]; fail: number; warn: number }>();
    for (const r of rows) {
      const family = r.family ?? 'other';
      const g = groups.get(family) ?? { pages: 0, audited: 0, shares: [], fail: 0, warn: 0 };
      g.pages++;
      if (r.health) {
        g.audited++;
        const share = r.health.analysis?.uniqueShare;
        if (share !== null && share !== undefined) g.shares.push(share);
        const unique = r.checks.find((c) => c.id === 'unique-content');
        if (unique?.severity === 'fail') g.fail++;
        if (unique?.severity === 'warn') g.warn++;
      }
      groups.set(family, g);
    }
    return [...groups.entries()]
      .map(([family, g]) => ({
        family,
        pages: g.pages,
        audited: g.audited,
        averageUniqueShare: g.shares.length
          ? Math.round((g.shares.reduce((a, b) => a + b, 0) / g.shares.length) * 1000) / 1000
          : null,
        nearDuplicates: g.fail,
        partlyShared: g.warn,
      }))
      .sort((a, b) => (a.averageUniqueShare ?? 2) - (b.averageUniqueShare ?? 2));
  }

  // ==========================================================================
  // Site-wide domain signals
  // ==========================================================================

  /** One row per site, or null when nobody has filled it in yet. */
  async getDomainSignals(siteId: string) {
    return this.prisma.seoDomainSignals.findUnique({ where: { siteId } });
  }

  /**
   * Upsert the site-wide signals, then rescore. Only referring domains move page
   * scores; Business Profile, reviews and citations feed the local score.
   */
  async updateDomainSignals(siteId: string, dto: UpdateDomainSignalsDto) {
    await this.findSite(siteId);

    const data = {
      gbpCompleteness: dto.gbpCompleteness,
      gbpReviewCount: dto.gbpReviewCount,
      gbpAverageRating: dto.gbpAverageRating,
      gbpPostsLast30d: dto.gbpPostsLast30d,
      citationsTotal: dto.citationsTotal,
      citationsNapConsistent: dto.citationsNapConsistent,
      brandMentionsLinked: dto.brandMentionsLinked,
      brandMentionsUnlinked: dto.brandMentionsUnlinked,
      referringDomainsTotal: dto.referringDomainsTotal,
      toxicDomainCount: dto.toxicDomainCount,
      verifiedOn: dto.verifiedOn ? new Date(dto.verifiedOn) : undefined,
      notes: dto.notes,
    };

    const signals = await this.prisma.seoDomainSignals.upsert({
      where: { siteId },
      create: { siteId, ...data },
      update: data,
    });

    const rescored = await this.rescoreAllPages(siteId, signals);
    return { ...signals, rescoredPages: rescored, local: computeLocalScore(signals) };
  }

  /**
   * Recompute the stored score on the latest audit of every page after link
   * data changes. Older audits are left as the record of what the score was.
   */
  async rescoreAllPages(siteId: string, domain?: DomainSignals | null): Promise<number> {
    if (domain === undefined) domain = await this.getDomainSignals(siteId);

    const [latest, offPageRows] = await Promise.all([
      this.latestAudits(siteId),
      this.prisma.seoOffPage.findMany({ where: { siteId } }),
    ]);
    const offPage = new Map<string, OffPageSignals>();
    for (const r of offPageRows) offPage.set(normalizePageUrl(r.url), r);

    let updated = 0;
    for (const [key, audit] of latest) {
      if (await this.rescore(audit, offPage.get(key) ?? null, domain)) updated++;
    }
    return updated;
  }

  private async rescore(audit: SeoAudit, offPage: OffPageSignals | null, domain: DomainSignals | null): Promise<boolean> {
    const stored = readStoredChecks(audit.checks);
    if (!stored?.results) return false;
    const breakdown = computeHealthScore(stored.results, offPage, domain);
    if (breakdown.finalScore === audit.score && breakdown.authorityPoints === stored.breakdown.authorityPoints) {
      return false;
    }
    await this.prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        score: breakdown.finalScore,
        checks: { ...stored, breakdown } as unknown as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  /** Update link data for one page and rescore its latest audit. */
  async updateOffPage(siteId: string, dto: UpdateOffPageDto) {
    const site = await this.findSite(siteId);
    let targetUrl = normalizePageUrl(dto.url);
    try {
      targetUrl = normalizePageUrl(new URL(dto.url, site.url).toString());
    } catch {
      // Keep the normalised input.
    }

    const offPage = await this.prisma.seoOffPage.upsert({
      where: {
        siteId_url: { siteId, url: targetUrl },
      },
      create: {
        siteId,
        url: targetUrl,
        backlinkCount: dto.backlinkCount ?? 0,
        referringDomains: dto.referringDomains ?? 0,
        pageAuthority: dto.pageAuthority ?? null,
        prMentions: dto.prMentions ?? 0,
        socialShares: dto.socialShares ?? 0,
        searchConsoleCtr: dto.searchConsoleCtr ?? null,
        notes: dto.notes ?? null,
      },
      update: {
        backlinkCount: dto.backlinkCount !== undefined ? dto.backlinkCount : undefined,
        referringDomains: dto.referringDomains !== undefined ? dto.referringDomains : undefined,
        pageAuthority: dto.pageAuthority !== undefined ? dto.pageAuthority : undefined,
        prMentions: dto.prMentions !== undefined ? dto.prMentions : undefined,
        socialShares: dto.socialShares !== undefined ? dto.socialShares : undefined,
        searchConsoleCtr: dto.searchConsoleCtr !== undefined ? dto.searchConsoleCtr : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
      },
    });

    const audit = (await this.latestAudits(siteId)).get(targetUrl);
    if (audit) await this.rescore(audit, offPage, await this.getDomainSignals(siteId));

    return offPage;
  }
}
