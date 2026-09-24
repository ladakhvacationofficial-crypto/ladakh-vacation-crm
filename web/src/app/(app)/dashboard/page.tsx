'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  TriangleAlert,
  Inbox,
  Users,
  AlarmClock,
  Sparkles,
  ClipboardList,
  Coins,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import {
  api,
  ApiError,
  type LeadStats,
  type OpsStats,
  type LeadRow,
  type Paged,
  type TeamScorecardRow,
  type WeeklyPulse,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { EChart, chartBase, axisStyle } from '@/components/echart';
import { Stage } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WeatherStrip } from '@/components/weather-widget';
import { CountUp } from '@/components/count-up';
import { money, relativeDate } from '@/lib/format';
import { tokenStore } from '@/lib/api';

/**
 * The desk — the first screen the owner sees when they log in.
 *
 * The hierarchy is deliberate:
 *   1. Greeting + weather   — humane orientation, "which of my destinations
 *                             am I sending people to today"
 *   2. Four KPI tiles       — booked, owed to us, owed to vendors, margin
 *   3. Pipeline + sources   — where work is stuck / where it comes from
 *   4. Latest enquiries     — the actual queue to act on
 *
 * Colour is spent only on money-verdict signals (healthy/warn/loss) and the
 * teal accent tied to the brand. Everything else stays warm neutral so
 * numbers stay the loudest thing on the screen.
 */
const OWNER_ROLES = new Set(['OWNER', 'SUPER_ADMIN']);

