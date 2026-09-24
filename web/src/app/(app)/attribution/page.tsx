'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  TrendingUp,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  api,
  ApiError,
  type LandingPageRow,
  type AdSpendRow,
  type PageReportRow,
  type DailyReportRow,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { money, moneyShort, percent, shortDate } from '@/lib/format';
import { humanise } from '@/lib/constants';
import { toApiRange, localDateISO } from '@/lib/date-range';

/**
 * One dashboard, four questions:
 *   1. Which landing page is turning traffic into leads? (conversion %)
 *   2. Which one is turning leads into bookings? (booking rate %)
 *   3. What is each lead costing me? (CPL)
 *   4. Is any of it making money? (ROAS)
 *
 * The daily strip up top is the "are we spending sensibly this week" glance.
 * The page table is the "which one should I kill" answer.
 */

const AD_CHANNELS = [
  'GOOGLE_ADS',
  'META_ADS',
  'INSTAGRAM',
  'YOUTUBE',
  'LINKEDIN',
  'SEO',
  'EMAIL',
  'AFFILIATE',
  'OTHER',
] as const;

// Default range: last 30 days. Marketing decisions get made on weeks, not on
// a single day's noise.
function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: localDateISO(from), to: localDateISO(to) };
}

export default function AttributionPage() {
  const [range, setRange] = useState(defaultRange);
  const [pages, setPages] = useState<PageReportRow[]>([]);
  const [daily, setDaily] = useState<DailyReportRow[]>([]);
  const [spendRows, setSpendRows] = useState<AdSpendRow[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const api_range = toApiRange(range);
    const q = new URLSearchParams({ from: api_range.from ?? '', to: api_range.to ?? '' });
    try {
      const [pg, dy, sp, lp] = await Promise.all([
        api.get<PageReportRow[]>(`/attribution/pages?${q}`),
        api.get<DailyReportRow[]>(`/attribution/daily?${q}`),
        api.get<AdSpendRow[]>(`/ad-spend?${q}`),
        api.get<LandingPageRow[]>('/landing-pages'),
      ]);
      setPages(pg);
      setDaily(dy);
      setSpendRows(sp);
      setLandingPages(lp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load attribution.');
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Pull spend straight from Google Ads for the range on screen.
   *
   * Safe to press repeatedly: the sync is keyed on the platform's own row id,
   * so a second run over the same dates updates rather than duplicates. That
   * is also why re-syncing recent days is worth doing — Google restates cost
   * figures for several days after the fact.
   */
  async function syncGoogleAds() {
    setSyncing(true);
    setSyncNote(null);
    setError(null);
    try {
      const r = toApiRange(range);
      const results = await api.post<
        { rowsFetched: number; created: number; updated: number; totalAmount: number; currency: string }[]
      >('/ad-spend/sync/google-ads', { from: r.from, to: r.to });

      const rows = results.reduce((a, x) => a + x.rowsFetched, 0);
      const created = results.reduce((a, x) => a + x.created, 0);
      const updated = results.reduce((a, x) => a + x.updated, 0);
      const total = results.reduce((a, x) => a + x.totalAmount, 0);

      setSyncNote(
        rows === 0
          ? 'Google Ads returned no spend for this range.'
          : `Synced ${rows} campaign-days from ${results.length} account(s) — ${created} new, ${updated} updated, ${money(total)} total.`,
      );
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not reach Google Ads. Check the integration under Integrations → Ads platforms.',
      );
    } finally {
      setSyncing(false);
    }
  }

  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That change did not save.');
    } finally {
      setBusy(false);
    }
  }

  const totals = pages.reduce(
    (a, p) => ({
      visits: a.visits + p.visits,
      leads: a.leads + p.leads,
      bookings: a.bookings + p.bookings,
      revenue: a.revenue + p.revenue,
      spend: a.spend + p.spend,
    }),
    { visits: 0, leads: 0, bookings: 0, revenue: 0, spend: 0 },
  );
  const overallCpl = totals.leads > 0 ? Math.round(totals.spend / totals.leads) : null;
  const overallRoas = totals.spend > 0 ? totals.revenue / totals.spend : null;

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Attribution
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Which landing page and which campaign is actually earning.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-8 w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-8 w-[140px]"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={syncGoogleAds}
            disabled={syncing}
            className="h-8"
            title="Pull campaign spend from Google Ads for the selected range"
          >
            <RefreshCw
              className={`size-4 ${syncing ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            {syncing ? 'Syncing…' : 'Sync Google Ads'}
          </Button>
        </div>
      </header>

      {syncNote && (
        <p
          role="status"
          className="mb-4 rounded-md border border-healthy-500/40 bg-healthy-500/10 px-3 py-2 text-[13px] text-healthy-400"
        >
          {syncNote}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
        >
          {error}
        </p>
      )}

      {/* Headline numbers */}
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Stat label="Spend" value={money(totals.spend)} sub={`${daily.length} days`} />
        <Stat
          label="Leads"
          value={String(totals.leads)}
          sub={`${totals.visits.toLocaleString()} visits`}
        />
        <Stat
          label="Cost per lead"
          value={overallCpl === null ? '—' : money(overallCpl)}
          sub={
            totals.bookings > 0
              ? `${totals.bookings} bookings`
              : 'no bookings yet'
          }
        />
        <Stat
          label="ROAS"
          value={overallRoas === null ? '—' : `${overallRoas.toFixed(2)}×`}
          sub={money(totals.revenue) + ' revenue'}
        />
      </div>

      <DailyStrip data={daily} />

      {/* Landing pages ranked by CPL */}
      <Panel className="mt-4 overflow-hidden">
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2">
            <TrendingUp className="size-3.5" strokeWidth={1.75} />
            Landing pages
          </PanelTitle>
        </PanelHeader>

        {pages.length === 0 ? (
          <PanelBody className="py-10 text-center">
            <p className="text-[13px] text-ink-300">No landing pages yet</p>
            <p className="mt-1 text-[12px] text-ink-500">
              Register a page below, then have it call POST /api/visits on
              load.
            </p>
          </PanelBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                  <th className="px-4 py-2.5 font-medium">Page</th>
                  <th className="px-4 py-2.5 text-right font-medium">Visits</th>
                  <th className="px-4 py-2.5 text-right font-medium">Leads</th>
                  <th className="px-4 py-2.5 text-right font-medium">Conv %</th>
                  <th className="px-4 py-2.5 text-right font-medium">Book</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-4 py-2.5 text-right font-medium">CPL</th>
                  <th className="px-4 py-2.5 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {pages
                  .slice()
                  .sort((a, b) => (b.leads + b.visits) - (a.leads + a.visits))
                  .map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60"
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-ink-100">{p.name}</div>
                        <div className="tabular mt-0.5 text-[11px] text-ink-500">
                          /{p.slug}
                          {p.campaign && (
                            <Chip className="ml-1.5">{p.campaign}</Chip>
                          )}
                        </div>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-300">
                        {p.visits.toLocaleString()}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-100">
                        {p.leads}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-400">
                        {p.visits > 0 ? percent(p.conversionPercent) : '—'}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-300">
                        {p.bookings}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-300">
                        {moneyShort(p.revenue)}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-300">
                        {moneyShort(p.spend)}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-100">
                        {p.costPerLead === null ? '—' : money(p.costPerLead)}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">
                        {p.roas === null ? (
                          <span className="text-ink-600">—</span>
                        ) : (
                          <span
                            className={
                              p.roas >= 3
                                ? 'text-healthy-400'
                                : p.roas >= 1
                                  ? 'text-warn-400'
                                  : 'text-loss-400'
                            }
                          >
                            {p.roas.toFixed(2)}×
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LandingPagePanel
          pages={landingPages}
          busy={busy}
          onCreate={(body) => mutate(() => api.post('/landing-pages', body))}
        />
        <SpendPanel
          rows={spendRows}
          pages={landingPages}
          busy={busy}
          onCreate={(body) => mutate(() => api.post('/ad-spend', body))}
          onDelete={(id) => mutate(() => api.del(`/ad-spend/${id}`))}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Panel>
      <PanelBody className="py-3.5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-ink-500">
          {label}
        </p>
        <p className="tabular mt-1 text-[17px] font-semibold text-ink-50">
          {value}
        </p>
        {sub && <p className="tabular mt-0.5 text-[11px] text-ink-500">{sub}</p>}
      </PanelBody>
    </Panel>
  );
}

/**
 * Sparkline over the range. Two series overlaid on the same X axis: spend
 * (line) and leads (bar). Deliberately monochrome — the trend shape matters,
 * not the exact number, and colour is reserved for margin verdicts elsewhere
 * in the product.
 */
function DailyStrip({ data }: { data: DailyReportRow[] }) {
  if (data.length === 0) {
    return (
      <Panel>
        <PanelBody className="py-8 text-center text-[12px] text-ink-500">
          No spend or leads recorded in this range.
        </PanelBody>
      </Panel>
    );
  }
  const maxSpend = Math.max(1, ...data.map((d) => d.spend));
  const maxLeads = Math.max(1, ...data.map((d) => d.leads));

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Daily</PanelTitle>
        <span className="text-[11px] text-ink-500">spend line · leads bars</span>
      </PanelHeader>
      <PanelBody>
        <div className="flex h-24 items-end gap-1">
          {data.map((d) => {
            const barHeight = (d.leads / maxLeads) * 100;
            const spendHeight = (d.spend / maxSpend) * 100;
            return (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center gap-0.5"
                title={`${shortDate(d.day)} · ${money(d.spend)} · ${d.leads} leads`}
              >
                <div
                  className="w-full rounded-sm bg-ink-700"
                  style={{ height: `${spendHeight}%`, minHeight: 1 }}
                />
                <div
                  className="w-full rounded-sm bg-signal-500/12"
                  style={{ height: `${barHeight}%`, minHeight: d.leads > 0 ? 2 : 0 }}
                />
              </div>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}

function LandingPagePanel({
  pages,
  busy,
  onCreate,
}: {
  pages: LandingPageRow[];
  busy: boolean;
  onCreate: (body: Record<string, unknown>) => void;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [campaign, setCampaign] = useState('');
  const [url, setUrl] = useState('');

  function submit() {
    if (!slug.trim() || !name.trim()) return;
    onCreate({
      slug: slug.trim().toLowerCase(),
      name: name.trim(),
      campaign: campaign.trim() || undefined,
      url: url.trim() || undefined,
    });
    setSlug('');
    setName('');
    setCampaign('');
    setUrl('');
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Landing pages</PanelTitle>
        <span className="tabular text-[11px] text-ink-500">
          {pages.filter((p) => p.isActive).length} active
        </span>
      </PanelHeader>

      {pages.length > 0 && (
        <ul className="divide-y divide-ink-800/60">
          {pages.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink-100">
                  {p.name}
                  {!p.isActive && (
                    <span className="ml-2 text-[11px] text-ink-600">inactive</span>
                  )}
                </p>
                <p className="tabular mt-0.5 text-[11px] text-ink-500">
                  /{p.slug}
                  {p.campaign && <span className="ml-2">· {p.campaign}</span>}
                </p>
              </div>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-ink-500 hover:bg-ink-800 hover:text-ink-200"
                >
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-ink-800 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="lp-slug">Slug</Label>
            <Input
              id="lp-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ladakh-honeymoon-2026"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lp-name">Name</Label>
            <Input
              id="lp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ladakh honeymoon 2026"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lp-camp">Campaign</Label>
            <Input
              id="lp-camp"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="honeymoon"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lp-url">URL</Label>
            <Input
              id="lp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={busy || !slug.trim() || !name.trim()}
            onClick={submit}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Add page
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function SpendPanel({
  rows,
  pages,
  busy,
  onCreate,
  onDelete,
}: {
  rows: AdSpendRow[];
  pages: LandingPageRow[];
  busy: boolean;
  onCreate: (body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [spendDate, setSpendDate] = useState(today);
  const [channel, setChannel] = useState<string>('GOOGLE_ADS');
  const [campaign, setCampaign] = useState('');
  const [landingPageId, setLandingPageId] = useState('');
  const [amount, setAmount] = useState('');

  function submit() {
    const n = Number(amount);
    if (!n) return;
    onCreate({
      spendDate,
      channel,
      campaign: campaign.trim() || undefined,
      landingPageId: landingPageId || undefined,
      amount: n,
    });
    setAmount('');
    setCampaign('');
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Ad spend</PanelTitle>
      </PanelHeader>

      {rows.length > 0 ? (
        <ul className="max-h-[260px] divide-y divide-ink-800/60 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="group flex items-center gap-3 px-5 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-100">
                  <span className="tabular font-medium">{money(r.amount)}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-[0.08em] text-ink-500">
                    {humanise(r.channel)}
                  </span>
                  {/* Synced rows are owned by the integration and get
                      overwritten on the next pull; manual rows never do. */}
                  {r.externalSource && (
                    <span
                      className="ml-2 rounded border border-ink-700 px-1 py-px text-[10px] uppercase tracking-[0.08em] text-ink-400"
                      title="Pulled from Google Ads — will be refreshed on the next sync"
                    >
                      synced
                    </span>
                  )}
                </p>
                <p className="tabular mt-0.5 text-[11px] text-ink-500">
                  {shortDate(r.spendDate)}
                  {r.campaign && <span className="ml-2">· {r.campaign}</span>}
                  {r.landingPage && (
                    <span className="ml-2">→ {r.landingPage.name}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Remove this spend row?')) onDelete(r.id);
                }}
                disabled={busy}
                aria-label="Remove spend"
                className="rounded p-1 text-ink-600 opacity-0 transition-[opacity,color,background-color] duration-150 group-hover:opacity-100 hover:bg-ink-800 hover:text-loss-400"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <PanelBody className="py-6 text-center text-[12px] text-ink-500">
          No spend recorded in this range.
        </PanelBody>
      )}

      <div className="border-t border-ink-800 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sp-date">Date</Label>
            <Input
              id="sp-date"
              type="date"
              value={spendDate}
              onChange={(e) => setSpendDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-ch">Channel</Label>
            <Select
              id="sp-ch"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {AD_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {humanise(c)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-camp">Campaign</Label>
            <Input
              id="sp-camp"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="honeymoon-search-may"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-page">Landing page</Label>
            <Select
              id="sp-page"
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
            >
              <option value="">(unassigned)</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sp-amount">Amount (₹)</Label>
            <Input
              id="sp-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12500"
              className="text-right"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={busy || !amount} onClick={submit}>
            <Plus className="size-4" strokeWidth={1.75} />
            Add spend
          </Button>
        </div>
      </div>
    </Panel>
  );
}
