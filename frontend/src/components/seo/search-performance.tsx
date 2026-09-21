'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  api,
  ApiError,
  type SearchEntityRow,
  type SearchIssue,
  type SearchIssuePage,
  type SearchIssueType,
  type SearchReport,
  type SearchSeverity,
  type SeoSearchConsoleSyncResult,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { EChart, axisStyle, chartBase } from '@/components/echart';

/**
 * Search performance dashboard for the SEO section.
 *
 * Reads only rows the Search Console sync has already stored, so opening the
 * tab costs no API quota. Everything shown is about this site. Backlinks,
 * competitor keywords and search volume need a paid data source and are not
 * shown rather than estimated.
 */

const DAY_OPTIONS = [7, 28, 90] as const;

const ISSUE_META: Record<SearchIssueType, { label: string; hint: string }> = {
  cannibalisation: { label: 'Cannibalisation', hint: 'One query split across several of your pages' },
  low_ctr: { label: 'Low CTR', hint: 'On page one but few clicks for its position' },
  striking_distance: { label: 'Striking distance', hint: 'Ranks 11 to 20, one push from page one' },
  declining_page: { label: 'Declining page', hint: 'Clicks fell against the previous period' },
  position_drop: { label: 'Position drop', hint: 'Average position got worse' },
  lost_query: { label: 'Lost query', hint: 'Used to send clicks, now sends none' },
  off_target: { label: 'Off target', hint: 'Google shows another page for the target query' },
  no_visibility: { label: 'No visibility', hint: 'Planned page with no impressions' },
  new_query: { label: 'New query', hint: 'Started showing your site this period' },
};

const SEVERITY_STYLE: Record<SearchSeverity, string> = {
  high: 'border-loss-500/40 bg-loss-500/10 text-loss-400',
  medium: 'border-warn-500/40 bg-warn-500/10 text-warn-400',
  low: 'border-ink-700 bg-ink-850 text-ink-300',
  info: 'border-signal-500/40 bg-signal-500/10 text-signal-500',
};

const numberFormat = new Intl.NumberFormat('en-IN');
const fmtInt = (n: number) => numberFormat.format(Math.round(n));
const fmtCtr = (n: number) => `${n.toFixed(2)}%`;
const fmtPos = (n: number) => (n > 0 ? n.toFixed(1) : '-');
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });

