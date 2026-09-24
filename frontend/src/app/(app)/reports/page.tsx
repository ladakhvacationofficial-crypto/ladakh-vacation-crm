'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { TrendingUp, Users2, Building2, XCircle, Radio } from 'lucide-react';
import {
  api,
  ApiError,
  type RevenueRow,
  type StaffRow,
  type VendorSpendRow,
  type CancellationsReport,
  type SourceRow,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Input, Label } from '@/components/ui/input';
import { EChart, chartBase, axisStyle } from '@/components/echart';
import { Chip } from '@/components/ui/badge';
import { money, moneyShort, percent } from '@/lib/format';
import { humanise } from '@/lib/constants';
import { toApiRange, localDateISO } from '@/lib/date-range';

/**
 * Agency-wide numbers. Range picker at top; every panel below re-fetches on
 * change so the operator can drill from "last 30 days" to "this quarter"
 * without landing on stale rows.
 */

function defaultRange() {
  // Last 90 days by default — long enough to show a monthly revenue trend
  // for a business with a few bookings a week.
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return { from: localDateISO(from), to: localDateISO(to) };
}

export default function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [vendors, setVendors] = useState<VendorSpendRow[]>([]);
  const [cancellations, setCancellations] = useState<CancellationsReport | null>(null);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const api_range = toApiRange(range);
    const q = new URLSearchParams({ from: api_range.from ?? '', to: api_range.to ?? '' });
    try {
      const [r, s, v, c, src] = await Promise.all([
        api.get<RevenueRow[]>(`/reports/revenue?${q}`),
        api.get<StaffRow[]>(`/reports/staff?${q}`),
        api.get<VendorSpendRow[]>(`/reports/vendors?${q}`),
        api.get<CancellationsReport>(`/reports/cancellations?${q}`),
        api.get<SourceRow[]>(`/reports/sources?${q}`),
      ]);
      setRevenue(r);
      setStaff(s);
      setVendors(v);
      setCancellations(c);
      setSources(src);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = revenue.reduce((a, r) => a + r.revenue, 0);
  const totalBookings = revenue.reduce((a, r) => a + r.bookings, 0);
  const avgDeal = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const revenueOption = useMemo<EChartsOption>(() => {
    // A monthly line — deliberately no colour outside brand teal so the eye
    // reads the shape (trend) rather than any specific value.
    return {
      ...chartBase,
      grid: { ...chartBase.grid, left: 8, right: 12, top: 24, bottom: 4, containLabel: true },
      xAxis: {
        type: 'category',
        ...axisStyle,
        data: revenue.map((r) => r.month),
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        ...axisStyle,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => moneyShort(v),
        },
      },
      tooltip: {
        ...chartBase.tooltip,
        trigger: 'axis',
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const row = revenue[p.dataIndex];
          if (!row) return '';
          return `<b>${row.month}</b><br/>${money(row.revenue)}<br/>${row.bookings} booking${row.bookings === 1 ? '' : 's'}`;
        },
      },
      series: [
        {
          type: 'line',
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 6,
          data: revenue.map((r) => r.revenue),
          lineStyle: { color: '#1e4fa8', width: 2 },
          itemStyle: { color: '#1e4fa8' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(14,93,113,0.20)' },
                { offset: 1, color: 'rgba(14,93,113,0)' },
              ],
            },
          },
        },
      ],
    };
  }, [revenue]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Reports
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            The agency-wide view. Revenue, top performers, supplier spend,
            cancellations, source mix.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from" type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-8 w-full sm:w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to" type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-8 w-full sm:w-[140px]"
            />
          </div>
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      {/* Headline strip */}
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Revenue" value={money(totalRevenue)} sub={`${totalBookings} bookings`} />
        <Stat label="Avg deal size" value={money(avgDeal)} sub="in this range" />
        <Stat
          label="Cancellation rate"
          value={cancellations ? percent(cancellations.cancellationPercent) : '—'}
          sub={cancellations ? `${cancellations.cancelled} of ${cancellations.total}` : ''}
          tone={
            !cancellations || cancellations.cancellationPercent < 10
              ? 'healthy'
              : cancellations.cancellationPercent < 20
                ? 'warn'
                : 'loss'
          }
        />
        <Stat
          label="Lost revenue"
          value={cancellations ? money(cancellations.lostRevenue) : '—'}
          sub="cancellation impact"
          tone="loss"
        />
      </div>

      {/* Revenue trend */}
      <Panel className="mt-5">
        <PanelHeader>
          <PanelTitle className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5" strokeWidth={1.75} />
            Revenue by month
          </PanelTitle>
        </PanelHeader>
        <PanelBody>
          {loading ? (
            <div className="h-[220px] w-full rounded shimmer" />
          ) : revenue.length === 0 ? (
            <Empty title="No revenue in this range" hint="Widen the date filter or book something." />
          ) : (
            <EChart option={revenueOption} height={220} />
          )}
        </PanelBody>
      </Panel>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* Top staff */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-1.5">
              <Users2 className="size-3.5" strokeWidth={1.75} />
              Top staff
            </PanelTitle>
          </PanelHeader>
          {staff.length === 0 ? (
            <PanelBody className="py-8 text-center text-[12.5px] text-ink-500">
              Nothing to report yet.
            </PanelBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-2 py-2.5 text-right font-medium">Leads</th>
                    <th className="px-2 py-2.5 text-right font-medium">Conv %</th>
                    <th className="px-2 py-2.5 text-right font-medium">Books</th>
                    <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.userId} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/70">
                      <td className="px-5 py-2.5">
                        <p className="text-ink-100">{s.name}</p>
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
                          {humanise(s.role)}
                        </p>
                      </td>
                      <td className="tabular px-2 py-2.5 text-right text-ink-300">
                        {s.leadsAssigned}
                      </td>
                      <td className="tabular px-2 py-2.5 text-right text-ink-400">
                        {s.leadsAssigned > 0 ? percent(s.conversionPercent) : '—'}
                      </td>
                      <td className="tabular px-2 py-2.5 text-right text-ink-300">
                        {s.bookings}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-100">
                        {moneyShort(s.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Lead source mix */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-1.5">
              <Radio className="size-3.5" strokeWidth={1.75} />
              Where leads come from
            </PanelTitle>
          </PanelHeader>
          {sources.length === 0 ? (
            <PanelBody className="py-8 text-center text-[12.5px] text-ink-500">
              No leads in this range.
            </PanelBody>
          ) : (
            <ul className="divide-y divide-ink-800/60">
              {sources.map((s) => (
                <li key={s.source} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex-1">
                    <p className="text-[13px] text-ink-100">
                      {humanise(s.source)}
                    </p>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-signal-500 transition-[width] duration-500"
                        style={{ width: `${s.percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="tabular text-[12px] text-ink-300">{s.count}</span>
                  <span className="tabular w-12 text-right text-[11px] text-ink-500">
                    {percent(s.percent, 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Vendor / hotel spend */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-1.5">
              <Building2 className="size-3.5" strokeWidth={1.75} />
              Where the money is going
            </PanelTitle>
          </PanelHeader>
          {vendors.length === 0 ? (
            <PanelBody className="py-8 text-center text-[12.5px] text-ink-500">
              No vendor costs recorded in this range.
            </PanelBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                    <th className="px-5 py-2.5 font-medium">Supplier</th>
                    <th className="px-2 py-2.5 text-right font-medium">Lines</th>
                    <th className="px-2 py-2.5 text-right font-medium">Owed</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.slice(0, 12).map((v) => (
                    <tr key={v.vendorId} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/70">
                      <td className="px-5 py-2.5">
                        <p className="text-ink-100">{v.name}</p>
                        <p className="text-[10.5px] text-ink-500">
                          <Chip>{humanise(v.type)}</Chip>
                          {v.city && <span className="ml-1.5">· {v.city}</span>}
                        </p>
                      </td>
                      <td className="tabular px-2 py-2.5 text-right text-ink-400">
                        {v.lineCount}
                      </td>
                      <td className="tabular px-2 py-2.5 text-right">
                        {v.outstanding > 0 ? (
                          <span className="text-warn-500">{moneyShort(v.outstanding)}</span>
                        ) : (
                          <Chip>Clear</Chip>
                        )}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-100">
                        {moneyShort(v.amountDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Cancellations breakdown */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-1.5">
              <XCircle className="size-3.5" strokeWidth={1.75} />
              Booking status mix
            </PanelTitle>
          </PanelHeader>
          {!cancellations || cancellations.total === 0 ? (
            <PanelBody className="py-8 text-center text-[12.5px] text-ink-500">
              No bookings in this range.
            </PanelBody>
          ) : (
            <ul className="divide-y divide-ink-800/60">
              {cancellations.byStatus.map((b) => (
                <li key={b.status} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-100">{humanise(b.status)}</p>
                    <p className="tabular text-[11px] text-ink-500">
                      {b.count} · {moneyShort(b.revenue)}
                    </p>
                  </div>
                  <div className="w-24 tabular text-right text-[12px] text-ink-400">
                    {percent((b.count / cancellations.total) * 100, 1)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'healthy' | 'warn' | 'loss';
}) {
  const toneCls =
    tone === 'healthy' ? 'text-healthy-500' :
    tone === 'warn'    ? 'text-warn-500'    :
    tone === 'loss'    ? 'text-loss-500'    :
    'text-ink-100';
  return (
    <Panel>
      <PanelBody className="py-3.5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-ink-500">
          {label}
        </p>
        <p className={`tabular mt-1 text-[17px] font-semibold ${toneCls}`}>{value}</p>
        {sub && <p className="tabular mt-0.5 text-[11px] text-ink-500">{sub}</p>}
      </PanelBody>
    </Panel>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[13px] text-ink-300">{title}</p>
      <p className="mt-1 text-[12px] text-ink-500">{hint}</p>
    </div>
  );
}
