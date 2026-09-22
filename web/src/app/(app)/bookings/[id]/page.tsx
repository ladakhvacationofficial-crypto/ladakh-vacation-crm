'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Wallet,
  Receipt,
  Sparkles,
  FileDown,
} from 'lucide-react';
import {
  api,
  ApiError,
  openBinary,
  type BookingDetail,
  type PricingSettings,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { MarginRibbon } from '@/components/margin-ribbon';
import { money, percent, shortDate, healthText, marginHealth } from '@/lib/format';
import { BOOKING_STATUSES, PAYMENT_MODES, humanise } from '@/lib/constants';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<BookingDetail>(`/bookings/${id}`);
      setBooking(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.get<PricingSettings>('/settings/pricing').then(setSettings).catch(() => {});
  }, [load]);

  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That change did not save.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="h-4 w-48 animate-pulse rounded bg-ink-800" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/bookings')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Bookings
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px] text-ink-100">{error ?? 'Not found.'}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const f = booking.financials;
  const minMargin = settings?.minMarginPercent ?? 15;
  // Once real vendor costs exist, trust them — that is the whole point of the
  // quoted-vs-actual distinction.
  const shownMargin =
    f.totalCostDue > 0 ? f.actualMarginPercent : f.quotedMarginPercent;

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-3"
        onClick={() => router.push('/bookings')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Bookings
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              {booking.packageName ?? 'Untitled package'}
            </h1>
            <Chip className="tabular">{booking.bookingNumber}</Chip>
          </div>
          <p className="mt-1 text-[13px] text-ink-400">
            for{' '}
            <Link
              href={`/leads/${booking.lead.id}`}
              className="text-signal-400 transition-colors hover:text-signal-300"
            >
              {booking.lead.name}
            </Link>
            <span className="tabular"> · {booking.lead.phone}</span>
            {booking.travelStartDate && (
              <>
                {' · '}
                {shortDate(booking.travelStartDate)}
                {booking.travelEndDate && ` – ${shortDate(booking.travelEndDate)}`}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() =>
              openBinary(
                `/bookings/${id}/invoice.pdf`,
                `Invoice-${booking.bookingNumber}.pdf`,
              ).catch((e) =>
                setError(
                  e instanceof ApiError ? e.message : 'Download failed.',
                ),
              )
            }
          >
            <FileDown className="size-4" strokeWidth={1.75} />
            Invoice PDF
          </Button>
          <div className="w-[170px]">
            <Select
              value={booking.status}
              disabled={busy}
              aria-label="Booking status"
              onChange={(e) =>
                mutate(() =>
                  api.patch(`/bookings/${id}`, { status: e.target.value }),
                )
              }
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanise(s)}
                </option>
              ))}
            </Select>
          </div>
          <DeactivateButton
            disabled={busy || booking.status === 'CANCELLED'}
            label="Cancel booking"
            confirmMessage={`Cancel ${booking.bookingNumber}? The record stays for accounting; the lead status flips to CANCELLED.`}
            onConfirm={async () => {
              try {
                await api.del(`/bookings/${id}`);
                router.push('/bookings');
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Could not cancel this booking.');
              }
            }}
          />
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
        >
          {error}
        </p>
      )}

      {/* Money strip — the whole file in one glance */}
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <MoneyCard
          label="Sell"
          value={money(booking.totalSell)}
          sub={`${booking.adults + booking.children} pax · ${booking.nights}N`}
        />
        <MoneyCard
          label="Received"
          value={money(f.totalReceived)}
          sub={
            f.balanceDue === 0
              ? 'Fully paid'
              : `${money(f.balanceDue)} outstanding`
          }
          tone={f.balanceDue === 0 ? 'healthy' : 'ink'}
        />
        <MoneyCard
          label="Vendor costs"
          value={money(f.totalCostDue)}
          sub={
            f.vendorOutstanding === 0
              ? 'All paid'
              : `${money(f.vendorOutstanding)} owed`
          }
          tone={f.vendorOutstanding === 0 ? 'healthy' : 'ink'}
        />
        <MoneyCard
          label={f.totalCostDue > 0 ? 'Actual margin' : 'Quoted margin'}
          value={percent(shownMargin)}
          sub={
            f.totalCostDue > 0 && Math.abs(f.marginVariance) > 0
              ? `${f.marginVariance > 0 ? '+' : ''}${money(f.marginVariance)} vs quote`
              : money(f.totalCostDue > 0 ? f.actualProfit : f.quotedProfit)
          }
          tone={marginHealth(shownMargin, minMargin)}
        />
      </div>

      <Panel className="mb-4">
        <PanelBody>
          <MarginRibbon
            sell={booking.totalSell}
            cost={f.totalCostDue > 0 ? f.totalCostDue : booking.totalNet}
            minMargin={minMargin}
          />
          {f.totalCostDue === 0 && booking.totalNet > 0 && (
            <p className="mt-2 text-[11px] text-ink-500">
              Estimated from the quotation. Record vendor costs to see the real
              margin.
            </p>
          )}
        </PanelBody>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentsPanel
          booking={booking}
          busy={busy}
          onAdd={(body) =>
            mutate(() => api.post(`/bookings/${id}/payments`, body))
          }
          onDelete={(paymentId) =>
            mutate(() => api.del(`/bookings/payments/${paymentId}`))
          }
        />
        <CostsPanel
          booking={booking}
          busy={busy}
          onAdd={(body) => mutate(() => api.post(`/bookings/${id}/costs`, body))}
          onDelete={(costId) =>
            mutate(() => api.del(`/bookings/costs/${costId}`))
          }
          onSeed={() =>
            mutate(() => api.post(`/bookings/${id}/costs/from-itinerary`))
          }
        />
      </div>

      {booking.notes && (
        <Panel className="mt-4">
          <PanelHeader>
            <PanelTitle>Notes</PanelTitle>
          </PanelHeader>
          <PanelBody className="whitespace-pre-wrap text-[13px] text-ink-300">
            {booking.notes}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MoneyCard({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'ink' | 'healthy' | 'warn' | 'loss';
}) {
  const toneCls =
    tone === 'ink' ? 'text-ink-50' : healthText[tone as 'healthy' | 'warn' | 'loss'];
  return (
    <Panel>
      <PanelBody className="py-3.5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-ink-500">
          {label}
        </p>
        <p className={`tabular mt-1 text-[17px] font-semibold ${toneCls}`}>
          {value}
        </p>
        {sub && <p className="tabular mt-0.5 text-[11px] text-ink-500">{sub}</p>}
      </PanelBody>
    </Panel>
  );
}

function PaymentsPanel({
  booking,
  busy,
  onAdd,
  onDelete,
}: {
  booking: BookingDetail;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (paymentId: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Wallet className="size-3.5" strokeWidth={1.75} />
          Payments in
        </PanelTitle>
        <span className="tabular text-[13px] text-ink-100">
          {money(booking.financials.totalReceived)}
        </span>
      </PanelHeader>

      {booking.payments.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No payments recorded</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Log the first one below — cash, UPI, bank, however it came in.
          </p>
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60">
          {booking.payments.map((p) => (
            <li
              key={p.id}
              className="group flex items-start gap-3 px-5 py-2.5 hover:bg-ink-850/60"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span
                    className={`tabular font-medium ${
                      p.isRefund ? 'text-loss-400' : 'text-ink-100'
                    }`}
                  >
                    {money(p.amount)}
                  </span>
                  <span className="ml-2 text-[11px] uppercase tracking-[0.08em] text-ink-500">
                    {humanise(p.mode)}
                  </span>
                  {p.isRefund && (
                    <Chip className="ml-2 border-loss-500/40 text-loss-400">
                      Refund
                    </Chip>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {shortDate(p.receivedAt)}
                  {p.reference && (
                    <span className="tabular ml-2">ref {p.reference}</span>
                  )}
                  {p.notes && <span className="ml-2 text-ink-600">· {p.notes}</span>}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Remove this payment?')) onDelete(p.id);
                }}
                disabled={busy}
                aria-label="Remove payment"
                className="rounded p-1 text-ink-600 opacity-0 transition-[opacity,color,background-color] duration-150 group-hover:opacity-100 hover:bg-ink-800 hover:text-loss-400"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-ink-800 p-4">
        <AddPayment disabled={busy} onAdd={onAdd} />
      </div>
    </Panel>
  );
}

function AddPayment({
  onAdd,
  disabled,
}: {
  onAdd: (body: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<string>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [isRefund, setIsRefund] = useState(false);

  function submit() {
    const n = Number(amount);
    if (!n || Number.isNaN(n)) return;
    onAdd({
      amount: n,
      mode,
      reference: reference.trim() || undefined,
      isRefund,
    });
    setAmount('');
    setReference('');
    setIsRefund(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[128px] space-y-1">
          <Label htmlFor="pay-amount">Amount</Label>
          <Input
            id="pay-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="25000"
            className="text-right"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="w-[144px] space-y-1">
          <Label htmlFor="pay-mode">Mode</Label>
          <Select
            id="pay-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {humanise(m)}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label htmlFor="pay-ref">Reference</Label>
          <Input
            id="pay-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="UPI txn / cheque no."
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <Button onClick={submit} disabled={disabled || !amount}>
          <Plus className="size-4" strokeWidth={1.75} />
          Add
        </Button>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-ink-500">
        <input
          type="checkbox"
          checked={isRefund}
          onChange={(e) => setIsRefund(e.target.checked)}
          className="size-3.5 accent-loss-500"
        />
        This is a refund back to the client
      </label>
    </div>
  );
}

function CostsPanel({
  booking,
  busy,
  onAdd,
  onDelete,
  onSeed,
}: {
  booking: BookingDetail;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (costId: string) => void;
  onSeed: () => void;
}) {
  const canSeed =
    booking.itineraryOptionId !== null && booking.costs.length === 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Receipt className="size-3.5" strokeWidth={1.75} />
          Vendor costs
        </PanelTitle>
        <span className="tabular text-[13px] text-ink-100">
          {money(booking.financials.totalCostDue)}
        </span>
      </PanelHeader>

      {booking.costs.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No costs recorded</p>
          <p className="mt-1 text-[12px] text-ink-500">
            {canSeed
              ? 'Copy the itinerary tier’s priced items in as expected costs, or add manually.'
              : 'Add each vendor payable below.'}
          </p>
          {canSeed && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              className="mt-3"
              onClick={onSeed}
            >
              <Sparkles className="size-4" strokeWidth={1.75} />
              Seed from itinerary
            </Button>
          )}
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60">
          {booking.costs.map((c) => {
            const paid = c.amountPaid >= c.amountDue && c.amountDue > 0;
            return (
              <li
                key={c.id}
                className="group flex items-start gap-3 px-5 py-2.5 hover:bg-ink-850/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink-100">
                    {c.description}
                  </p>
                  <p className="tabular mt-0.5 text-[11px] text-ink-500">
                    {money(c.amountPaid)} paid of {money(c.amountDue)}
                    {c.reference && <span className="ml-2">· ref {c.reference}</span>}
                  </p>
                </div>
                {paid ? (
                  <Chip className="border-healthy-500/40 text-healthy-400">
                    Paid
                  </Chip>
                ) : c.amountPaid > 0 ? (
                  <Chip className="border-warn-500/40 text-warn-400">Part</Chip>
                ) : (
                  <Chip>Due</Chip>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Remove "${c.description}"?`)) onDelete(c.id);
                  }}
                  disabled={busy}
                  aria-label={`Remove ${c.description}`}
                  className="rounded p-1 text-ink-600 opacity-0 transition-[opacity,color,background-color] duration-150 group-hover:opacity-100 hover:bg-ink-800 hover:text-loss-400"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ink-800 p-4">
        <AddCost disabled={busy} onAdd={onAdd} />
      </div>
    </Panel>
  );
}

function AddCost({
  onAdd,
  disabled,
}: {
  onAdd: (body: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [description, setDescription] = useState('');
  const [amountDue, setAmountDue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  function submit() {
    if (!description.trim() || !amountDue) return;
    onAdd({
      description: description.trim(),
      amountDue: Number(amountDue) || 0,
      amountPaid: Number(amountPaid) || 0,
    });
    setDescription('');
    setAmountDue('');
    setAmountPaid('');
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[160px] flex-1 space-y-1">
        <Label htmlFor="cost-desc">Description</Label>
        <Input
          id="cost-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hotel Grand Mumtaz — 3 rooms 4N"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="w-[112px] space-y-1">
        <Label htmlFor="cost-due">Due</Label>
        <Input
          id="cost-due"
          type="number"
          min={0}
          value={amountDue}
          onChange={(e) => setAmountDue(e.target.value)}
          placeholder="18000"
          className="text-right"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="w-[112px] space-y-1">
        <Label htmlFor="cost-paid">Paid</Label>
        <Input
          id="cost-paid"
          type="number"
          min={0}
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
          placeholder="0"
          className="text-right"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <Button
        onClick={submit}
        disabled={disabled || !description.trim() || !amountDue}
      >
        <Plus className="size-4" strokeWidth={1.75} />
        Add
      </Button>
    </div>
  );
}
