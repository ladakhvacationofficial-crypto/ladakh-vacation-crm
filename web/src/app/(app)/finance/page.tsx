'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import {
  api,
  ApiError,
  type BookingStats,
  type AgingReport,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { CountUp } from '@/components/count-up';
import { money, percent } from '@/lib/format';

/**
 * Finance — the counterpart to the operational dashboard. Owner + accounts
 * see the money: booked value, receivables aged, payables aged, margin.
 *
 * Kept deliberately calm — this page is read while making decisions, so
 * shouty color is reserved for aged >60 buckets and thin margins.
 */
export default function FinancePage() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [aging, setAging] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, a] = await Promise.all([
          api.get<BookingStats>('/bookings/stats').catch(() => null),
          api.get<AgingReport>('/bookings/stats/aging').catch(() => null),
        ]);
        if (cancelled) return;
        setStats(s);
        setAging(a);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load finance data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const margin = stats?.averageMarginPercent ?? 0;
  const marginHealth = margin >= 15 ? 'healthy' : (stats && stats.bookings > 0 ? 'warn' : 'muted');

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
          Finance
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-400">
          Booked value, receivables, payables, margin. Live from the ledger.
        </p>
      </header>

      {error && (
        <Panel className="mb-6 border-loss-500/30 bg-loss-500/5">
          <PanelBody className="flex items-start gap-3 py-4">
            <TriangleAlert className="mt-0.5 size-4 text-loss-500" strokeWidth={1.75} />
            <p className="text-[13px] text-ink-100">{error}</p>
          </PanelBody>
        </Panel>
      )}

      {/* Row 1 — the four numbers the dashboard used to shout. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Booked value"
          value={stats?.totalSell ?? 0}
          loading={loading}
          hint={
            stats && stats.bookings > 0
              ? `${stats.bookings} file${stats.bookings === 1 ? '' : 's'}`
              : 'no files yet'
          }
          icon={Wallet}
          accent="signal"
          format={money}
        />
        <KpiTile
          label="Owed to you"
          value={stats?.totalOutstanding ?? 0}
          loading={loading}
          hint={`${money(stats?.totalReceived ?? 0)} received`}
          icon={ArrowUpRight}
          accent="brand"
          format={money}
          delay={80}
        />
        <KpiTile
          label="You owe suppliers"
          value={stats?.vendorOutstanding ?? 0}
          loading={loading}
          hint={
            stats && stats.profitVariance < 0
              ? `${money(stats.profitVariance)} margin variance`
              : 'balances current'
          }
          hintTone={(stats?.profitVariance ?? 0) < 0 ? 'warn' : 'muted'}
          icon={Receipt}
          accent="warn"
          format={money}
          delay={160}
        />
        <KpiTile
          label="Average margin"
          value={Math.round(margin)}
          loading={loading}
          hint={
            margin >= 15
              ? 'healthy'
              : stats && stats.bookings > 0
                ? 'thin — review pricing'
                : 'no data yet'
          }
          hintTone={marginHealth as Tone}
          icon={TrendingUp}
          accent="healthy"
          format={(n) => `${n}%`}
          delay={240}
        />
      </div>

      {/* Row 2 — receivables aging */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AgingPanel
          title="Receivables"
          subtitle="What clients owe us"
          buckets={aging?.receivables}
          loading={loading}
          headers={['Booking', 'Client', 'Age', 'Balance']}
          rows={
            aging?.receivables.rows.map((r) => [
              (
                <Link
                  key="bk"
                  href={`/bookings/${r.id}`}
                  className="font-medium text-ink-100 hover:text-signal-600"
                >
                  {r.bookingNumber}
                </Link>
              ),
              <span key="c" className="text-ink-300">{r.clientName}</span>,
              <AgeChip key="a" days={r.ageDays} />,
              <span key="b" className="tabular text-right text-ink-100">
                {money(r.balance)}
              </span>,
            ]) ?? []
          }
        />
        <AgingPanel
          title="Payables"
          subtitle="What we owe suppliers"
          buckets={aging?.payables}
          loading={loading}
          headers={['Supplier', 'Booking', 'Age', 'Balance']}
          rows={
            aging?.payables.rows.map((r) => [
              r.vendorId ? (
                <Link
                  key="v"
                  href={`/vendors/${r.vendorId}`}
                  className="font-medium text-ink-100 hover:text-signal-600"
                >
                  {r.vendorName}
                </Link>
              ) : (
                <span key="v" className="text-ink-300">{r.vendorName}</span>
              ),
              <span key="bk" className="tabular text-[12px] text-ink-400">
                {r.bookingNumber}
              </span>,
              <AgeChip key="a" days={r.ageDays} />,
              <span key="b" className="tabular text-right text-ink-100">
                {money(r.balance)}
              </span>,
            ]) ?? []
          }
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Tone = 'signal' | 'brand' | 'warn' | 'healthy' | 'muted';

const ACCENT: Record<Tone, { ring: string; icon: string; glow: string }> = {
  signal:  { ring: 'ring-signal-200',  icon: 'text-signal-600',  glow: 'from-signal-200/40' },
  brand:   { ring: 'ring-brand-200',   icon: 'text-brand-600',   glow: 'from-brand-200/50' },
  warn:    { ring: 'ring-warn-500/20', icon: 'text-warn-500',    glow: 'from-warn-500/15' },
  healthy: { ring: 'ring-healthy-500/20', icon: 'text-healthy-500', glow: 'from-healthy-500/15' },
  muted:   { ring: 'ring-ink-800',     icon: 'text-ink-500',     glow: 'from-ink-800/30' },
};

const HINT_TONE: Record<Tone, string> = {
  signal:  'text-signal-500',
  brand:   'text-brand-600',
  warn:    'text-warn-500',
  healthy: 'text-healthy-500',
  muted:   'text-ink-500',
};

function KpiTile({
  label, value, loading, hint, hintTone = 'muted',
  icon: Icon, accent, format, delay = 0,
}: {
  label: string; value: number; loading: boolean; hint: string; hintTone?: Tone;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: Tone; format: (n: number) => string; delay?: number;
}) {
  const a = ACCENT[accent];
  return (
    <Panel interactive className="rise relative overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} to-transparent blur-2xl`}
      />
      <PanelBody className="relative py-5">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-ink-500">
            {label}
          </p>
          <div className={`grid size-8 place-items-center rounded-lg bg-ink-950 ring-1 ${a.ring}`}>
            <Icon className={`size-4 ${a.icon}`} strokeWidth={1.75} />
          </div>
        </div>
        {loading ? (
          <div className="mt-4 h-8 w-32 rounded shimmer" />
        ) : (
          <p className="display tabular mt-4 text-[28px] leading-none font-semibold text-ink-100">
            <CountUp value={value} format={format} />
          </p>
        )}
        <p className={`mt-2 text-[11.5px] ${HINT_TONE[hintTone]}`}>{hint}</p>
      </PanelBody>
    </Panel>
  );
}

function AgeChip({ days }: { days: number }) {
  const tone =
    days < 30
      ? 'border-ink-700 text-ink-400'
      : days < 60
        ? 'border-warn-500/40 text-warn-500'
        : 'border-loss-500/40 text-loss-500';
  return (
    <span className={`tabular inline-flex items-center rounded-full border ${tone} px-2 py-0.5 text-[10.5px]`}>
      {days}d
    </span>
  );
}

function AgingPanel({
  title, subtitle, buckets, loading, headers, rows,
}: {
  title: string;
  subtitle: string;
  buckets: { d0_30: number; d30_60: number; d60_plus: number; total: number } | undefined;
  loading: boolean;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  const empty = !loading && (!buckets || buckets.total === 0);
  const b = buckets ?? { d0_30: 0, d30_60: 0, d60_plus: 0, total: 0 };
  const share = (n: number) => (b.total > 0 ? (n / b.total) * 100 : 0);
  return (
    <Panel className="rise">
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        <span className="text-[11px] text-ink-500">{subtitle}</span>
      </PanelHeader>
      <PanelBody className="space-y-4">
        {/* Bucket strip */}
        <div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-850">
            <div className="h-full bg-signal-400" style={{ width: `${share(b.d0_30)}%` }} title={`0-30d · ${money(b.d0_30)}`} />
            <div className="h-full bg-warn-500" style={{ width: `${share(b.d30_60)}%` }} title={`30-60d · ${money(b.d30_60)}`} />
            <div className="h-full bg-loss-500" style={{ width: `${share(b.d60_plus)}%` }} title={`60+d · ${money(b.d60_plus)}`} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-signal-600"><span className="tabular">{money(b.d0_30)}</span> · 0-30d</span>
            <span className="text-warn-500"><span className="tabular">{money(b.d30_60)}</span> · 30-60d</span>
            <span className="text-loss-500"><span className="tabular">{money(b.d60_plus)}</span> · 60+d</span>
          </div>
          <p className="tabular mt-2 text-[13px] font-medium text-ink-100">
            {money(b.total)} <span className="text-[11px] text-ink-500">outstanding</span>
          </p>
        </div>

        {/* Rows */}
        {empty ? (
          <p className="pt-4 text-center text-[12px] text-ink-500">Nothing outstanding — clean books.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-800/60 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-medium ${i === headers.length - 1 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2">
                            <span className="inline-block h-3 w-16 rounded shimmer" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((cells, i) => (
                      <tr key={i} className="border-b border-ink-800/40 last:border-0">
                        {cells.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-2 ${ci === cells.length - 1 ? 'text-right' : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

// keep percent import warm for later trend lines
void percent;