export default function DashboardPage() {
  const [ops, setOps] = useState<OpsStats | null>(null);
  const [leads, setLeads] = useState<LeadStats | null>(null);
  const [recent, setRecent] = useState<LeadRow[]>([]);
  const [team, setTeam] = useState<TeamScorecardRow[] | null>(null);
  const [pulse, setPulse] = useState<WeeklyPulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>('there');
  const isOwner = useMemo(() => OWNER_ROLES.has(tokenStore.user()?.role ?? ''), []);

  useEffect(() => {
    setName(tokenStore.user()?.name.split(' ')[0] ?? 'there');
    let cancelled = false;
    (async () => {
      try {
        const [o, l, r, tm, wp] = await Promise.all([
          api.get<OpsStats>('/leads/stats/ops'),
          api.get<LeadStats>('/leads/stats'),
          api
            .get<Paged<LeadRow>>('/leads?limit=6'),
          isOwner ? api.get<TeamScorecardRow[]>('/leads/stats/team-scorecard') : Promise.resolve(null),
          isOwner ? api.get<WeeklyPulse>('/bookings/stats/weekly-pulse') : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setOps(o);
        setLeads(l);
        setRecent(r.data ?? []);
        setTeam(tm);
        setPulse(wp);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load the desk.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  // Where leads are stuck — laid out as a segmented bar rather than a chart,
  // because the shape of the bar IS the pipeline diagnosis.
  const pipeline = useMemo(() => {
    const order = [
      'NEW',
      'CONTACTED',
      'INTERESTED',
      'QUOTATION_SENT',
      'NEGOTIATION',
      'CONFIRMED',
    ] as const;
    const map = new Map((leads?.byStatus ?? []).map((r) => [r.status, r.count]));
    const rows = order.map((s) => ({ stage: s, count: map.get(s) ?? 0 }));
    const total = rows.reduce((a, r) => a + r.count, 0) || 1;
    return { rows, total };
  }, [leads]);

  const sourceOption = useMemo<EChartsOption>(() => {
    const rows = (leads?.bySource ?? [])
      .slice()
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    return {
      ...chartBase,
      grid: { ...chartBase.grid, left: 4 },
      xAxis: { type: 'value' as const, ...axisStyle, splitLine: { show: false } },
      yAxis: {
        type: 'category' as const,
        ...axisStyle,
        data: rows.map((r) => r.source.replace(/_/g, ' ').toLowerCase()),
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar' as const,
          data: rows.map((r) => r.count),
          barMaxWidth: 14,
          itemStyle: {
            // Warm brand-to-teal gradient — matches the logo.
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#d8bf80' },
                { offset: 1, color: '#3670d8' },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
          emphasis: { itemStyle: { color: '#1e4fa8' } },
        },
      ],
    };
  }, [leads]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  if (error) return <div role="alert" className="m-6 rounded-lg border border-loss-400 p-6">
    <p>{error}</p><button className="mt-3 underline" onClick={() => window.location.reload()}>Retry loading data</button>
  </div>;

  return (
    <div className="relative min-h-screen">
      {/* Aurora — a soft warm haze behind the hero. Text-safe because it
          sits below the content and only paints the top 400px. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden opacity-40"
      >
        <div
          className="absolute -top-32 -left-24 h-[420px] w-[520px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(217,119,6,0.10), transparent 70%)',
          }}
        />
        <div
          className="absolute -top-24 right-0 h-[360px] w-[460px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle at 60% 50%, rgba(37,99,235,0.08), transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-signal-600">
              {today}
            </p>
            <h1 className="display mt-2 text-[26px] font-semibold leading-tight text-ink-100 sm:text-[30px] md:text-[34px]">
              {greeting},{' '}
              <span className="text-brand-600">{name}</span>.
            </h1>
            <p className="mt-1 text-[13.5px] text-ink-400">
              Here&rsquo;s where the work is right now. Money lives on{' '}
              <Link href="/finance" className="text-signal-600 hover:text-signal-500">
                Finance
              </Link>
              .
            </p>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <WeatherStrip />
          </div>
        </header>

        {error && (
          <Panel className="mb-6 border-loss-500/30 bg-loss-500/5">
            <PanelBody className="flex items-start gap-3 py-4">
              <TriangleAlert
                className="mt-0.5 size-4 text-loss-500"
                strokeWidth={1.75}
              />
              <div>
                <p className="text-[13px] text-ink-100">{error}</p>
                <p className="mt-1 text-[12px] text-ink-500">
                  Start the backend with{' '}
                  <code className="tabular">npm run start:dev</code>, then reload.
                </p>
              </div>
            </PanelBody>
          </Panel>
        )}

        {/* Row 1 — operational tiles. What arrived, what's stuck, what to do next. */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiTile
            label="Leads today"
            value={ops?.leadsToday ?? 0}
            loading={loading}
            hint={`${ops?.leadsThisWeek ?? 0} this week`}
            icon={Inbox}
            accent="signal"
            format={(n) => String(n)}
          />
          <KpiTile
            label="Cost per lead"
            value={ops?.costPerLeadYesterday ?? 0}
            loading={loading}
            hint={
              ops?.costPerLeadYesterday == null
                ? ops && ops.spendYesterday > 0
                  ? `${money(ops.spendYesterday)} spent, no leads yesterday`
                  : 'no spend yesterday'
                : `${money(ops.spendYesterday)} spent yesterday`
            }
            hintTone="muted"
            icon={Coins}
            accent="brand"
            format={(n) => (ops?.costPerLeadYesterday == null ? '—' : money(n))}
            delay={70}
          />
          <KpiTile
            label="Unassigned"
            value={ops?.unassigned ?? 0}
            loading={loading}
            hint={
              (ops?.unassigned ?? 0) > 0
                ? 'assign to a sales exec'
                : 'all leads owned'
            }
            hintTone={(ops?.unassigned ?? 0) > 0 ? 'warn' : 'muted'}
            icon={Users}
            accent={(ops?.unassigned ?? 0) > 0 ? 'warn' : 'muted'}
            format={(n) => String(n)}
            delay={140}
          />
          <KpiTile
            label="Follow-ups due"
            value={ops?.dueTodayFollowUps ?? 0}
            loading={loading}
            hint={
              (ops?.overdueFollowUps ?? 0) > 0
                ? `${ops!.overdueFollowUps} overdue`
                : 'nothing overdue'
            }
            hintTone={(ops?.overdueFollowUps ?? 0) > 0 ? 'warn' : 'muted'}
            icon={AlarmClock}
            accent="healthy"
            format={(n) => String(n)}
            delay={210}
          />
          <KpiTile
            label="Overdue follow-ups"
            value={ops?.overdueFollowUps ?? 0}
            loading={loading}
            hint={
              (ops?.overdueFollowUps ?? 0) > 0
                ? 'call them today'
                : 'clean queue'
            }
            hintTone={(ops?.overdueFollowUps ?? 0) > 0 ? 'warn' : 'healthy'}
            icon={ClipboardList}
            accent={(ops?.overdueFollowUps ?? 0) > 0 ? 'warn' : 'healthy'}
            format={(n) => String(n)}
            delay={280}
          />
          <KpiTile
            label="Itineraries to price"
            value={ops?.itinerariesAwaitingPricing ?? 0}
            loading={loading}
            hint={
              (ops?.itinerariesAwaitingPricing ?? 0) > 0
                ? 'items missing a rate'
                : 'all itineraries priced'
            }
            hintTone={(ops?.itinerariesAwaitingPricing ?? 0) > 0 ? 'warn' : 'muted'}
            icon={Sparkles}
            accent="brand"
            format={(n) => String(n)}
            delay={350}
          />
        </div>

        {/* Row 2 — pipeline shape + source mix */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Panel className="rise" style={{ animationDelay: '260ms' }}>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-1.5">
                <Users className="size-3.5" strokeWidth={1.75} />
                Pipeline shape
              </PanelTitle>
              <span className="tabular text-[11px] text-ink-500">
                {leads?.total ?? 0} leads
                {leads && leads.unassigned > 0 && (
                  <span className="ml-2 text-warn-500">
                    · {leads.unassigned} unassigned
                  </span>
                )}
              </span>
            </PanelHeader>
            <PanelBody>
              <PipelineBar rows={pipeline.rows} total={pipeline.total} />
            </PanelBody>
          </Panel>

          <Panel className="rise" style={{ animationDelay: '320ms' }}>
            <PanelHeader>
              <PanelTitle>Where they came from</PanelTitle>
            </PanelHeader>
            <PanelBody className="pt-2">
              {leads && leads.bySource.some((r) => r.count > 0) ? (
                <EChart option={sourceOption} height={220} />
              ) : (
                <Empty
                  title="Nothing to chart yet"
                  hint="Sources appear as leads arrive."
                />
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Row 3 — team scorecard (owner-only) */}
        {isOwner && team && team.length > 0 && (
          <Panel className="rise mt-5" style={{ animationDelay: '360ms' }}>
            <PanelHeader>
              <PanelTitle>Team scorecard</PanelTitle>
              <span className="text-[11px] text-ink-500">this week</span>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                    <th className="px-5 py-2.5 font-medium">Person</th>
                    <th className="px-5 py-2.5 text-right font-medium">Assigned</th>
                    <th className="px-5 py-2.5 text-right font-medium">Contacted today</th>
                    <th className="px-5 py-2.5 text-right font-medium">Quotes this week</th>
                    <th className="px-5 py-2.5 text-right font-medium">Confirmed this month</th>
                    <th className="px-5 py-2.5 text-right font-medium">SLA breaches</th>
                    <th className="px-5 py-2.5 text-right font-medium">First-response avg</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((row) => (
                    <tr key={row.userId} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink-100">{row.name}</div>
                        <div className="text-[11px] text-ink-500">{row.role.replace('_', ' ').toLowerCase()}</div>
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-200">{row.assigned}</td>
                      <td className="tabular px-5 py-3 text-right text-ink-200">{row.contactedToday}</td>
                      <td className="tabular px-5 py-3 text-right text-ink-200">{row.quotesThisWeek}</td>
                      <td className="tabular px-5 py-3 text-right text-healthy-500">{row.bookingsThisMonth}</td>
                      <td className={`tabular px-5 py-3 text-right ${row.slaBreaches > 0 ? 'text-loss-500' : 'text-ink-500'}`}>
                        {row.slaBreaches || '—'}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-300">
                        {row.avgFirstResponseMinutes == null
                          ? '—'
                          : row.avgFirstResponseMinutes < 60
                            ? `${row.avgFirstResponseMinutes} min`
                            : `${(row.avgFirstResponseMinutes / 60).toFixed(1)} h`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Row 4 — this week's cash (owner-only) */}
        {isOwner && pulse && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyTile
              label="Booked this week"
              value={pulse.bookedThisWeek}
              deltaValue={pulse.bookedThisWeek - pulse.bookedLastWeek}
              hint={`${pulse.bookingsThisWeek} file${pulse.bookingsThisWeek === 1 ? '' : 's'} · vs last week`}
            />
            <MoneyTile
              label="Travelling this week"
              value={pulse.travellingThisWeek}
              hint="bookings whose trip starts in 7 days"
              plain
            />
            <MoneyTile
              label="Payments due next 7d"
              value={pulse.paymentsDueNext7Days}
              hint="balance on trips starting soon"
              tone={pulse.paymentsDueNext7Days > 0 ? 'warn' : 'muted'}
            />
            <MoneyTile
              label="Suppliers overdue >30d"
              value={pulse.suppliersOverdue30d}
              hint="unpaid cost rows past 30d"
              plain
              tone={pulse.suppliersOverdue30d > 0 ? 'warn' : 'muted'}
            />
          </div>
        )}

        {/* Row 5 — the actual work queue */}
        <Panel className="rise mt-5" style={{ animationDelay: '380ms' }}>
          <PanelHeader>
            <PanelTitle>Latest enquiries</PanelTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/leads">
                View all
                <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
              </Link>
            </Button>
          </PanelHeader>
          {loading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <PanelBody>
              <Empty
                title="No enquiries yet"
                hint="Leads captured from your landing pages land here first."
              />
            </PanelBody>
          ) : (
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Destination</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Stage</th>
                  <th className="px-5 py-2.5 text-right font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((lead) => (
                  <tr
                    key={lead.id}
                    className="group border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850/70"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-ink-100 transition-colors group-hover:text-signal-600"
                      >
                        {lead.name}
                      </Link>
                      <span className="tabular ml-2 text-[11px] text-ink-500">
                        {lead.phone}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-300">
                      {lead.destination ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-ink-800 bg-ink-850 px-2 py-0.5 text-[10.5px] uppercase tracking-[0.06em] text-ink-500">
                        {lead.source.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Stage value={lead.status} />
                    </td>
                    <td className="tabular px-5 py-3 text-right text-[12px] text-ink-500">
                      {relativeDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
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
  label,
  value,
  loading,
  hint,
  hintTone = 'muted',
  icon: Icon,
  accent,
  format,
  delay = 0,
}: {
  label: string;
  value: number;
  loading: boolean;
  hint: string;
  hintTone?: Tone;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: Tone;
  format: (n: number) => string;
  delay?: number;
}) {
  const a = ACCENT[accent];
  return (
    <Panel
      interactive
      className="rise relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Soft radial wash in the accent colour, top-right corner. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${a.glow} to-transparent blur-2xl`}
      />
      <PanelBody className="relative py-5">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-ink-500">
            {label}
          </p>
          <div
            className={`grid size-8 place-items-center rounded-lg bg-ink-950 ring-1 ${a.ring}`}
          >
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

/**
 * Pipeline shown as a single segmented bar. Each stage's width is its share
 * of the funnel — the shape tells you where deals are stuck at a glance.
 * A stage stuck at 40% "quotation sent" is visible even before you read the
 * label.
 */
function PipelineBar({
  rows,
  total,
}: {
  rows: { stage: string; count: number }[];
  total: number;
}) {
  const colors: Record<string, string> = {
    NEW:            'bg-signal-200',
    CONTACTED:      'bg-signal-300',
    INTERESTED:     'bg-signal-400',
    QUOTATION_SENT: 'bg-brand-400',
    NEGOTIATION:    'bg-brand-500',
    CONFIRMED:      'bg-healthy-500',
  };
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-850">
        {rows.map((r, i) => {
          const pct = (r.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={r.stage}
              className={`sweep h-full ${colors[r.stage]}`}
              style={{
                width: `${pct}%`,
                animationDelay: `${i * 90}ms`,
              }}
              title={`${r.stage.replace(/_/g, ' ').toLowerCase()} · ${r.count}`}
            />
          );
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.stage} className="flex items-center gap-2 text-[12px]">
            <span
              aria-hidden
              className={`inline-block size-2 rounded-sm ${colors[r.stage]}`}
            />
            <span className="capitalize text-ink-400">
              {r.stage.replace(/_/g, ' ').toLowerCase()}
            </span>
            <span className="tabular ml-auto font-medium text-ink-200">
              {r.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-ink-800/60">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-3 w-40 rounded shimmer" />
          <div className="h-3 w-24 rounded shimmer" />
          <div className="ml-auto h-3 w-16 rounded shimmer" />
        </div>
      ))}
    </div>
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


function MoneyTile({
  label, value, hint, deltaValue, plain, tone = 'muted',
}: {
  label: string; value: number; hint?: string; deltaValue?: number;
  plain?: boolean; tone?: Tone;
}) {
  const hintClass = HINT_TONE[tone];
  const delta = deltaValue == null ? null : deltaValue;
  return (
    <Panel interactive className="rise">
      <PanelBody className="py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-ink-500">
          {label}
        </p>
        <p className="display tabular mt-3 text-[24px] leading-none font-semibold text-ink-100">
          <CountUp value={value} format={plain ? (n) => String(n) : money} />
        </p>
        {delta !== null && (
          <p className={`mt-1 text-[11.5px] ${delta >= 0 ? 'text-healthy-500' : 'text-loss-500'}`}>
            {delta >= 0 ? '▲' : '▼'} {money(Math.abs(delta))}
          </p>
        )}
        {hint && <p className={`mt-1 text-[11.5px] ${hintClass}`}>{hint}</p>}
      </PanelBody>
    </Panel>
  );
}
