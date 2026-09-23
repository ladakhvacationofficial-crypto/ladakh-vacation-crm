'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Gauge,
  ExternalLink,
  Search,
  Filter,
  Sliders,
  Image as ImageIcon,
  UploadCloud,
  Copy,
  Check,
  Trophy,
  Layers,
  Sparkles,
  Link as LinkIcon,
  FileText,
  TrendingUp,
  Tag,
  ChevronRight,
  ShieldCheck,
  Share2,
  Newspaper,
  BookOpen,
  Eye,
  CheckCheck,
  Zap,
  Loader2,
  Send,
} from 'lucide-react';
import {
  api,
  ApiError,
  type SeoSiteRow,
  type SeoAuditResponse,
  type SeoCheck,
  type SeoRankedPage,
  type SeoRankingsResponse,
  type SeoOffPageData,
  type SeoDomainSignalsData,
  type SeoStrikingDistanceRow,
  type SeoSearchConsoleSyncResult,
  type MediaAssetRow,
  type PageManifestItem,
} from '@/lib/api';
import MANIFEST_DATA from '@/lib/page-manifest.json';
import { SITE_DOMAIN, canonicalSiteUrl } from '@/lib/constants';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';
import { SearchPerformance } from '@/components/seo/search-performance';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

type ActiveTab = 'rankings' | 'search' | 'audits' | 'media';