function syncedLabel(iso: string | null | undefined): string {
  if (!iso) return 'never synced';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'synced just now';
  if (mins < 60) return `synced ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `synced ${hours}h ago`;
  return `synced ${Math.round(hours / 24)}d ago`;
}

/** Signed change. `invert` for metrics where lower is better, such as position. */
function Trend({
  value,
  unit = '%',
  invert = false,
  digits = 1,
}: {
  value: number | null;
  unit?: string;
  invert?: boolean;
  digits?: number;
}) {
  if (value === null || !Number.isFinite(value)) return <span className="text-ink-600">-</span>;
  if (value === 0) return <span className="text-ink-500">0{unit}</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span className={good ? 'text-healthy-400' : 'text-loss-400'}>
      {value > 0 ? '+' : ''}
      {value.toFixed(digits)}
      {unit}
    </span>
  );
}

function Kpi({
  label,
  value,
  trend,
  previous,
}: {
  label: string;
  value: string;
  trend: ReactNode;
  previous: string | null;
}) {
  return (
    <Panel>
      <PanelBody className="space-y-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-500">{label}</p>
        <p className="tabular text-[24px] font-semibold leading-tight text-ink-100">{value}</p>
        <p className="tabular text-[11.5px] text-ink-500">
          {trend}
          {previous !== null && <span className="ml-1.5">vs {previous}</span>}
        </p>
      </PanelBody>
    </Panel>
  );
}

export function SearchPerformance({
  siteId,
  onSynced,
}: {
  siteId: string;
  onSynced?: (summary: string) => void;
}) {
  const [days, setDays] = useState<number>(28);
  const [report, setReport] = useState<SearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SearchIssueType | 'all'>('all');
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed seconds while a sync runs, so a long sync visibly makes progress.
  useEffect(() => {
    if (!syncing) return;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [syncing]);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await api.get<SearchReport>(`/seo/sites/${siteId}/search-console/report?days=${days}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load search performance.');
    } finally {
      setLoading(false);
    }
  }, [siteId, days]);

  useEffect(() => {
    load();
  }, [load]);

  async function sync() {
    // Guarded here rather than by disabling the button during a sync.
    if (!siteId || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const r = await api.post<SeoSearchConsoleSyncResult>(`/seo/sites/${siteId}/search-console/sync`, {});
      onSynced?.(
        `Synced ${fmtInt(r.rowsFetched)} query rows and ${fmtInt(r.dimensionRows ?? 0)} total rows for ${r.from} to ${r.to}.`,
      );
      // Release the button once the sync itself is done; the report reload
      // below shows its own loading state.
      setSyncing(false);
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not reach Search Console. Check the integration under Integrations, Search & analytics.',
      );
    } finally {
      setSyncing(false);
    }
  }

  const presentTypes = useMemo(
    () =>
      report
        ? (Object.keys(ISSUE_META) as SearchIssueType[]).filter((t) => (report.issueCounts[t] ?? 0) > 0)
        : [],
    [report],
  );

  const filteredIssues = useMemo(
    () => (report?.issues ?? []).filter((i) => typeFilter === 'all' || i.type === typeFilter),
    [report, typeFilter],
  );
  const shownIssues = showAllIssues ? filteredIssues : filteredIssues.slice(0, 20);

  const severityCounts = useMemo(() => {
    const out: Record<SearchSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
    for (const i of report?.issues ?? []) out[i.severity]++;
    return out;
  }, [report]);

  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!report?.hasData) return null;
    const series: any[] = [
      {
        name: 'Clicks',
        type: 'line',
        data: report.series.map((p) => p.clicks),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#0f5147' },
        itemStyle: { color: '#0f5147' },
        areaStyle: { color: 'rgba(15, 81, 71, 0.08)' },
      },
      {
        name: 'Impressions',
        type: 'line',
        yAxisIndex: 1,
        data: report.series.map((p) => p.impressions),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#c08a2b' },
        itemStyle: { color: '#c08a2b' },
      },
    ];
    if (report.hasPrevious) {
      series.push({
        name: 'Clicks, previous period',
        type: 'line',
        data: report.series.map((p) => p.prevClicks ?? 0),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, type: 'dashed', color: '#9aa19f' },
        itemStyle: { color: '#9aa19f' },
      });
    }
    return {
      ...chartBase,
      tooltip: { ...(chartBase.tooltip as object), trigger: 'axis' },
      legend: { top: 0, right: 0, itemWidth: 14, textStyle: { color: '#6d6a5c', fontSize: 11 } },
      grid: { left: 8, right: 12, top: 34, bottom: 4, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: report.series.map((p) => fmtDay(p.date)), ...axisStyle },
      yAxis: [
        { type: 'value', ...axisStyle },
        { type: 'value', ...axisStyle, splitLine: { show: false } },
      ],
      series,
    } as EChartsOption;
  }, [report]);

  const o = report?.overview;
  const previousLabel = report?.hasPrevious ? `previous ${report.days} days` : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-100">Search performance</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-400">
            {report
              ? `${fmtDay(report.windows.current.from)} to ${fmtDay(report.windows.current.to)}, compared with the previous ${report.days} days`
              : 'Google Search Console'}
            {report && <span className="ml-2 text-ink-500">{syncedLabel(report.lastSyncedAt)}</span>}
            {report?.dataFrom && <span className="ml-2 text-ink-500">data from {fmtDay(report.dataFrom)}</span>}
            {!siteId && <span className="ml-2 text-warn-400">No site registered, so there is nothing to sync yet.</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-ink-800 p-0.5" role="group" aria-label="Period">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={`rounded px-2.5 py-1 text-[12px] transition-colors ${
                  days === d ? 'bg-ink-800 text-ink-100' : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {/*
            Not disabled while syncing. The disabled style fades the button to
            45% and blocks the pointer, which reads as a broken button during a
            sync that can take a minute. Repeat clicks are ignored in sync().
          */}
          <Button
            size="sm"
            variant="secondary"
            onClick={sync}
            disabled={!siteId}
            aria-busy={syncing}
            title={siteId ? 'Pull the latest Search Console data' : 'Register the site before syncing'}
          >
            <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            {syncing ? `Syncing ${elapsed}s` : 'Sync now'}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400">
          {error}
        </p>
      )}

      {syncing && (
        <p
          role="status"
          className="rounded-md border border-signal-500/40 bg-signal-500/10 px-3 py-2 text-[13px] text-signal-500"
        >
          Pulling up to 56 days from Search Console and rebuilding the report ({elapsed}s). This can take a minute or
          two; you can keep using the page.
        </p>
      )}

      {report?.hasData && !report.hasPrevious && (
        <p className="text-[12.5px] leading-relaxed text-ink-400">
          Search Console has no data for the {report.days} days before this period
          {report.dataFrom ? ` (data for this property starts ${fmtDay(report.dataFrom)})` : ''}, so changes against the
          previous period are not shown yet. The 7d view compares sooner.
        </p>
      )}

      {loading && !report && <p className="text-[13px] text-ink-500">Loading search performance...</p>}

      {report && !report.hasData && (
        <Panel>
          <PanelBody className="py-10 text-center">
            <p className="text-[14px] font-medium text-ink-100">No Search Console data for this period yet</p>
            <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-500">
              Press Sync now to pull the last 56 days. After that the nightly sync keeps it current.
              Search Console data runs about three days behind.
            </p>
          </PanelBody>
        </Panel>
      )}

      {report?.hasData && o && (
        <>
          {/* Totals */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Clicks"
              value={fmtInt(o.current.clicks)}
              trend={<Trend value={o.delta.clicks.pct} />}
              previous={previousLabel && fmtInt(o.previous.clicks)}
            />
            <Kpi
              label="Impressions"
              value={fmtInt(o.current.impressions)}
              trend={<Trend value={o.delta.impressions.pct} />}
              previous={previousLabel && fmtInt(o.previous.impressions)}
            />
            <Kpi
              label="Average CTR"
              value={fmtCtr(o.current.ctr)}
              trend={<Trend value={o.delta.ctr} unit=" pts" digits={2} />}
              previous={previousLabel && fmtCtr(o.previous.ctr)}
            />
            <Kpi
              label="Average position"
              value={fmtPos(o.current.position)}
              trend={<Trend value={o.delta.position} unit="" invert />}
              previous={previousLabel && fmtPos(o.previous.position)}
            />
          </div>

          {/* Trend chart */}
          {chartOption && (
            <Panel>
              <PanelHeader>
                <PanelTitle>Daily clicks and impressions</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <EChart option={chartOption} height={260} />
              </PanelBody>
            </Panel>
          )}

          {/* Issues */}
          <Panel className="overflow-hidden">
            <PanelHeader className="flex flex-wrap items-center justify-between gap-2">
              <PanelTitle>Issues and opportunities</PanelTitle>
              <span className="tabular text-[11px] text-ink-500">
                {severityCounts.high} high · {severityCounts.medium} medium · {severityCounts.low} low ·{' '}
                {severityCounts.info} info
              </span>
            </PanelHeader>
            <PanelBody className="p-0">
              {report.issues.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12.5px] text-ink-500">
                  No issues found for this period.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 border-b border-ink-800 px-5 py-3">
                    <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
                      All <span className="tabular ml-1 text-ink-500">{report.issues.length}</span>
                    </FilterChip>
                    {presentTypes.map((t) => (
                      <FilterChip
                        key={t}
                        active={typeFilter === t}
                        onClick={() => setTypeFilter(t)}
                        title={ISSUE_META[t].hint}
                      >
                        {ISSUE_META[t].label}
                        <span className="tabular ml-1 text-ink-500">{report.issueCounts[t]}</span>
                      </FilterChip>
                    ))}
                  </div>
                  <ul className="divide-y divide-ink-800/60">
                    {shownIssues.map((issue) => (
                      <IssueItem key={issue.id} issue={issue} />
                    ))}
                  </ul>
                  {filteredIssues.length > shownIssues.length && (
                    <div className="border-t border-ink-800 px-5 py-2.5 text-right">
                      <button
                        onClick={() => setShowAllIssues(true)}
                        className="text-[12px] font-medium text-primary-400 hover:text-primary-300"
                      >
                        Show all {filteredIssues.length}
                      </button>
                    </div>
                  )}
                </>
              )}
            </PanelBody>
          </Panel>

          {/* Pages and queries */}
          <div className="grid gap-5 xl:grid-cols-2">
            <EntityTable title="Top pages" rows={report.topPages} kind="page" hasPrevious={report.hasPrevious} />
            <EntityTable title="Top queries" rows={report.topQueries} kind="query" hasPrevious={report.hasPrevious} />
          </div>

          {/* Devices, countries, brand */}
          <div className="grid gap-5 lg:grid-cols-3">
            <ShareList title="Devices" rows={report.devices} />
            <ShareList title="Countries" rows={report.countries} />
            <BrandSplit report={report} />
          </div>

          <ul className="space-y-1 text-[11.5px] leading-relaxed text-ink-500">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${
        active
          ? 'border-signal-500 bg-signal-500/10 text-signal-500'
          : 'border-ink-800 text-ink-300 hover:border-ink-700 hover:text-ink-100'
      }`}
    >
      {children}
    </button>
  );
}

function IssueItem({ issue }: { issue: SearchIssue }) {
  const meta = ISSUE_META[issue.type];
  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.08em] ${SEVERITY_STYLE[issue.severity]}`}
        >
          {issue.severity}
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-ink-500" title={meta.hint}>
          {meta.label}
        </span>
        {issue.severity === 'high' && <AlertTriangle className="size-3.5 text-loss-400" strokeWidth={2} />}
      </div>

      <p className="mt-1 text-[13.5px] font-medium text-ink-100">{issue.title}</p>

      {issue.url && issue.type !== 'cannibalisation' && (
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[11.5px] text-primary-400 hover:text-primary-300"
        >
          <span className="truncate">{issue.path}</span>
          <ExternalLink className="size-3 shrink-0" strokeWidth={1.75} />
        </a>
      )}

      {issue.pages && issue.pages.length > 0 && issue.type !== 'no_visibility' && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[11.5px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-500">
                <th className="py-1 pr-3 font-medium">Page</th>
                <th className="py-1 pr-3 text-right font-medium">Share</th>
                <th className="py-1 pr-3 text-right font-medium">Clicks</th>
                <th className="py-1 pr-3 text-right font-medium">Impr.</th>
                <th className="py-1 text-right font-medium">Pos.</th>
              </tr>
            </thead>
            <tbody>
              {issue.pages.map((p, n) => (
                <tr key={p.path} className="border-t border-ink-800/60">
                  <td className="max-w-[240px] py-1 pr-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-primary-400 hover:text-primary-300"
                    >
                      {p.path}
                    </a>
                    {n === 0 && <span className="text-[10px] text-healthy-400">keep</span>}
                  </td>
                  <td className="tabular py-1 pr-3 text-right text-ink-300">{p.share}%</td>
                  <td className="tabular py-1 pr-3 text-right text-ink-100">{fmtInt(p.clicks)}</td>
                  <td className="tabular py-1 pr-3 text-right text-ink-300">{fmtInt(p.impressions)}</td>
                  <td className="tabular py-1 text-right text-ink-300">{fmtPos(p.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {issue.type === 'no_visibility' && issue.pages && issue.pages.length > 0 && (
        <VisibilityList pages={issue.pages} />
      )}

      <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-relaxed text-ink-300">{issue.action}</p>
    </li>
  );
}

function EntityTable({
  title,
  rows,
  kind,
  hasPrevious,
}: {
  title: string;
  rows: SearchEntityRow[];
  kind: 'page' | 'query';
  hasPrevious: boolean;
}) {
  const [limit, setLimit] = useState(15);
  const shown = rows.slice(0, limit);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        <span className="tabular text-[11px] text-ink-500">{rows.length} shown</span>
      </PanelHeader>
      <PanelBody className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-[12.5px] text-ink-500">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-800 text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                  <th className="px-5 py-2 font-medium">{kind === 'page' ? 'Page' : 'Query'}</th>
                  <th className="px-2 py-2 text-right font-medium">Clicks</th>
                  <th className="px-2 py-2 text-right font-medium">Change</th>
                  <th className="px-2 py-2 text-right font-medium">Impr.</th>
                  <th className="px-2 py-2 text-right font-medium">CTR</th>
                  <th className="px-5 py-2 text-right font-medium">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {shown.map((r) => {
                  const isNew = hasPrevious && r.previous.impressions === 0 && r.current.impressions > 0;
                  return (
                    <tr key={r.key}>
                      <td className="max-w-[280px] px-5 py-2">
                        {kind === 'page' && r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={r.label}
                            className="block truncate text-primary-400 hover:text-primary-300"
                          >
                            {r.label}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-ink-100" title={r.label}>
                              {r.label}
                            </span>
                            {r.brand && (
                              <span className="shrink-0 rounded border border-ink-700 px-1 text-[9.5px] uppercase tracking-[0.08em] text-ink-400">
                                brand
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-2 py-2 text-right text-ink-100">{fmtInt(r.current.clicks)}</td>
                      <td className="tabular px-2 py-2 text-right">
                        {isNew ? <span className="text-signal-500">new</span> : <Trend value={r.clicksDelta.pct} />}
                      </td>
                      <td className="tabular px-2 py-2 text-right text-ink-300">{fmtInt(r.current.impressions)}</td>
                      <td className="tabular px-2 py-2 text-right text-ink-300">{fmtCtr(r.current.ctr)}</td>
                      <td className="tabular px-5 py-2 text-right text-ink-300">{fmtPos(r.current.position)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > limit && (
          <div className="border-t border-ink-800 px-5 py-2 text-right">
            <button
              onClick={() => setLimit((l) => l + 25)}
              className="text-[12px] font-medium text-primary-400 hover:text-primary-300"
            >
              Show more
            </button>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function ShareList({ title, rows }: { title: string; rows: SearchEntityRow[] }) {
  const clicks = rows.reduce((s, r) => s + r.current.clicks, 0);
  const byImpressions = clicks === 0;
  const total = byImpressions ? rows.reduce((s, r) => s + r.current.impressions, 0) : clicks;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        <span className="text-[11px] text-ink-500">share of {byImpressions ? 'impressions' : 'clicks'}</span>
      </PanelHeader>
      <PanelBody className="space-y-2.5">
        {rows.length === 0 || total === 0 ? (
          <p className="text-[12.5px] text-ink-500">No data for this period.</p>
        ) : (
          rows.slice(0, 8).map((r) => {
            const value = byImpressions ? r.current.impressions : r.current.clicks;
            const share = (value / total) * 100;
            return (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="truncate text-ink-200">{r.label}</span>
                  <span className="tabular shrink-0 text-ink-400">
                    {fmtInt(value)} · {share.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full bg-signal-500/70" style={{ width: `${Math.max(1, share)}%` }} />
                </div>
              </div>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}

function BrandSplit({ report }: { report: SearchReport }) {
  const { brand, nonBrand, terms } = report.brand;
  const total = brand.clicks + nonBrand.clicks;
  const brandShare = total > 0 ? (brand.clicks / total) * 100 : 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Brand vs non-brand</PanelTitle>
        <span className="text-[11px] text-ink-500">brand terms: {terms.join(', ')}</span>
      </PanelHeader>
      <PanelBody className="space-y-3">
        {total === 0 ? (
          <p className="text-[12.5px] text-ink-500">No query clicks for this period.</p>
        ) : (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-ink-800">
              <div className="h-full bg-signal-500/70" style={{ width: `${brandShare}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="text-ink-500">Brand</p>
                <p className="tabular text-[16px] font-semibold text-ink-100">{fmtInt(brand.clicks)}</p>
                <p className="tabular text-ink-500">
                  {fmtInt(brand.impressions)} impr · {fmtCtr(brand.ctr)}
                </p>
              </div>
              <div>
                <p className="text-ink-500">Non-brand</p>
                <p className="tabular text-[16px] font-semibold text-ink-100">{fmtInt(nonBrand.clicks)}</p>
                <p className="tabular text-ink-500">
                  {fmtInt(nonBrand.impressions)} impr · {fmtCtr(nonBrand.ctr)}
                </p>
              </div>
            </div>
            <p className="text-[11.5px] leading-relaxed text-ink-500">
              Non-brand clicks are the ones SEO work wins. Brand clicks come from people who already know Ladakh Vacation.
            </p>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

/** Pages in the grouped visibility issue, highest tier and Ads demand first. */
function VisibilityList({ pages }: { pages: SearchIssuePage[] }) {
  const [limit, setLimit] = useState(12);
  const remaining = pages.length - limit;

  return (
    <div className="mt-2">
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {pages.slice(0, limit).map((p) => (
          <li key={p.path} className="flex items-baseline justify-between gap-2 text-[11.5px]">
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={p.path}
              className="truncate text-primary-400 hover:text-primary-300"
            >
              {p.path}
            </a>
            <span className="tabular shrink-0 text-ink-500">
              {p.tier !== null && p.tier !== undefined ? `T${p.tier}` : ''}
              {p.adsImpressions ? ` · ${fmtInt(p.adsImpressions)} Ads impr` : ''}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          onClick={() => setLimit((l) => l + 48)}
          className="mt-1.5 text-[11.5px] font-medium text-primary-400 hover:text-primary-300"
        >
          Show {Math.min(48, remaining)} more ({remaining} left)
        </button>
      )}
    </div>
  );
}
