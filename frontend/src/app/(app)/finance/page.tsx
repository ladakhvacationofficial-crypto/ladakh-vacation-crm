'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  TriangleAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Building2,
  MessageCircle,
} from 'lucide-react';
import {
  api,
  ApiError,
  type BookingStats,
  type AgingReport,
  type PaymentWorkQueueResponse,
  type UnverifiedPaymentItem,
  type OverdueReceivableItem,
  type PendingReservationItem,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/count-up';
import { money, percent, shortDate } from '@/lib/format';
import { humanise } from '@/lib/constants';

type TabKey = 'ledger' | 'queue';

export default function FinancePage() {
  const [tab, setTab] = useState<TabKey>('ledger');
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [aging, setAging] = useState<AgingReport | null>(null);
  const [queue, setQueue] = useState<PaymentWorkQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api.get<BookingStats>('/bookings/stats'),
        api.get<AgingReport>('/bookings/stats/aging'),
      ]);
      setStats(s);
      setAging(a);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load finance ledger.');
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const q = await api.get<PaymentWorkQueueResponse>('/bookings/payments-queue');
      setQueue(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load payment work queue.');
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadLedger(), loadQueue()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLedger, loadQueue]);

  async function handleVerifyPayment(paymentId: string, status: 'VERIFIED' | 'REJECTED') {
    setBusyActionId(paymentId);
    try {
      await api.patch(`/bookings/payments/${paymentId}/verify`, { status });
      await Promise.all([loadQueue(), loadLedger()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update verification status.');
    } finally {
      setBusyActionId(null);
    }
  }

  function handleCopyReminder(item: OverdueReceivableItem) {
    const text = `Namaste ${item.lead.name}! Greetings from Ladakh Vacation. Regarding your upcoming Ladakh tour (${item.packageName ?? item.bookingNumber}), here is your payment summary:

Total Package: ${money(item.totalSell)}
Amount Received: ${money(item.totalReceived)}
Balance Due: ${money(item.balanceDue)}

Kindly process the balance via Bank Transfer / UPI at your earliest convenience. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const margin = stats?.averageMarginPercent ?? 0;
  const marginHealth = margin >= 15 ? 'healthy' : (stats && stats.bookings > 0 ? 'warn' : 'muted');
  const unverifiedCount = queue?.unverifiedPayments?.length ?? 0;

  if (error && !stats && !queue) {
    return (
      <div role="alert" className="m-6 rounded-lg border border-loss-400 p-6">
        <p>{error}</p>
        <button className="mt-3 underline" onClick={() => window.location.reload()}>
          Retry loading data
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Finance & Accounts
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Booked value, receivables, payables, margin, and payment verification queue.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-lg bg-ink-900 p-1 border border-ink-800">
          <button
            onClick={() => setTab('ledger')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === 'ledger'
                ? 'bg-ink-800 text-ink-100 shadow-sm'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            <Wallet className="size-4" />
            Ledger & Aging
          </button>
          <button
            onClick={() => setTab('queue')}
            className={`relative flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === 'queue'
                ? 'bg-ink-800 text-ink-100 shadow-sm'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            <ShieldCheck className="size-4" />
            Payment Work Queue
            {unverifiedCount > 0 && (
              <span className="ml-1 rounded-full bg-warn-500/20 px-2 py-0.2 text-[10.5px] font-semibold text-warn-400 border border-warn-500/30">
                {unverifiedCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {error && (
        <Panel className="mb-6 border-loss-500/30 bg-loss-500/5">
          <PanelBody className="flex items-start gap-3 py-4">
            <TriangleAlert className="mt-0.5 size-4 text-loss-500" strokeWidth={1.75} />
            <p className="text-[13px] text-ink-100">{error}</p>
          </PanelBody>
        </Panel>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: FINANCIAL LEDGER & AGING
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'ledger' && (
        <div className="space-y-6">
          {/* Row 1 — the four numbers */}
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
          <div className="grid gap-4 lg:grid-cols-2">
            <AgingPanel
              title="Receivables"
              subtitle="What clients owe us"
              buckets={aging?.receivables}
              loading={loading}
              headers={['Booking', 'Client', 'Age', 'Balance']}
              rows={
                aging?.receivables.rows.map((r) => [
                  <Link
                    key="bk"
                    href={`/bookings/${r.id}`}
                    className="font-medium text-ink-100 hover:text-signal-600"
                  >
                    {r.bookingNumber}
                  </Link>,
                  <span key="c" className="text-ink-300">
                    {r.clientName}
                  </span>,
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
                    <span key="v" className="text-ink-300">
                      {r.vendorName}
                    </span>
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
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PAYMENT WORK QUEUE & UPI VERIFICATION BOARD
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="space-y-6">
          {/* Work queue summary banner */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Unverified Payments
                </span>
                <Clock className="size-4 text-warn-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink-100 tabular">
                {queue?.unverifiedPayments?.length ?? 0}
              </p>
              <p className="text-[11.5px] text-ink-400 mt-0.5">
                Total:{' '}
                <span className="text-warn-400 font-medium">
                  {money(
                    queue?.unverifiedPayments?.reduce((s, p) => s + p.amount, 0) ?? 0,
                  )}
                </span>{' '}
                awaiting accountant sign-off
              </p>
            </Panel>

            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Overdue Receivables
                </span>
                <ArrowUpRight className="size-4 text-signal-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink-100 tabular">
                {queue?.overdueReceivables?.length ?? 0}
              </p>
              <p className="text-[11.5px] text-ink-400 mt-0.5">
                Total:{' '}
                <span className="text-signal-400 font-medium">
                  {money(
                    queue?.overdueReceivables?.reduce((s, r) => s + r.balanceDue, 0) ?? 0,
                  )}
                </span>{' '}
                pending collection
              </p>
            </Panel>

            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Pending Reservations
                </span>
                <Building2 className="size-4 text-ink-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink-100 tabular">
                {queue?.pendingReservations?.length ?? 0}
              </p>
              <p className="text-[11.5px] text-ink-400 mt-0.5">
                Total:{' '}
                <span className="text-ink-200 font-medium">
                  {money(
                    queue?.pendingReservations?.reduce((s, r) => s + r.costAmount, 0) ?? 0,
                  )}
                </span>{' '}
                unconfirmed vendor holds
              </p>
            </Panel>
          </div>

          {/* Section 1: Unverified Client Payments (UPI / Bank Wire / Cash) */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-warn-400" />
                  Unverified Client Payments (UPI / Bank Wire / Cash)
                </PanelTitle>
                <p className="text-[11.5px] text-ink-400 mt-0.5">
                  Payments logged by sales or field agents that require accountant verification against bank statements.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={queueLoading}
                onClick={loadQueue}
                title="Refresh list"
              >
                <RefreshCw className={`size-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
              </Button>
            </PanelHeader>

            <PanelBody className="p-0">
              {queue?.unverifiedPayments?.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-healthy-400 mb-2" />
                  <p className="text-[13px] font-medium text-ink-200">
                    All recorded payments are verified!
                  </p>
                  <p className="text-[12px] text-ink-500 mt-0.5">
                    No pending UPI or bank transfers waiting for audit.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-ink-800/80 bg-ink-950/40 text-[10px] uppercase tracking-wider text-ink-500">
                        <th className="px-4 py-2.5 font-medium">Trip & Client</th>
                        <th className="px-4 py-2.5 font-medium">Amount & Mode</th>
                        <th className="px-4 py-2.5 font-medium">Bank Ref / UTR</th>
                        <th className="px-4 py-2.5 font-medium">Date & Logged By</th>
                        <th className="px-4 py-2.5 text-right font-medium">Verification Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800/50">
                      {queue?.unverifiedPayments?.map((p: UnverifiedPaymentItem) => (
                        <tr key={p.id} className="hover:bg-ink-850/40 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              href={`/bookings/${p.booking.id}`}
                              className="font-semibold text-signal-400 hover:text-signal-300 flex items-center gap-1.5"
                            >
                              {p.booking.bookingNumber}
                              <ExternalLink className="size-3 text-ink-500" />
                            </Link>
                            <p className="text-[12px] text-ink-200 mt-0.5">
                              {p.booking.lead.name}
                              {p.booking.lead.phone && (
                                <span className="text-ink-500 tabular"> · {p.booking.lead.phone}</span>
                              )}
                            </p>
                            {p.booking.packageName && (
                              <p className="text-[11px] text-ink-500 truncate max-w-[200px]">
                                {p.booking.packageName}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular font-semibold text-ink-100 text-[13.5px]">
                              {money(p.amount)}
                            </span>
                            <span className="ml-2 inline-flex items-center rounded bg-ink-800 px-2 py-0.5 text-[10.5px] font-semibold text-ink-300 uppercase tracking-wide">
                              {humanise(p.paymentMethod)}
                            </span>
                            {p.notes && (
                              <p className="text-[11px] text-ink-500 mt-1 italic">
                                &quot;{p.notes}&quot;
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {p.reference ? (
                              <span className="tabular font-mono text-[11.5px] rounded bg-ink-950 px-2 py-0.5 text-ink-300 border border-ink-800">
                                {p.reference}
                              </span>
                            ) : (
                              <span className="text-ink-600 italic text-[11px]">No ref given</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="tabular text-ink-300 text-[12px]">{shortDate(p.receivedAt)}</p>
                            <p className="text-[11px] text-ink-500">
                              By: {p.recordedBy?.name ?? 'System'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyActionId === p.id}
                                onClick={() => handleVerifyPayment(p.id, 'VERIFIED')}
                                className="bg-healthy-500/15 text-healthy-400 hover:bg-healthy-500/25 border-healthy-500/30"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyActionId === p.id}
                                onClick={() => handleVerifyPayment(p.id, 'REJECTED')}
                                className="text-loss-400 hover:bg-loss-500/15"
                              >
                                <XCircle className="size-3.5" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Section 2: Overdue Client Receivables with 1-Click WhatsApp Reminder */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-signal-400" />
                  Upcoming Trips with Overdue Balances
                </PanelTitle>
                <p className="text-[11.5px] text-ink-400 mt-0.5">
                  Clients with pending balances. Send 1-click WhatsApp payment reminders with dynamic totals.
                </p>
              </div>
            </PanelHeader>

            <PanelBody className="p-0">
              {queue?.overdueReceivables?.length === 0 ? (
                <div className="py-8 text-center text-ink-400 text-[12.5px]">
                  No upcoming bookings with outstanding balances.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-ink-800/80 bg-ink-950/40 text-[10px] uppercase tracking-wider text-ink-500">
                        <th className="px-4 py-2.5 font-medium">Booking</th>
                        <th className="px-4 py-2.5 font-medium">Guest & Contact</th>
                        <th className="px-4 py-2.5 font-medium">Travel Date</th>
                        <th className="px-4 py-2.5 font-medium">Total Sell</th>
                        <th className="px-4 py-2.5 font-medium">Balance Due</th>
                        <th className="px-4 py-2.5 text-right font-medium">Reminder Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800/50">
                      {queue?.overdueReceivables?.slice(0, 15).map((r: OverdueReceivableItem) => (
                        <tr key={r.id} className="hover:bg-ink-850/40 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              href={`/bookings/${r.id}`}
                              className="font-semibold text-ink-100 hover:text-signal-400"
                            >
                              {r.bookingNumber}
                            </Link>
                            {r.packageName && (
                              <p className="text-[11px] text-ink-500 truncate max-w-[180px]">
                                {r.packageName}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink-200">{r.lead.name}</p>
                            <p className="text-[11.5px] text-ink-500 tabular">{r.lead.phone ?? 'No phone'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular text-ink-300">
                              {r.travelStartDate ? shortDate(r.travelStartDate) : 'Not scheduled'}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular text-ink-300">{money(r.totalSell)}</td>
                          <td className="px-4 py-3 tabular font-semibold text-warn-400">
                            {money(r.balanceDue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCopyReminder(r)}
                              className="text-[11.5px] gap-1.5"
                            >
                              {copiedId === r.id ? (
                                <>
                                  <Check className="size-3.5 text-healthy-400" />
                                  <span className="text-healthy-400">Copied text!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5 text-ink-400" />
                                  Copy WhatsApp
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Section 3: Pending Supplier Reservations */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle className="flex items-center gap-2">
                  <Building2 className="size-4 text-ink-400" />
                  Pending Supplier Confirmations
                </PanelTitle>
                <p className="text-[11.5px] text-ink-400 mt-0.5">
                  Hotel and transport reservations flagged as PENDING across active files.
                </p>
              </div>
            </PanelHeader>

            <PanelBody className="p-0">
              {queue?.pendingReservations?.length === 0 ? (
                <div className="py-8 text-center text-ink-400 text-[12.5px]">
                  All supplier reservations are confirmed!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-ink-800/80 bg-ink-950/40 text-[10px] uppercase tracking-wider text-ink-500">
                        <th className="px-4 py-2.5 font-medium">Booking</th>
                        <th className="px-4 py-2.5 font-medium">Service & Description</th>
                        <th className="px-4 py-2.5 font-medium">Cost Amount</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 text-right font-medium">File Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800/50">
                      {queue?.pendingReservations?.slice(0, 10).map((c: PendingReservationItem) => (
                        <tr key={c.id} className="hover:bg-ink-850/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-ink-200">
                            {c.booking.bookingNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-ink-200 font-medium">{c.description}</p>
                            <span className="text-[10.5px] uppercase font-semibold text-ink-500">
                              {c.serviceType}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular text-ink-200 font-medium">
                            {money(c.costAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-warn-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-warn-400 border border-warn-500/30">
                              PENDING
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/bookings/${c.bookingId}?tab=reservations`}
                              className="text-signal-400 hover:text-signal-300 font-medium text-[12px] inline-flex items-center gap-1"
                            >
                              Manage <ExternalLink className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Tone = 'signal' | 'brand' | 'warn' | 'healthy' | 'muted';

const ACCENT: Record<Tone, { ring: string; icon: string; glow: string }> = {
  signal: { ring: 'ring-signal-200', icon: 'text-signal-600', glow: 'from-signal-200/40' },
  brand: { ring: 'ring-brand-200', icon: 'text-brand-600', glow: 'from-brand-200/50' },
  warn: { ring: 'ring-warn-500/20', icon: 'text-warn-500', glow: 'from-warn-500/15' },
  healthy: { ring: 'ring-healthy-500/20', icon: 'text-healthy-500', glow: 'from-healthy-500/15' },
  muted: { ring: 'ring-ink-800', icon: 'text-ink-500', glow: 'from-ink-800/30' },
};

const HINT_TONE: Record<Tone, string> = {
  signal: 'text-signal-500',
  brand: 'text-brand-600',
  warn: 'text-warn-500',
  healthy: 'text-healthy-500',
  muted: 'text-ink-500',
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
  title,
  subtitle,
  buckets,
  loading,
  headers,
  rows,
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
            <div
              className="h-full bg-signal-400"
              style={{ width: `${share(b.d0_30)}%` }}
              title={`0-30d · ${money(b.d0_30)}`}
            />
            <div
              className="h-full bg-warn-500"
              style={{ width: `${share(b.d30_60)}%` }}
              title={`30-60d · ${money(b.d30_60)}`}
            />
            <div
              className="h-full bg-loss-500"
              style={{ width: `${share(b.d60_plus)}%` }}
              title={`60+d · ${money(b.d60_plus)}`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-signal-600">
              <span className="tabular">{money(b.d0_30)}</span> · 0-30d
            </span>
            <span className="text-warn-500">
              <span className="tabular">{money(b.d30_60)}</span> · 30-60d
            </span>
            <span className="text-loss-500">
              <span className="tabular">{money(b.d60_plus)}</span> · 60+d
            </span>
          </div>
          <p className="tabular mt-2 text-[13px] font-medium text-ink-100">
            {money(b.total)} <span className="text-[11px] text-ink-500">outstanding</span>
          </p>
        </div>

        {/* Rows */}
        {empty ? (
          <p className="pt-4 text-center text-[12px] text-ink-500">
            Nothing outstanding — clean books.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-800/60 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                  {headers.map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 font-medium ${
                        i === headers.length - 1 ? 'text-right' : ''
                      }`}
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
                            className={`px-3 py-2 ${
                              ci === cells.length - 1 ? 'text-right' : ''
                            }`}
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