export default function SeoPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('rankings');
  const [sites, setSites] = useState<SeoSiteRow[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [audit, setAudit] = useState<SeoAuditResponse | null>(null);
  const [rankingsData, setRankingsData] = useState<SeoRankingsResponse | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRow[]>([]);
  const [websitePages, setWebsitePages] = useState<PageManifestItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'audit' | 'auditPage' | 'saveOffPage' | 'uploadMedia' | 'quickRegister'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals / Drawers state
  const [selectedPageForOffPage, setSelectedPageForOffPage] = useState<SeoRankedPage | null>(null);
  const [selectedPageForChecklist, setSelectedPageForChecklist] = useState<SeoRankedPage | null>(null);

  // Default manifest pages list (current website pages before a live audit)
  const defaultManifestPages: SeoRankedPage[] = useMemo(() => {
    const baseSite = sites.find((s) => s.id === selectedSiteId)?.url || SITE_DOMAIN;
    return (MANIFEST_DATA as any[]).map((m) => {
      // canonicalSiteUrl forces the live domain even when the stored SeoSite
      // row still points at the retired www.ladakhvacation.in host.
      const fullUrl = canonicalSiteUrl(m.url, baseSite);
      return {
        url: fullUrl,
        path: m.url,
        title: m.title || m.h1 || m.url,
        h1: m.h1,
        tier: m.tier,
        family: m.family,
        targetKeyword: m.primary,
        impr: m.impr ?? null,
        clicks: m.clicks ?? null,
        conv: m.conv ?? null,
        words: m.words ?? null,
        auditId: null,
        lastAuditedAt: null,
        score: null,
        perfScore: null,
        seoScore: null,
        lcpMs: null,
        clsX1k: null,
        inpMs: null,
        checks: [],
        tasks: [],
        errors: null,
        offPage: null,
      };
    });
  }, [sites, selectedSiteId]);

  // Load sites
  const loadSites = useCallback(async () => {
    try {
      const rows = await api.get<SeoSiteRow[]>('/seo/sites');
      setSites(rows);
      setSelectedSiteId((cur) =>
        cur && rows.some((r) => r.id === cur) ? cur : (rows[0]?.id ?? null),
      );
    } catch (e) {
      // Non-fatal, manifest fallback will display
      console.warn('Could not load SEO sites from API, using manifest fallback', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load audit for selected site
  const loadAudit = useCallback(async (id: string) => {
    try {
      setAudit(await api.get<SeoAuditResponse>(`/seo/sites/${id}/audit`));
    } catch (e) {
      console.warn('Could not load site audit', e);
    }
  }, []);

  // Load rankings for selected site
  const loadRankings = useCallback(async (id: string) => {
    setRankingsLoading(true);
    try {
      const res = await api.get<SeoRankingsResponse>(`/seo/sites/${id}/rankings`);
      setRankingsData(res);
    } catch (e) {
      console.warn('Could not load page rankings, using default manifest list', e);
    } finally {
      setRankingsLoading(false);
    }
  }, []);

  // Load media assets
  const loadMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const [assets, pages] = await Promise.all([
        api.get<MediaAssetRow[]>('/media'),
        api.get<PageManifestItem[]>('/media/pages'),
      ]);
      setMediaAssets(assets);
      setWebsitePages(pages);
    } catch (e) {
      console.warn('Could not load media library', e);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (selectedSiteId) {
      loadAudit(selectedSiteId);
      loadRankings(selectedSiteId);
    }
  }, [selectedSiteId, loadAudit, loadRankings]);

  useEffect(() => {
    if (activeTab === 'media') {
      loadMedia();
    }
  }, [activeTab, loadMedia]);

  // Flash message helper
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Quick auto-register default site
  async function quickRegisterDefaultSite() {
    setBusy('quickRegister');
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/seo/sites', {
        name: 'Ladakh Vacation Main Website',
        url: SITE_DOMAIN,
        crawlPaths: ['/', '/packages', '/destinations/leh', '/destinations/nubra-pangong', '/destinations/hanle'],
      });
      await loadSites();
      setSelectedSiteId(res.id);
      notifySuccess('Ladakh Vacation website registered successfully!');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed');
    } finally {
      setBusy('idle');
    }
  }

  // Run full site audit
  async function runAudit() {
    if (!selectedSiteId) {
      await quickRegisterDefaultSite();
      return;
    }
    setBusy('audit');
    setError(null);
    try {
      await api.post(`/seo/sites/${selectedSiteId}/audit`);
      await Promise.all([
        loadSites(),
        loadAudit(selectedSiteId),
        loadRankings(selectedSiteId),
      ]);
      notifySuccess('Full site SEO audit completed!');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Audit failed.');
    } finally {
      setBusy('idle');
    }
  }

  // Audit single page
  async function auditSinglePage(url: string, keyword?: string) {
    if (!selectedSiteId) {
      await quickRegisterDefaultSite();
    }
    const currentSiteId = selectedSiteId || sites[0]?.id;
    if (!currentSiteId) return;

    setBusy('auditPage');
    setError(null);
    try {
      await api.post(`/seo/sites/${currentSiteId}/audit-page`, { url, keyword });
      await Promise.all([
        loadAudit(currentSiteId),
        loadRankings(currentSiteId),
      ]);
      notifySuccess(`Audited page: ${url}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Single page audit failed.');
    } finally {
      setBusy('idle');
    }
  }

  // Effective unified rankings list.
  // Audited rows carry whatever host was stored on SeoAudit at crawl time,
  // which on older installs is the retired www.ladakhvacation.in. Normalise here —
  // the single point every link, dropdown and dialog reads from — so no view
  // can send the team to the legacy site.
  const effectiveRankings: SeoRankedPage[] = useMemo(() => {
    if (rankingsData?.rankings && rankingsData.rankings.length > 0) {
      return rankingsData.rankings.map((p) => ({
        ...p,
        url: canonicalSiteUrl(p.path || p.url, p.url),
      }));
    }
    return defaultManifestPages;
  }, [rankingsData, defaultManifestPages]);

  const effectiveStats = useMemo(() => {
    if (rankingsData?.stats) return rankingsData.stats;
    const audited = effectiveRankings.filter((p) => p.score !== null);
    const avg =
      audited.length > 0
        ? Math.round(audited.reduce((sum, p) => sum + (p.score ?? 0), 0) / audited.length)
        : null;
    return {
      totalPages: effectiveRankings.length,
      auditedPages: audited.length,
      averageScore: avg,
      highScoreCount: effectiveRankings.filter((p) => (p.score ?? 0) >= 80).length,
      medScoreCount: effectiveRankings.filter((p) => (p.score ?? 0) >= 60 && (p.score ?? 0) < 80).length,
      lowScoreCount: effectiveRankings.filter((p) => p.score !== null && (p.score ?? 0) < 60).length,
    };
  }, [rankingsData, effectiveRankings]);

  return (
    <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              SEO Command Center
            </h1>
            <span className="rounded-full bg-signal-500/10 px-2.5 py-0.5 text-[11px] font-medium text-signal-500 border border-signal-500/20">
              {MANIFEST_DATA.length} Pages in Manifest
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-400 max-w-2xl">
            Page health and quality metrics, on-page information gain checks,
            off-page authority tracking, and website media management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AddSiteDialog onCreated={(id) => { setSelectedSiteId(id); loadSites(); }} />
          <Button
            size="sm"
            onClick={runAudit}
            disabled={busy !== 'idle'}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${busy === 'audit' ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            {busy === 'audit' ? 'Auditing…' : 'Run Full Site Audit'}
          </Button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-loss-500/40 bg-loss-500/10 px-4 py-3 text-[13px] text-loss-500 flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-healthy-500/40 bg-healthy-500/10 px-4 py-3 text-[13px] text-healthy-500 flex items-center gap-2"
        >
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Unregistered domain banner */}
      {sites.length === 0 && (
        <div className="mb-6 rounded-xl border border-signal-500/30 bg-signal-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Globe className="size-5 text-signal-500 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-ink-100">
                Tracking Ladakh Vacation ({MANIFEST_DATA.length} Pages)
              </p>
              <p className="text-[11.5px] text-ink-400">
                All {MANIFEST_DATA.length} manifest pages are loaded from the manifest below. Connect the domain to run live crawling and store off-page backlinks.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={quickRegisterDefaultSite}
            disabled={busy === 'quickRegister'}
            className="text-[12px] h-8"
          >
            {busy === 'quickRegister' ? 'Registering…' : `⚡ Connect ${SITE_DOMAIN}`}
          </Button>
        </div>
      )}

      {/* Site Selector Bar (when multiple sites exist) */}
      {sites.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
            Target Domain:
          </span>
          <div className="flex flex-wrap gap-2">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSiteId(s.id)}
                className={`group flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition-all duration-200 ${
                  selectedSiteId === s.id
                    ? 'border-signal-500/60 bg-ink-900 text-ink-100 shadow-sm'
                    : 'border-ink-800 bg-ink-950 text-ink-400 hover:border-ink-700 hover:text-ink-200'
                }`}
              >
                <ScoreRing score={s.avgScore ?? 0} unknown={s.avgScore === null} size={28} stroke={3} />
                <div>
                  <span className="text-[12.5px] font-medium">{s.name}</span>
                  <span className="ml-2 text-[10.5px] text-ink-500">({new URL(s.url).host})</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-ink-800/80">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`pb-3 text-[13.5px] font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'rankings'
                ? 'border-signal-500 text-signal-500'
                : 'border-transparent text-ink-400 hover:text-ink-200'
            }`}
          >
            <Trophy className="size-4" />
            Health Leaderboard & All Pages
            <span className="ml-1 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-ink-300">
              {effectiveStats.totalPages}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 text-[13.5px] font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'search'
                ? 'border-signal-500 text-signal-500'
                : 'border-transparent text-ink-400 hover:text-ink-200'
            }`}
          >
            <TrendingUp className="size-4" />
            Search Performance
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`pb-3 text-[13.5px] font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'media'
                ? 'border-signal-500 text-signal-500'
                : 'border-transparent text-ink-400 hover:text-ink-200'
            }`}
          >
            <ImageIcon className="size-4" />
            Website Media Library
            {mediaAssets.length > 0 && (
              <span className="ml-1 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-ink-300">
                {mediaAssets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            className={`pb-3 text-[13.5px] font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'audits'
                ? 'border-signal-500 text-signal-500'
                : 'border-transparent text-ink-400 hover:text-ink-200'
            }`}
          >
            <Gauge className="size-4" />
            Site Health & PageSpeed
          </button>
        </nav>
      </div>

      {/* TAB 1: RANKINGS LEADERBOARD */}
      {activeTab === 'rankings' && (
        <RankingsLeaderboard
          pages={effectiveRankings}
          stats={effectiveStats}
          loading={rankingsLoading}
          onAuditPage={auditSinglePage}
          onEditOffPage={(page) => setSelectedPageForOffPage(page)}
          onViewChecklist={(page) => setSelectedPageForChecklist(page)}
          busy={busy === 'auditPage'}
        />
      )}

      {/* TAB: SEARCH PERFORMANCE (Google Search Console) */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <SearchPerformance
            siteId={selectedSiteId || sites[0]?.id || ''}
            onSynced={(summary) => {
              if (selectedSiteId) loadRankings(selectedSiteId);
              notifySuccess(summary);
            }}
          />
          <div className="max-w-2xl">
            <IndexNowPanel onNotified={notifySuccess} />
          </div>
        </div>
      )}

      {/* TAB 2: MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <MediaLibraryTab
          assets={mediaAssets}
          pages={websitePages.length > 0 ? websitePages : (MANIFEST_DATA as any[])}
          loading={mediaLoading}
          onReload={loadMedia}
          notifySuccess={notifySuccess}
        />
      )}

      {/* TAB 3: SITE HEALTH & AUDITS */}
      {activeTab === 'audits' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <SitePages
              audit={audit || { site: sites[0] || ({ name: 'Ladakh Vacation', url: SITE_DOMAIN } as any), pages: [] }}
              busy={busy === 'audit'}
              onAudit={runAudit}
            />
          </div>
          <div className="space-y-4">
            <SearchConsolePanel
              siteId={selectedSiteId || sites[0]?.id || ''}
              onSynced={(summary) => {
                if (selectedSiteId) loadRankings(selectedSiteId);
                notifySuccess(summary);
              }}
            />
            <DomainSignalsPanel
              siteId={selectedSiteId || sites[0]?.id || ''}
              onSaved={(n) => {
                if (selectedSiteId) loadRankings(selectedSiteId);
                notifySuccess(
                  n > 0
                    ? `Domain signals saved. ${n} page score${n === 1 ? '' : 's'} updated.`
                    : 'Domain signals saved.',
                );
              }}
            />
            <TasksPanel audit={audit || { site: sites[0] || ({} as any), pages: [] }} />
            <ExternalIntegrations onNotified={notifySuccess} />
          </div>
        </div>
      )}

      {/* Off-Page Signals Modal / Drawer */}
      {selectedPageForOffPage && (
        <OffPageEditDialog
          page={selectedPageForOffPage}
          siteId={selectedSiteId || sites[0]?.id || 'default'}
          onClose={() => setSelectedPageForOffPage(null)}
          onSaved={() => {
            setSelectedPageForOffPage(null);
            if (selectedSiteId) loadRankings(selectedSiteId);
            notifySuccess('Off-page signals updated & score recalculated!');
          }}
        />
      )}

      {/* Page Checklist Breakdown Modal */}
      {selectedPageForChecklist && (
        <PageChecklistDialog
          page={selectedPageForChecklist}
          onClose={() => setSelectedPageForChecklist(null)}
          onAuditSingle={() => {
            auditSinglePage(selectedPageForChecklist.url, selectedPageForChecklist.targetKeyword);
            setSelectedPageForChecklist(null);
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
 * SUB-COMPONENTS
 * ========================================================================== */

function RankingsLeaderboard({
  pages,
  stats,
  loading,
  onAuditPage,
  onEditOffPage,
  onViewChecklist,
  busy,
}: {
  pages: SeoRankedPage[];
  stats: {
    totalPages: number;
    auditedPages: number;
    averageScore: number | null;
    highScoreCount: number;
    medScoreCount: number;
    lowScoreCount: number;
  };
  loading: boolean;
  onAuditPage: (url: string, keyword?: string) => void;
  onEditOffPage: (page: SeoRankedPage) => void;
  onViewChecklist: (page: SeoRankedPage) => void;
  busy: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'impr_desc' | 'conv_desc' | 'tier' | 'title'>('score_desc');

  const filteredPages = useMemo(() => {
    let list = [...pages];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.path?.toLowerCase().includes(q) ||
          p.targetKeyword?.toLowerCase().includes(q) ||
          p.family?.toLowerCase().includes(q),
      );
    }

    if (tierFilter !== 'all') {
      list = list.filter((p) => p.tier === Number(tierFilter));
    }

    if (scoreFilter === 'audited') {
      list = list.filter((p) => p.score !== null);
    } else if (scoreFilter === 'unaudited') {
      list = list.filter((p) => p.score === null);
    } else if (scoreFilter === 'high') {
      list = list.filter((p) => (p.score ?? 0) >= 80);
    } else if (scoreFilter === 'mid') {
      list = list.filter((p) => (p.score ?? 0) >= 60 && (p.score ?? 0) < 80);
    } else if (scoreFilter === 'low') {
      list = list.filter((p) => p.score !== null && (p.score ?? 0) < 60);
    } else if (scoreFilter === 'has_offpage') {
      list = list.filter((p) => p.offPage !== null);
    }

    list.sort((a, b) => {
      if (sortBy === 'score_desc') {
        if (a.score === null && b.score === null) return (b.impr ?? 0) - (a.impr ?? 0);
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return (b.score ?? 0) - (a.score ?? 0);
      }
      if (sortBy === 'score_asc') {
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return (a.score ?? 0) - (b.score ?? 0);
      }
      if (sortBy === 'impr_desc') {
        return (b.impr ?? 0) - (a.impr ?? 0);
      }
      if (sortBy === 'conv_desc') {
        return (b.conv ?? 0) - (a.conv ?? 0);
      }
      if (sortBy === 'tier') {
        return (a.tier ?? 99) - (b.tier ?? 99);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [pages, searchTerm, tierFilter, scoreFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Manifest Pages</p>
          <p className="mt-1 text-2xl font-bold text-ink-100">{stats.totalPages}</p>
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Avg Quality Score</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold ${
              (stats.averageScore ?? 0) >= 80 ? 'text-healthy-500' :
              (stats.averageScore ?? 0) >= 60 ? 'text-warn-500' : 'text-signal-500'
            }`}>
              {stats.averageScore ?? 'Ready'}
            </span>
            {stats.averageScore && <span className="text-[11px] text-ink-500">/ 100</span>}
          </div>
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Audited Live</p>
          <p className="mt-1 text-2xl font-bold text-signal-500">{stats.auditedPages} / {stats.totalPages}</p>
        </div>
        <div className="rounded-xl border border-healthy-500/20 bg-healthy-500/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-healthy-500">High Tier (80+)</p>
          <p className="mt-1 text-2xl font-bold text-healthy-500">{stats.highScoreCount}</p>
        </div>
        <div className="rounded-xl border border-warn-500/20 bg-warn-500/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-warn-500">Mid Tier (60-79)</p>
          <p className="mt-1 text-2xl font-bold text-warn-500">{stats.medScoreCount}</p>
        </div>
        <div className="rounded-xl border border-loss-500/20 bg-loss-500/5 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-loss-500">Needs Audit</p>
          <p className="mt-1 text-2xl font-bold text-loss-500">{stats.totalPages - stats.auditedPages}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-900/80 p-3.5">
        <div className="flex flex-1 items-center gap-2.5 min-w-[260px]">
          <Search className="size-4 text-ink-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pages by keyword, slug, destination, city..."
            className="w-full bg-transparent text-[13px] text-ink-100 placeholder:text-ink-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[11px] text-ink-500 hover:text-ink-300"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-ink-200 focus:border-signal-500 focus:outline-none"
          >
            <option value="all">All Tiers ({MANIFEST_DATA.length} Pages)</option>
            <option value="0">Tier 0 · Core Pillars (7)</option>
            <option value="1">Tier 1 · Origin Cities (47)</option>
            <option value="2">Tier 2 · Honeymoon & Family (22)</option>
            <option value="3">Tier 3 · Transport Routes (88)</option>
            <option value="4">Tier 4 · Place Guides (86)</option>
            <option value="5">Tier 5 · Month Hubs (10)</option>
            <option value="6">Tier 6 · Hindi Pages (10)</option>
          </select>

          {/* Score Filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-ink-200 focus:border-signal-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="audited">Audited Only</option>
            <option value="high">Score 80+ (High)</option>
            <option value="mid">Score 60–79 (Mid)</option>
            <option value="low">Score &lt;60 (Low)</option>
            <option value="has_offpage">Has Off-Page Data</option>
            <option value="unaudited">Pending Audit</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-ink-200 focus:border-signal-500 focus:outline-none"
          >
            <option value="score_desc">Highest Score First</option>
            <option value="impr_desc">Highest Search Demand (Google Ads)</option>
            <option value="conv_desc">Highest Historical Conversions</option>
            <option value="tier">By Manifest Tier</option>
            <option value="title">By Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Pages Leaderboard Table */}
      <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950">
        <div className="border-b border-ink-800 bg-ink-900/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-1">Rank / Tier</div>
          <div className="col-span-4">Page Title & URL</div>
          <div className="col-span-3">Target Query & Google Ads Demand</div>
          <div className="col-span-2 text-center">Health Score</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {filteredPages.length === 0 ? (
          <div className="py-16 text-center text-ink-500 text-[13px]">
            No pages match the search criteria.
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60 max-h-[800px] overflow-y-auto">
            {filteredPages.map((p, idx) => (
              <PageRankRow
                key={p.url || idx}
                rank={idx + 1}
                page={p}
                onAudit={() => onAuditPage(p.url, p.targetKeyword)}
                onEditOffPage={() => onEditOffPage(p)}
                onViewChecklist={() => onViewChecklist(p)}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageRankRow({
  rank,
  page: p,
  onAudit,
  onEditOffPage,
  onViewChecklist,
  busy,
}: {
  rank: number;
  page: SeoRankedPage;
  onAudit: () => void;
  onEditOffPage: () => void;
  onViewChecklist: () => void;
  busy: boolean;
}) {
  const scoreTone =
    p.score === null ? 'text-ink-600' :
    p.score >= 80 ? 'text-healthy-500' :
    p.score >= 60 ? 'text-warn-500' : 'text-loss-500';

  const tierBadge =
    p.tier === 0 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
    p.tier === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    p.tier === 2 ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
    p.tier === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    p.tier === 4 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    p.tier === 5 ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
    p.tier === 6 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
    'bg-ink-800 text-ink-400 border-ink-700';

  const tierLabel =
    p.tier === 0 ? 'T0 Core' :
    p.tier === 1 ? 'T1 Origin' :
    p.tier === 2 ? 'T2 Honeymoon' :
    p.tier === 3 ? 'T3 Route' :
    p.tier === 4 ? 'T4 Guide' :
    p.tier === 5 ? 'T5 Month' :
    p.tier === 6 ? 'T6 Hindi' : 'T' + p.tier;

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-ink-900/40 transition-colors">
      {/* Col 1: Rank & Tier */}
      <div className="col-span-1 flex items-center gap-2">
        <span className="text-[12px] font-mono font-medium text-ink-500 w-5">
          #{rank}
        </span>
        {p.tier !== undefined && (
          <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold border ${tierBadge}`}>
            {tierLabel}
          </span>
        )}
      </div>

      {/* Col 2: Page Title & URL */}
      <div className="col-span-4 min-w-0 pr-2">
        <div className="flex items-center gap-1.5">
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-[13px] font-medium text-ink-100 hover:text-signal-500 inline-flex items-center gap-1"
            title={p.title || p.path}
          >
            {p.title || p.path}
            <ExternalLink className="size-3 text-ink-500 shrink-0" />
          </a>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
          <span className="font-mono text-ink-500">{p.path}</span>
          {p.family && (
            <span className="rounded bg-ink-900 border border-ink-800 px-1.5 py-0.2 text-ink-400 text-[10px]">
              {p.family}
            </span>
          )}
        </div>
      </div>

      {/* Col 3: Target Query & Demand */}
      <div className="col-span-3 min-w-0 pr-2">
        {p.targetKeyword && (
          <p className="text-[12px] font-medium text-signal-400 truncate" title={p.targetKeyword}>
            🔑 {p.targetKeyword}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-500">
          {p.impr !== null && p.impr !== undefined && (
            <span>📈 {p.impr.toLocaleString()} impr</span>
          )}
          {p.conv !== null && p.conv !== undefined && (
            <span className="text-emerald-400">🎯 {p.conv} conv</span>
          )}
          {p.words && <span>📝 {p.words} words</span>}
        </div>
        {p.search && (
          <div
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-400"
            title="Google Search Console, last 28 days"
          >
            <span className="font-medium text-ink-500">Search:</span>
            <span className="tabular">{p.search.impressions.toLocaleString()} impr</span>
            <span className="tabular">{p.search.clicks.toLocaleString()} clicks</span>
            {p.search.position > 0 && <span className="tabular">pos {p.search.position.toFixed(1)}</span>}
            {p.search.clicksDelta.pct !== null && (
              <span className={`tabular ${p.search.clicksDelta.pct >= 0 ? 'text-healthy-400' : 'text-loss-400'}`}>
                {p.search.clicksDelta.pct > 0 ? '+' : ''}
                {p.search.clicksDelta.pct}%
              </span>
            )}
            {p.search.issueCount > 0 && (
              <span className="rounded border border-warn-500/40 bg-warn-500/10 px-1 text-warn-400">
                {p.search.issueCount} {p.search.issueCount === 1 ? 'issue' : 'issues'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Col 4: Health Score */}
      <div className="col-span-2 flex flex-col items-center justify-center">
        {p.score !== null ? (
          <div className="flex items-center gap-2">
            <ScoreRing score={p.score} size={36} stroke={3.5} />
            <div className="text-left">
              <span className={`text-[13px] font-bold ${scoreTone}`}>{p.score}</span>
              <span className="text-[10px] text-ink-500 block">
                {p.offPage ? 'On+Off Page' : 'On-Page only'}
              </span>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-signal-400 border border-signal-500/20 hover:bg-signal-500/10 px-2.5"
            onClick={onAudit}
            disabled={busy}
          >
            Audit Page
          </Button>
        )}
      </div>

      {/* Col 5: Actions */}
      <div className="col-span-2 flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-[11.5px] px-2.5"
          onClick={onViewChecklist}
        >
          Checklist
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11.5px] px-2 text-ink-400 hover:text-ink-100"
          onClick={onEditOffPage}
          title="Edit Off-page signals"
        >
          <Share2 className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11.5px] px-2 text-ink-400 hover:text-signal-500"
          onClick={onAudit}
          disabled={busy}
          title="Re-audit page"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================
 * TAB 2: MEDIA LIBRARY TAB
 * ========================================================================== */

function MediaLibraryTab({
  assets,
  pages,
  loading,
  onReload,
  notifySuccess,
}: {
  assets: MediaAssetRow[];
  pages: PageManifestItem[];
  loading: boolean;
  onReload: () => void;
  notifySuccess: (msg: string) => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterPage, setFilterPage] = useState('all');
  const [searchTag, setSearchTag] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('altText', altText.trim());
      formData.append('caption', caption.trim());
      formData.append('pageSlug', pageSlug);
      formData.append('tags', tags);

      await api.upload<MediaAssetRow>('/media', formData);
      setUploadOpen(false);
      setFile(null);
      setAltText('');
      setCaption('');
      setPageSlug('');
      setTags('');
      onReload();
      notifySuccess('Original image uploaded and registered for website page!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    notifySuccess('CDN image URL copied to clipboard!');
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (filterPage !== 'all' && a.pageSlug !== filterPage) return false;
      if (
        searchTag.trim() &&
        !a.tags?.some((t) => t.toLowerCase().includes(searchTag.toLowerCase())) &&
        !a.filename.toLowerCase().includes(searchTag.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [assets, filterPage, searchTag]);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-ink-100">Original Photography & Media Library</h2>
          <p className="text-[12.5px] text-ink-400">
            Upload genuine Ladakh photos and assign them to pages to meet Google's Information Gain standards.
          </p>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UploadCloud className="size-4" />
              Upload Website Photo
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Upload Website Photography"
            description="Upload authentic photos taken by the Leh ground team. Assign to a destination or package page."
          >
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="photoFile">Photo File *</Label>
                <input
                  id="photoFile"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 file:mr-3 file:rounded file:border-0 file:bg-signal-500/20 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-signal-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pageTarget">Assign to Website Page</Label>
                <select
                  id="pageTarget"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-signal-500 focus:outline-none"
                >
                  <option value="">-- General Website Asset --</option>
                  {pages.map((p) => (
                    <option key={p.url} value={p.url}>
                      {p.url} ({p.title?.slice(0, 45)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="altText">Descriptive Alt Text (For SEO & Screen Readers) *</Label>
                <Input
                  id="altText"
                  required
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="e.g. Sunrise over Pangong Tso from the Spangmik camps, snow on the peaks behind"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="caption">Caption (Optional)</Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Photographed by the Ladakh Vacation team, Leh"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="pangong, summer, camp, hero-image"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-ink-800 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={uploading || !file || !altText.trim()}>
                  {uploading ? 'Uploading…' : 'Upload to S3 CDN'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/70 p-3">
        <select
          value={filterPage}
          onChange={(e) => setFilterPage(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-1.5 text-[12.5px] text-ink-200 focus:border-signal-500 focus:outline-none max-w-xs"
        >
          <option value="all">All Assigned Pages ({assets.length})</option>
          {pages.map((p) => (
            <option key={p.url} value={p.url}>
              {p.url}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Input
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            placeholder="Search by tag or filename..."
            className="h-8 text-[12.5px]"
          />
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 rounded-xl shimmer bg-ink-900" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Panel>
          <PanelBody className="py-14 text-center">
            <ImageIcon className="mx-auto size-8 text-ink-500" />
            <p className="mt-3 text-[14px] font-medium text-ink-200">No photos in media library</p>
            <p className="mt-1 text-[12px] text-ink-500">
              Click &quot;Upload Website Photo&quot; to upload original photography.
            </p>
          </PanelBody>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group overflow-hidden rounded-xl border border-ink-800 bg-ink-950 flex flex-col justify-between hover:border-ink-700 transition-all"
            >
              <div className="relative aspect-video bg-ink-900 overflow-hidden">
                <img
                  src={asset.url}
                  alt={asset.altText}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {asset.pageSlug && (
                  <span className="absolute top-2 left-2 rounded bg-ink-950/80 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-signal-400 border border-ink-800">
                    {asset.pageSlug}
                  </span>
                )}
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[12.5px] font-medium text-ink-100 truncate" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-400 line-clamp-2 leading-relaxed" title={asset.altText}>
                    Alt: {asset.altText || <span className="text-loss-500 italic">No alt text</span>}
                  </p>
                </div>

                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((t, idx) => (
                      <span key={idx} className="rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-ink-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-ink-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-ink-500 font-mono">
                    {(asset.sizeBytes / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] px-2 gap-1"
                    onClick={() => copyUrl(asset.id, asset.url)}
                  >
                    {copiedId === asset.id ? (
                      <>
                        <Check className="size-3 text-healthy-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
 * MODAL: OFF-PAGE SIGNALS EDITOR
 * ========================================================================== */

function OffPageEditDialog({
  page,
  siteId,
  onClose,
  onSaved,
}: {
  page: SeoRankedPage;
  siteId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [backlinkCount, setBacklinkCount] = useState<number>(page.offPage?.backlinkCount ?? 0);
  const [referringDomains, setReferringDomains] = useState<number>(page.offPage?.referringDomains ?? 0);
  const [pageAuthority, setPageAuthority] = useState<number | string>(page.offPage?.pageAuthority ?? '');
  const [prMentions, setPrMentions] = useState<number>(page.offPage?.prMentions ?? 0);
  const [socialShares, setSocialShares] = useState<number>(page.offPage?.socialShares ?? 0);
  const [searchConsoleCtr, setSearchConsoleCtr] = useState<number | string>(page.offPage?.searchConsoleCtr ?? '');
  const [notes, setNotes] = useState<string>(page.offPage?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/seo/sites/${siteId}/off-page`, {
        url: page.url,
        backlinkCount: Number(backlinkCount) || 0,
        referringDomains: Number(referringDomains) || 0,
        pageAuthority: pageAuthority !== '' ? Number(pageAuthority) : null,
        prMentions: Number(prMentions) || 0,
        socialShares: Number(socialShares) || 0,
        searchConsoleCtr: searchConsoleCtr !== '' ? Number(searchConsoleCtr) : null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save off-page signals');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Off-Page SEO Signals & Backlinks"
        description={`Configure off-page ranking metrics for ${page.path}`}
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-lg bg-ink-900 p-3 text-[12px] text-ink-300">
            <span className="font-semibold text-ink-100">Formula Weight:</span> Off-page authority contributes up to 10 points on top of the 90-point on-page health score (Referring Domains: up to 6 pts, Backlinks: up to 2 pts, Site Domains: up to 2 pts, log-scaled). Third-party metrics like PA and social shares are tracked for reference only.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bl">Backlinks Count</Label>
              <Input
                id="bl"
                type="number"
                min="0"
                value={backlinkCount}
                onChange={(e) => setBacklinkCount(Number(e.target.value))}
              />
              <p className="text-[10.5px] text-ink-500">From Ahrefs / Search Console</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rd">Referring Domains</Label>
              <Input
                id="rd"
                type="number"
                min="0"
                value={referringDomains}
                onChange={(e) => setReferringDomains(Number(e.target.value))}
              />
              <p className="text-[10.5px] text-ink-500">Unique referring root domains</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="pa">Page Authority (0-100)</Label>
              <Input
                id="pa"
                type="number"
                min="0"
                max="100"
                value={pageAuthority}
                onChange={(e) => setPageAuthority(e.target.value)}
                placeholder="e.g. 28"
              />
              <p className="text-[10.5px] text-ink-500">Moz PA or Ahrefs URL Rating (UR)</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pr">PR / Press Releases</Label>
              <Input
                id="pr"
                type="number"
                min="0"
                value={prMentions}
                onChange={(e) => setPrMentions(Number(e.target.value))}
              />
              <p className="text-[10.5px] text-ink-500">Media articles citing this page</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ss">Social Shares / Mentions</Label>
              <Input
                id="ss"
                type="number"
                min="0"
                value={socialShares}
                onChange={(e) => setSocialShares(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ctr">GSC CTR (%)</Label>
              <Input
                id="ctr"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={searchConsoleCtr}
                onChange={(e) => setSearchConsoleCtr(e.target.value)}
                placeholder="e.g. 4.2"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">SEO Strategy Notes</Label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Target of Q3 Ladakh travel outreach campaign"
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-ink-800 pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Calculating…' : 'Save & Recalculate Score'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ==========================================================================
 * MODAL: PAGE HEALTH CHECKLIST
 * ========================================================================== */

function PageChecklistDialog({
  page,
  onClose,
  onAuditSingle,
}: {
  page: SeoRankedPage;
  onClose: () => void;
  onAuditSingle: () => void;
}) {
  const checks = page.checks || [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={`SEO Health Audit: ${page.title || page.path}`}
        description={`Target Query: "${page.targetKeyword || 'ladakh tour package'}" · Total Score: ${page.score ?? '—'}/100`}
      >
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Header score overview */}
          <div className="rounded-xl border border-ink-800 bg-ink-900 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Composite Score</p>
              <p className="text-3xl font-bold text-ink-100">{page.score ?? '—'}<span className="text-sm font-normal text-ink-500"> / 100</span></p>
              <p className="text-[11.5px] text-ink-400 mt-1">
                {page.offPage ? 'On-Page Health + Off-Page Authority' : 'On-Page Health (90 pts max)'}
              </p>
            </div>
            <ScoreRing score={page.score ?? 0} size={56} stroke={5} />
          </div>

          {/* Quick demand card */}
          {(page.impr || page.conv || page.words) && (
            <div className="rounded-lg bg-ink-950 border border-ink-800 p-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div>
                <p className="text-ink-500 uppercase text-[9.5px]">Search Demand</p>
                <p className="font-semibold text-ink-200">{page.impr ? page.impr.toLocaleString() + ' impr' : '—'}</p>
              </div>
              <div>
                <p className="text-ink-500 uppercase text-[9.5px]">Conversions</p>
                <p className="font-semibold text-emerald-400">{page.conv ?? '0'}</p>
              </div>
              <div>
                <p className="text-ink-500 uppercase text-[9.5px]">Target Depth</p>
                <p className="font-semibold text-ink-200">{page.words || '1000+ words'}</p>
              </div>
            </div>
          )}

          {checks.length === 0 ? (
            <div className="py-8 text-center text-ink-500 text-[13px] bg-ink-950 rounded-lg border border-ink-800 p-4">
              <p>This page has not been crawled live yet.</p>
              <p className="text-xs text-ink-400 mt-1">Click &quot;Re-audit This Page Now&quot; below to fetch HTML and run all 24 SEO health factor checks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-[12.5px] font-semibold text-ink-200 uppercase tracking-wider">
                SEO Health Signals ({checks.length} Checks)
              </h3>
              <ul className="divide-y divide-ink-800/60 border border-ink-800 rounded-lg overflow-hidden bg-ink-950">
                {checks.map((c, i) => (
                  <CheckRow key={i} check={c} page={page} />
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-ink-800 pt-4">
            <Button size="sm" variant="secondary" onClick={onAuditSingle}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Re-audit This Page Now
            </Button>
            <Button type="button" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ==========================================================================
 * SHARED UI HELPERS (ScoreRing, AddSiteDialog, SitePages, TasksPanel)
 * ========================================================================== */

function ScoreRing({
  score,
  unknown,
  size = 44,
  stroke = 4,
}: {
  score: number;
  unknown?: boolean;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = unknown ? 0 : (score / 100) * c;
  const tone =
    unknown ? 'text-ink-600' :
    score >= 80 ? 'text-healthy-500' :
    score >= 60 ? 'text-warn-500' : 'text-loss-500';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-ink-800" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          className={`transition-all duration-700 ${tone}`}
          stroke="currentColor"
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`tabular text-[10.5px] font-semibold ${tone}`}>
          {unknown ? '—' : score}
        </span>
      </div>
    </div>
  );
}

interface SeoAiFixResult {
  checkId: string;
  label: string;
  fixType: 'copy' | 'code' | 'meta' | 'editorial';
  headline: string;
  rationale: string;
  suggestion: string;
  instructions: string[];
}

function CheckRow({ check: c, page }: { check: SeoCheck; page: SeoRankedPage }) {
  const Icon = c.severity === 'pass' ? CheckCircle2 : c.severity === 'warn' ? AlertTriangle : XCircle;
  const tone =
    c.severity === 'pass' ? 'text-healthy-500' :
    c.severity === 'warn' ? 'text-warn-500' : 'text-loss-500';

  const [aiFix, setAiFix] = useState<SeoAiFixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleFixWithAi() {
    if (aiFix) {
      setAiFix(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<SeoAiFixResult>('/seo/ai-fix', {
        checkId: c.id,
        label: c.label,
        detail: c.detail,
        task: c.task,
        url: page.path || page.url,
        pageTitle: page.title,
        targetKeyword: page.targetKeyword,
      });
      setAiFix(res);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Could not generate AI fix.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!aiFix?.suggestion) return;
    navigator.clipboard.writeText(aiFix.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isFailingOrWarning = c.severity !== 'pass';

  return (
    <li className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-3.5 shrink-0 ${tone}`} strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-medium text-ink-100">
              {c.label}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {isFailingOrWarning && (
                <button
                  type="button"
                  onClick={handleFixWithAi}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Generate instant resolution for this check using AI"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3 animate-spin text-amber-400" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3 text-amber-400" />
                      <span>{aiFix ? 'Hide AI Fix' : 'Fix with AI'}</span>
                    </>
                  )}
                </button>
              )}
              <span className="text-[10px] text-ink-500 font-mono">
                {c.score ?? (c.severity === 'pass' ? c.weight : c.severity === 'warn' ? c.weight * 0.5 : 0)}/{c.weight} pts
              </span>
            </div>
          </div>
          {c.detail && <p className="text-[11px] text-ink-400 mt-0.5">{c.detail}</p>}
          {c.task && (
            <p className="mt-1 text-[11px] leading-relaxed text-warn-500 bg-warn-500/10 rounded px-2 py-1">
              💡 {c.task}
            </p>
          )}
          {error && <p className="mt-1 text-[11px] text-loss-400">{error}</p>}
        </div>
      </div>

      {aiFix && (
        <div className="ml-6.5 mt-2 rounded-lg border border-amber-500/30 bg-ink-900/90 p-3.5 space-y-2.5 text-left text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-5 rounded bg-amber-500/20 text-amber-400">
                <Sparkles className="size-3" />
              </span>
              <p className="font-semibold text-amber-300 text-[12px]">{aiFix.headline}</p>
            </div>
            <button
              type="button"
              onClick={() => setAiFix(null)}
              className="text-[10px] text-ink-500 hover:text-ink-300 px-1.5 py-0.5 rounded border border-ink-800"
            >
              Dismiss
            </button>
          </div>

          {aiFix.rationale && (
            <p className="text-[11px] text-ink-300 leading-relaxed bg-ink-950/70 p-2.5 rounded border border-ink-800/80">
              <strong className="text-ink-100 font-medium">Why Google ranks this: </strong>
              {aiFix.rationale}
            </p>
          )}

          <div className="relative rounded-md border border-ink-800 bg-black/80 p-3 font-mono text-[11px] text-ink-100 overflow-x-auto">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-ink-800/60 text-[10px] text-ink-400">
              <span className="uppercase font-sans tracking-wide text-ink-400 font-semibold">{aiFix.fixType} Solution</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] transition-colors"
              >
                {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Code / Text'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono leading-relaxed text-emerald-300/90 text-[11.5px]">
              {aiFix.suggestion}
            </pre>
          </div>

          {aiFix.instructions && aiFix.instructions.length > 0 && (
            <div className="space-y-1 pt-1 text-[10.5px] text-ink-400">
              <p className="font-medium text-ink-300 text-[11px]">Implementation Checklist:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {aiFix.instructions.map((inst, idx) => (
                  <li key={idx} className="leading-normal">{inst}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function AddSiteDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [paths, setPaths] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const crawlPaths = paths
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.post<{ id: string }>('/seo/sites', {
        name: name.trim(),
        url: url.trim(),
        crawlPaths,
      });
      setOpen(false);
      setName('');
      setUrl('');
      setPaths('');
      onCreated(res.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5">
          <Plus className="size-3.5" strokeWidth={1.75} />
          Register Site
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Register Site for SEO Audit"
        description="The homepage and manifest pages are crawled and audited against Google's published search quality and health guidelines."
      >
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sn">Name *</Label>
            <Input
              id="sn"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ladakh Vacation Website"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su">Homepage URL *</Label>
            <Input
              id="su"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={SITE_DOMAIN}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp">Additional Custom Paths (optional)</Label>
            <textarea
              id="sp"
              rows={3}
              value={paths}
              onChange={(e) => setPaths(e.target.value)}
              placeholder="/destinations/leh&#10;/packages/8-nights-ladakh-tour&#10;/packages/from/delhi"
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-[12px] text-loss-500">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={busy || !name.trim() || !url.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SitePages({
  audit,
  busy,
  onAudit,
}: {
  audit: SeoAuditResponse;
  busy: boolean;
  onAudit: () => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Gauge className="size-3.5" strokeWidth={1.75} />
          Core Web Vitals & Page Audits ({audit.pages.length})
        </PanelTitle>
        <Button size="sm" onClick={onAudit} disabled={busy}>
          <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          {busy ? 'Auditing…' : 'Re-audit'}
        </Button>
      </PanelHeader>

      {audit.pages.length === 0 ? (
        <PanelBody className="py-10 text-center text-ink-500 text-[13px]">
          No audit recorded yet. Click Re-audit above to crawl.
        </PanelBody>
      ) : (
        <PanelBody className="space-y-4">
          {audit.pages.map((p) => (
            <div key={p.id} className="rounded-lg border border-ink-800 bg-ink-950 p-4">
              <div className="flex items-start gap-4">
                <ScoreRing score={p.score} size={50} />
                <div className="min-w-0 flex-1">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] font-medium text-ink-100 hover:text-signal-500 inline-flex items-center gap-1"
                  >
                    {new URL(p.url).pathname === '/' ? 'Homepage' : new URL(p.url).pathname}
                    <ExternalLink className="size-3 text-ink-500" />
                  </a>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <Sub label="Perf" value={p.perfScore} />
                    <Sub label="A11y" value={p.a11yScore} />
                    <Sub label="Best" value={p.bpScore} />
                    <Sub label="SEO" value={p.seoScore} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </PanelBody>
      )}
    </Panel>
  );
}

function Sub({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null ? 'text-ink-600' :
    value >= 80 ? 'text-healthy-500' :
    value >= 60 ? 'text-warn-500' : 'text-loss-500';
  return (
    <div className="rounded bg-ink-900/60 p-1.5">
      <p className="text-[9px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`text-[13px] font-bold ${tone}`}>{value ?? '—'}</p>
    </div>
  );
}

function TasksPanel({ audit }: { audit: SeoAuditResponse }) {
  const tasks = audit.pages.flatMap((p) =>
    (p.tasks ?? []).map((t) => ({ ...t, url: p.url })),
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Actionable Fixes ({tasks.length})</PanelTitle>
      </PanelHeader>
      {tasks.length === 0 ? (
        <PanelBody className="py-8 text-center text-[12.5px] text-ink-500">
          No critical warnings on audited pages.
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60 max-h-96 overflow-y-auto">
          {tasks.slice(0, 15).map((t, i) => (
            <li key={i} className="px-4 py-2.5 text-[12px] text-ink-300">
              <span className={`inline-block size-1.5 rounded-full mr-2 ${t.severity === 'fail' ? 'bg-loss-500' : 'bg-warn-500'}`} />
              {t.task}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function IndexNowPanel({ onNotified }: { onNotified?: (msg: string) => void }) {
  const [status, setStatus] = useState<{
    configured: boolean;
    host?: string;
    keyLocation?: string;
    keyPreview?: string;
    isActive?: boolean;
  } | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.get<{
        configured: boolean;
        host?: string;
        keyLocation?: string;
        keyPreview?: string;
        isActive?: boolean;
      }>('/seo/indexnow/status');
      setStatus(s);
    } catch {
      setStatus({ configured: false, isActive: false });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const submitAllPages = async () => {
    setSubmittingAll(true);
    setResultMsg(null);
    try {
      const res = await api.post<{ ok: boolean; submitted: number; message: string }>('/seo/indexnow/submit-all', {});
      const msg = `✓ ${res.submitted} published pages submitted to IndexNow (Bing, Yandex, Seznam)`;
      setResultMsg({ ok: true, text: msg });
      if (onNotified) onNotified(msg);
    } catch (e: any) {
      const err = e instanceof ApiError ? e.message : 'Submission failed.';
      setResultMsg({ ok: false, text: `✗ ${err}` });
    } finally {
      setSubmittingAll(false);
    }
  };

  const submitSingleUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;
    setSubmittingSingle(true);
    setResultMsg(null);
    try {
      const res = await api.post<{ ok: boolean; submitted: number; message: string }>('/seo/indexnow/submit', {
        urls: [singleUrl.trim()],
      });
      const msg = `✓ "${singleUrl.trim()}" submitted to IndexNow`;
      setResultMsg({ ok: true, text: msg });
      if (onNotified) onNotified(msg);
      setSingleUrl('');
    } catch (e: any) {
      const err = e instanceof ApiError ? e.message : 'Submission failed.';
      setResultMsg({ ok: false, text: `✗ ${err}` });
    } finally {
      setSubmittingSingle(false);
    }
  };

  return (
    <Panel className="border-signal-500/30 bg-ink-950">
      <PanelHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-signal-500" />
          <PanelTitle>IndexNow Real-Time Indexing</PanelTitle>
        </div>
        {status?.configured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-healthy-500/40 bg-healthy-500/10 px-2 py-0.5 text-[10.5px] text-healthy-400">
            <CheckCircle2 className="size-3" />
            Active ({status.host})
          </span>
        ) : (
          <a
            href="/integrations?tab=analytics"
            className="text-[11px] text-primary-400 hover:text-primary-300 underline"
          >
            Configure →
          </a>
        )}
      </PanelHeader>
      <PanelBody className="space-y-3">
        <p className="text-[11.5px] text-ink-400 leading-relaxed">
          Instantly push pages to Bing, Yandex, Seznam and partner search engines within minutes of publishing.
        </p>

        {status?.configured && (
          <div className="rounded-lg border border-ink-800 bg-ink-900/60 p-2.5 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-ink-400">
              <span>Domain: <strong className="text-ink-200">{status.host}</strong></span>
              <span>Key: <code className="text-signal-400 font-mono text-[10.5px]">{status.keyPreview}</code></span>
            </div>
            <div className="flex items-center gap-2 text-ink-500 text-[10.5px]">
              <span>Key Verification:</span>
              <a
                href={status.keyLocation || `https://${status.host}/indexnow.txt`}
                target="_blank"
                rel="noreferrer"
                className="text-primary-400 hover:underline inline-flex items-center gap-0.5"
              >
                {status.keyLocation ? new URL(status.keyLocation).pathname : '/indexnow.txt'}
                <ExternalLink className="size-2.5 ml-0.5" />
              </a>
            </div>
          </div>
        )}

        {resultMsg && (
          <div
            className={`rounded-md border p-2.5 text-[11.5px] ${
              resultMsg.ok
                ? 'border-healthy-500/40 bg-healthy-500/10 text-healthy-400'
                : 'border-loss-500/40 bg-loss-500/10 text-loss-400'
            }`}
          >
            {resultMsg.text}
          </div>
        )}

        <div className="pt-1">
          <Button
            size="sm"
            onClick={submitAllPages}
            disabled={submittingAll || !status?.configured}
            className="w-full gap-2 text-[12px]"
          >
            {submittingAll ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Submitting All Pages…
              </>
            ) : (
              <>
                <Zap className="size-3.5 text-signal-500" />
                Push All Pages to IndexNow (Bing & Yandex)
              </>
            )}
          </Button>
        </div>

        <form onSubmit={submitSingleUrl} className="flex gap-2 pt-1">
          <Input
            value={singleUrl}
            onChange={(e) => setSingleUrl(e.target.value)}
            placeholder="e.g. /packages/8-nights-ladakh-tour"
            className="h-8 text-[12px] bg-ink-900 border-ink-800"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={submittingSingle || !singleUrl.trim() || !status?.configured}
            className="h-8 text-[11.5px] px-3 shrink-0"
          >
            {submittingSingle ? <Loader2 className="size-3 animate-spin" /> : 'Push URL'}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  );
}

function ExternalIntegrations({ onNotified }: { onNotified?: (msg: string) => void }) {
  return (
    <div className="space-y-4">
      <IndexNowPanel onNotified={onNotified} />

      <Panel>
        <PanelHeader>
          <PanelTitle>Other Search & Analytics Providers</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-3">
          <div className="rounded-lg border border-dashed border-ink-800 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-ink-200">Google Search Console</p>
              <Chip className="border-healthy-500/30 text-healthy-400">Active</Chip>
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Live clicks, impressions, and CTR synced to performance tab</p>
            <a
              href="/integrations?tab=analytics"
              className="mt-2 inline-block text-[11px] font-medium text-primary-400 hover:text-primary-300"
            >
              Manage Integration →
            </a>
          </div>

          <div className="rounded-lg border border-dashed border-ink-800 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-ink-200">Google Indexing API</p>
              <Chip className="border-signal-500/30 text-signal-400">Ready</Chip>
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Google Cloud Service Account for immediate URL notification</p>
            <a
              href="/integrations?tab=analytics"
              className="mt-2 inline-block text-[11px] font-medium text-primary-400 hover:text-primary-300"
            >
              Manage Credentials →
            </a>
          </div>

          <div className="rounded-lg border border-dashed border-ink-800 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-ink-200">DataForSEO / Ahrefs</p>
              <Chip className="border-signal-500/30 text-signal-500">Manual Entry Active</Chip>
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Domain Rating & Backlink Authority sync</p>
            <a
              href="/integrations?tab=analytics"
              className="mt-2 inline-block text-[11px] font-medium text-primary-400 hover:text-primary-300"
            >
              Configure API →
            </a>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

/**
 * Site-wide off-page signals.
 *
 * Separate from the per-page off-page dialog because these belong to the
 * domain: GBP completeness, review volume, citation consistency and site-level
 * referring domains are identical for every URL, so they lift the whole site's
 * scores at once rather than one page's.
 *
 * Ten optional numbers, filled in as they are verified. Nothing here is fetched
 * automatically, so verifiedOn matters: a citation count from six months ago is
 * worse than no number at all.
 */
const DOMAIN_SIGNAL_FIELDS: {
  key: keyof SeoDomainSignalsData;
  label: string;
  hint?: string;
  step?: string;
}[] = [
  { key: 'gbpCompleteness', label: 'GBP completeness %', hint: 'Hours, categories, services' },
  { key: 'gbpReviewCount', label: 'Google reviews' },
  { key: 'gbpAverageRating', label: 'Average rating', hint: '1.0 to 5.0', step: '0.1' },
  { key: 'gbpPostsLast30d', label: 'GBP posts (30d)', hint: 'Prominence decays without activity' },
  { key: 'citationsTotal', label: 'Citations total' },
  { key: 'citationsNapConsistent', label: 'NAP-consistent', hint: 'Ratio matters more than count' },
  { key: 'referringDomainsTotal', label: 'Referring domains', hint: 'Site-wide, not per page' },
  { key: 'toxicDomainCount', label: 'Toxic domains', hint: 'Costs bonus, never below zero' },
  { key: 'brandMentionsLinked', label: 'Mentions (linked)' },
  { key: 'brandMentionsUnlinked', label: 'Mentions (unlinked)', hint: 'Your outreach queue' },
];

function DomainSignalsPanel({
  siteId,
  onSaved,
}: {
  siteId: string;
  onSaved: (rescoredPages: number) => void;
}) {
  const [data, setData] = useState<SeoDomainSignalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await api.get<SeoDomainSignalsData | null>(
        `/seo/sites/${siteId}/domain-signals`,
      );
      setData(res);
      if (res) {
        const next: Record<string, string> = {};
        for (const f of DOMAIN_SIGNAL_FIELDS) {
          const v = res[f.key];
          next[f.key as string] = v === null || v === undefined ? '' : String(v);
        }
        setForm(next);
      }
    } catch {
      // A site with no row yet returns null, which is not an error worth showing.
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!siteId) return;
    setSaving(true);
    setError(null);
    try {
      // Send only what the operator actually filled in. An empty box stays
      // absent rather than becoming a zero, which would score as a real
      // measurement of "we have none of these".
      const body: Record<string, unknown> = {};
      for (const f of DOMAIN_SIGNAL_FIELDS) {
        const raw = form[f.key as string];
        if (raw !== undefined && raw !== '') body[f.key as string] = Number(raw);
      }
      body.verifiedOn = new Date().toISOString();

      const res = await api.put<SeoDomainSignalsData>(
        `/seo/sites/${siteId}/domain-signals`,
        body,
      );
      setData(res);
      setOpen(false);
      onSaved(res.rescoredPages ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save domain signals.');
    } finally {
      setSaving(false);
    }
  }

  const staleDays = data?.verifiedOn
    ? Math.floor((Date.now() - new Date(data.verifiedOn).getTime()) / 86400000)
    : null;

  const filled = DOMAIN_SIGNAL_FIELDS.filter(
    (f) => data && data[f.key] !== null && data[f.key] !== undefined,
  );

  return (
    <Panel>
      <PanelHeader className="flex items-center justify-between">
        <PanelTitle>Domain signals</PanelTitle>
        <Button
          size="sm"
          variant="secondary"
          className="h-7"
          onClick={() => setOpen((o) => !o)}
          disabled={!siteId}
        >
          {open ? 'Cancel' : data ? 'Edit' : 'Add'}
        </Button>
      </PanelHeader>

      <PanelBody>
        <p className="mb-3 text-[12px] leading-relaxed text-ink-400">
          Site-wide, not per page. These lift every page score equally.
        </p>

        {!open && (
          <>
            {loading && <p className="text-[13px] text-ink-500">Loading...</p>}

            {!loading && !data && (
              <p className="text-[13px] leading-relaxed text-ink-500">
                Nothing recorded yet. Google reviews and citation consistency are
                the strongest signals available to an operator based in Leh.
              </p>
            )}

            {!loading && data && (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {filled.map((f) => (
                    <div
                      key={String(f.key)}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <dt className="truncate text-[11.5px] text-ink-500">{f.label}</dt>
                      <dd className="tabular text-[12.5px] font-medium text-ink-100">
                        {String(data[f.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
                {filled.length === 0 && (
                  <p className="text-[13px] text-ink-500">No values recorded yet.</p>
                )}
                {staleDays !== null && (
                  <p
                    className={`mt-3 text-[11.5px] ${
                      staleDays > 90 ? 'text-warn-400' : 'text-ink-500'
                    }`}
                  >
                    {staleDays > 90
                      ? `Verified ${staleDays} days ago. Re-check against the live GBP.`
                      : `Verified ${staleDays} day${staleDays === 1 ? '' : 's'} ago.`}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {open && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {DOMAIN_SIGNAL_FIELDS.map((f) => (
                <div key={String(f.key)} className="space-y-1">
                  <Label htmlFor={`ds-${String(f.key)}`} className="text-[11px]">
                    {f.label}
                  </Label>
                  <Input
                    id={`ds-${String(f.key)}`}
                    type="number"
                    min={0}
                    step={f.step ?? '1'}
                    value={form[f.key as string] ?? ''}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.key as string]: e.target.value }))
                    }
                    className="h-8 text-right"
                  />
                  {f.hint && (
                    <p className="text-[10.5px] leading-tight text-ink-500">{f.hint}</p>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="text-[12px] text-loss-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save and rescore'}
              </Button>
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

/**
 * Google Search Console: sync control plus the striking-distance list.
 *
 * The Ads search-terms report told us what to build. This shows whether it
 * worked. Positions 11-20 with real impressions are the cheapest wins on the
 * site: the page already ranks, so a title rewrite or one internal link often
 * moves it, rather than needing a new page.
 */
function safePathname(raw: string): string {
  try {
    return new URL(raw).pathname;
  } catch {
    return raw;
  }
}

function SearchConsolePanel({
  siteId,
  onSynced,
}: {
  siteId: string;
  onSynced: (summary: string) => void;
}) {
  const [rows, setRows] = useState<SeoStrikingDistanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await api.get<SeoStrikingDistanceRow[]>(
        `/seo/sites/${siteId}/search-console/striking-distance?limit=25`,
      );
      setRows(res);
    } catch {
      // Nothing synced yet is the normal first state, not an error.
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    // Guarded here rather than by disabling the button, which fades it to 45%
    // and reads as broken during a sync that can take a minute.
    if (!siteId || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const r = await api.post<SeoSearchConsoleSyncResult>(
        `/seo/sites/${siteId}/search-console/sync`,
        {},
      );
      const rescoredMsg =
        r.rescoredAudits && r.rescoredAudits > 0
          ? ` (${r.rescoredAudits} page score${r.rescoredAudits === 1 ? '' : 's'} updated)`
          : '';
      onSynced(
        r.rowsFetched === 0
          ? `No Search Console data for ${r.from} to ${r.to}.`
          : `Synced ${r.rowsFetched.toLocaleString()} rows across ${r.pagesTouched} pages. ` +
              `${r.totalClicks.toLocaleString()} clicks, ` +
              `${r.totalImpressions.toLocaleString()} impressions. ` +
              `${r.offPageRowsUpdated} CTR values written back to scoring${rescoredMsg}.`,
      );
      // Release the button once the sync itself is done; the report reload
      // below shows its own loading state.
      setSyncing(false);
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not reach Search Console. Check the integration under Integrations → Search & analytics.',
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Panel>
      <PanelHeader className="flex items-center justify-between">
        <PanelTitle>Search Console</PanelTitle>
        <Button
          size="sm"
          variant="secondary"
          className="h-7"
          onClick={sync}
          disabled={!siteId}
          aria-busy={syncing}
        >
          <RefreshCw
            className={`size-3.5 ${syncing ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
          />
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </PanelHeader>

      <PanelBody>
        <p className="mb-3 text-[12px] leading-relaxed text-ink-400">
          Queries ranking 11 to 20. Already ranking, one nudge off page one.
        </p>

        {error && (
          <p role="alert" className="mb-3 text-[12px] text-loss-400">
            {error}
          </p>
        )}

        {loading && <p className="text-[13px] text-ink-500">Loading...</p>}

        {!loading && rows.length === 0 && (
          <p className="text-[13px] leading-relaxed text-ink-500">
            Nothing synced yet. Connect Google Search Console under Integrations → Search & analytics, then
            press Sync. Data lags about three days.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <ul className="max-h-[320px] divide-y divide-ink-800/60 overflow-y-auto">
            {rows.map((r) => (
              <li key={`${r.page}|${r.query}`} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] text-ink-100">{r.query}</span>
                  <span
                    className="tabular shrink-0 text-[12px] font-medium text-warn-400"
                    title="Average position"
                  >
                    #{r.position.toFixed(1)}
                  </span>
                </div>
                <div className="tabular mt-0.5 flex items-center gap-3 text-[11px] text-ink-500">
                  <span>{r.impressions.toLocaleString()} impr</span>
                  <span>{r.clicks} clicks</span>
                  <span>{r.ctr.toFixed(2)}% CTR</span>
                </div>
                <a
                  href={r.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-[11px] text-primary-400 hover:text-primary-300"
                >
                  {safePathname(r.page)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
