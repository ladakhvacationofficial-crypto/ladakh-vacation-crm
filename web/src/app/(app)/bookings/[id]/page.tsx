'use client';

import { EntityDocuments } from '@/components/entity-documents';
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
  Building2,
  Car,
  FileText,
  Calendar,
  Users2,
  Clock,
  Phone,
  Mail,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Calculator,
  History,
  Send,
  MapPin,
  X,
  UserCheck,
  Globe,
} from 'lucide-react';
import {
  api,
  ApiError,
  openBinary,
  type BookingDetail,
  type ItineraryDetail,
  type PricingSettings,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { MarginRibbon } from '@/components/margin-ribbon';
import { RevisionsDialog } from '@/components/itineraries/revisions-dialog';
import { BedWisePricerDialog } from '@/components/bed-wise-pricer-dialog';
import {
  money,
  percent,
  shortDate,
  marginHealth,
  moneyWithCurrency,
  SupportedCurrency,
  DEFAULT_FX_RATES,
} from '@/lib/format';
import { BOOKING_STATUSES, PAYMENT_MODES, humanise } from '@/lib/constants';

type TabKey =
  | 'overview'
  | 'itinerary'
  | 'reservations'
  | 'fleet'
  | 'permits'
  | 'payments'
  | 'documents';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDetail | null>(null);
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active workspace tab
  const [tab, setTab] = useState<TabKey>('overview');

  // Dialogs
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [bedWiseOpen, setBedWiseOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [usersList, setUsersList] = useState<{ id: string; name: string; email: string }[]>([]);
  const [generatingTaxInv, setGeneratingTaxInv] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<BookingDetail>(`/bookings/${id}`);
      setBooking(data);

      if (data.itineraryId) {
        api
          .get<ItineraryDetail>(`/itineraries/${data.itineraryId}`)
          .then(setItinerary)
          .catch(() => setItinerary(null));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.get<PricingSettings>('/settings/pricing').then(setSettings).catch(() => {});
    api.get<{ id: string; name: string; email: string }[]>('/users').then(setUsersList).catch(() => {});
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

  async function handleCreateTaxInvoice() {
    setGeneratingTaxInv(true);
    try {
      const inv = await api.post<any>(`/invoices/booking/${id}`);
      await openBinary(`/invoices/${inv.id}/pdf`, `${inv.invoiceNumber}.pdf`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate tax invoice.');
    } finally {
      setGeneratingTaxInv(false);
    }
  }

  function handleCopyReminder() {
    if (!booking) return;
    const text = `Namaste ${booking.lead.name}! Greetings from Ladakh Vacation. Regarding your upcoming Ladakh tour (${booking.packageName ?? booking.bookingNumber}), here is your payment summary:

Total Package: ${money(booking.totalSell)}
Amount Received: ${money(booking.financials.totalReceived)}
Balance Due: ${money(booking.financials.balanceDue)}

Kindly process the balance via Bank Transfer / UPI at your earliest convenience. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedReminder(true);
    setTimeout(() => setCopiedReminder(false), 2500);
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
  const shownMargin =
    f.totalCostDue > 0 ? f.actualMarginPercent : f.quotedMarginPercent;

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top breadcrumb */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-3"
        onClick={() => router.push('/bookings')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        All Bookings
      </Button>

      {/* Main Trip Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              {booking.packageName ?? 'Untitled package'}
            </h1>
            <Chip className="tabular">{booking.bookingNumber}</Chip>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                booking.status === 'CONFIRMED'
                  ? 'bg-healthy-500/15 text-healthy-400 border border-healthy-500/30'
                  : booking.status === 'COMPLETED'
                  ? 'bg-signal-500/15 text-signal-400 border border-signal-500/30'
                  : booking.status === 'CANCELLED'
                  ? 'bg-loss-500/15 text-loss-400 border border-loss-500/30'
                  : 'bg-warn-500/15 text-warn-400 border border-warn-500/30'
              }`}
            >
              {humanise(booking.status)}
            </span>
            {booking.currency && booking.currency !== 'INR' && (
              <span className="rounded-full bg-signal-500/15 border border-signal-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-signal-400">
                {moneyWithCurrency(booking.totalSell, booking.currency, booking.fxRate)}
              </span>
            )}
          </div>

          <p className="mt-1 text-[13px] text-ink-400">
            Lead:{' '}
            <Link
              href={`/leads/${booking.lead.id}`}
              className="font-medium text-signal-400 transition-colors hover:text-signal-300"
            >
              {booking.lead.name}
            </Link>
            <span className="tabular"> · {booking.lead.phone}</span>
            {booking.lead.email && <span> · {booking.lead.email}</span>}
            {booking.travelStartDate && (
              <>
                {' · '}
                <span className="text-ink-200">
                  {shortDate(booking.travelStartDate)}
                  {booking.travelEndDate && ` – ${shortDate(booking.travelEndDate)}`}
                </span>
              </>
            )}
            <span>
              {' '}
              · {booking.adults + booking.children} pax ({booking.adults}A
              {booking.children > 0 ? `, ${booking.children}C` : ''}) · {booking.nights}N
            </span>
          </p>
        </div>

        {/* Quick action buttons & status */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() =>
              openBinary(
                `/bookings/${id}/invoice.pdf`,
                `Proforma-${booking.bookingNumber}.pdf`,
              ).catch((e) =>
                setError(e instanceof ApiError ? e.message : 'Download failed.'),
              )
            }
            title="Download Client Proforma Invoice"
          >
            <FileDown className="size-4" strokeWidth={1.75} />
            Proforma PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || generatingTaxInv}
            onClick={handleCreateTaxInvoice}
            title="Generate official GST Tax Invoice (SAC 998555)"
          >
            <Receipt className="size-4" strokeWidth={1.75} />
            {generatingTaxInv ? 'Generating...' : 'GST Invoice'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() =>
              openBinary(
                `/bookings/${id}/hotel-voucher.pdf`,
                `Hotel-Voucher-${booking.bookingNumber}.pdf`,
              ).catch((e) =>
                setError(
                  e instanceof ApiError ? e.message : 'Hotel voucher download failed.',
                ),
              )
            }
            title="Download Hotel Confirmation Voucher PDF"
          >
            <Building2 className="size-4" strokeWidth={1.75} />
            Hotel Voucher
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() =>
              openBinary(
                `/bookings/${id}/driver-voucher.pdf`,
                `Driver-Duty-Slip-${booking.bookingNumber}.pdf`,
              ).catch((e) =>
                setError(
                  e instanceof ApiError ? e.message : 'Driver voucher download failed.',
                ),
              )
            }
            title="Download Driver Duty Slip PDF"
          >
            <Car className="size-4" strokeWidth={1.75} />
            Duty Slip
          </Button>

          <div className="w-[110px]">
            <Select
              value={booking.currency || 'INR'}
              disabled={busy}
              aria-label="Currency"
              onChange={(e) => {
                const c = e.target.value as SupportedCurrency;
                mutate(() =>
                  api.patch(`/bookings/${id}`, {
                    currency: c,
                    fxRate: DEFAULT_FX_RATES[c] || 1.0,
                  }),
                );
              }}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </Select>
          </div>

          <div className="w-[150px]">
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
            label="Cancel trip"
            confirmMessage={`Cancel trip ${booking.bookingNumber}? The record stays for accounting.`}
            onConfirm={async () => {
              try {
                await api.del(`/bookings/${id}`);
                router.push('/bookings');
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Could not cancel booking.');
              }
            }}
          />
        </div>
      </header>

      {/* MASTER TRIP WORKSPACE TABS */}
      <div className="mb-6 flex overflow-x-auto border-b border-ink-800 text-sm">
        <button
          onClick={() => setTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'overview'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Sparkles className="size-4" />
          Overview & Hub
        </button>

        <button
          onClick={() => setTab('itinerary')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'itinerary'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Calendar className="size-4" />
          Quotation & Plan
        </button>

        <button
          onClick={() => setTab('reservations')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'reservations'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Building2 className="size-4" />
          Reservations & Costs ({booking.costs.length})
        </button>

        <button
          onClick={() => setTab('fleet')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'fleet'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Car className="size-4" />
          Fleet Dispatch ({booking.fleetAssignments?.length ?? 0})
        </button>

        <button
          onClick={() => setTab('permits')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'permits'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Shield className="size-4" />
          Ladakh Permits ({booking.permitApplications?.length ?? 0})
        </button>

        <button
          onClick={() => setTab('payments')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'payments'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Wallet className="size-4" />
          Payments & Billing ({booking.payments.length})
        </button>

        <button
          onClick={() => setTab('documents')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
            tab === 'documents'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <FileText className="size-4" />
          Documents & Vault
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
        >
          {error}
        </p>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW & TRIP HUB
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Operational Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Plan Card */}
            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Itinerary & Route
                </span>
                {booking.itineraryId && (
                  <button
                    onClick={() => setTab('itinerary')}
                    className="text-[11px] text-signal-400 hover:text-signal-300 font-medium"
                  >
                    View Plan →
                  </button>
                )}
              </div>
              {itinerary ? (
                <div className="mt-2">
                  <p className="font-semibold text-ink-100 text-[13px] truncate">
                    {itinerary.title}
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {itinerary.days.length} Days · {itinerary.totalPax} Pax ·{' '}
                    <span className="tabular">{itinerary.code}</span>
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-[13px] text-ink-300 font-medium">Custom Sold Package</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {booking.nights} Nights · {booking.adults + booking.children} Pax
                  </p>
                </div>
              )}
            </Panel>

            {/* Operations Handover Card */}
            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Operations Handover
                </span>
                <button
                  onClick={() => setHandoverOpen(true)}
                  className="text-[11px] text-signal-400 hover:text-signal-300 font-medium"
                >
                  {booking.handedOverAt ? 'Update →' : 'Sign-off →'}
                </button>
              </div>
              {booking.handedOverAt ? (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink-100 text-[13px] truncate">
                      {booking.operationsOwner?.name ?? 'Ops Desk'}
                    </span>
                    <span className="rounded bg-healthy-500/15 border border-healthy-500/30 px-1 py-0.2 text-[9.5px] font-semibold text-healthy-400">
                      Handed Over
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400 mt-0.5 truncate">
                    {booking.handedOverBy ? `By ${booking.handedOverBy.name} · ` : ''}
                    {shortDate(booking.handedOverAt)}
                  </p>
                  {booking.handoverNotes && (
                    <p className="text-[10.5px] text-ink-500 mt-1 italic truncate" title={booking.handoverNotes}>
                      &quot;{booking.handoverNotes}&quot;
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-[13px] text-warn-400 font-medium">Pending Handover</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Sales sign-off required for Leh operations dispatch
                  </p>
                </div>
              )}
            </Panel>

            {/* Fleet Dispatch Card */}
            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Vehicle & Driver
                </span>
                <button
                  onClick={() => setTab('fleet')}
                  className="text-[11px] text-signal-400 hover:text-signal-300 font-medium"
                >
                  Fleet Desk →
                </button>
              </div>
              {booking.fleetAssignments?.[0] ? (
                <div className="mt-2">
                  <p className="font-semibold text-ink-100 text-[13px]">
                    {booking.fleetAssignments[0].vehicle?.plateNumber ?? 'Cab Assigned'}{' '}
                    <span className="text-[11px] font-normal text-ink-400">
                      ({humanise(booking.fleetAssignments[0].vehicle?.vehicleType ?? 'CAB')})
                    </span>
                  </p>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    Driver: {booking.fleetAssignments[0].driver?.name ?? 'Assigned'}{' '}
                    {booking.fleetAssignments[0].driver?.phone &&
                      `(${booking.fleetAssignments[0].driver.phone})`}
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-[13px] text-warn-400 font-medium">Unallocated Transport</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Assign vehicle & driver in Fleet Desk
                  </p>
                </div>
              )}
            </Panel>

            {/* Permits Card */}
            <Panel className="p-4 bg-ink-900 border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Ladakh Permits (ILP/PAP)
                </span>
                <button
                  onClick={() => setTab('permits')}
                  className="text-[11px] text-signal-400 hover:text-signal-300 font-medium"
                >
                  Permits Desk →
                </button>
              </div>
              {booking.permitApplications?.[0] ? (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink-100 text-[13px]">
                      {booking.permitApplications[0].permitNumber ?? 'Application Filed'}
                    </span>
                    <span className="rounded bg-brand-500/15 px-1 py-0.2 text-[9.5px] font-semibold text-brand-500">
                      {booking.permitApplications[0].status}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400 mt-0.5">
                    {booking.permitApplications[0].sectors?.length ?? 3} restricted sectors
                    cleared
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-[13px] text-warn-400 font-medium">Permits Not Issued</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Inner Line Permits required for Nubra & Pangong
                  </p>
                </div>
              )}
            </Panel>
          </div>

          {/* Money Strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyCard
              label="Sell Price"
              value={money(booking.totalSell)}
              sub={
                booking.currency && booking.currency !== 'INR'
                  ? `${moneyWithCurrency(booking.totalSell, booking.currency, booking.fxRate)} (@ ₹${booking.fxRate ?? DEFAULT_FX_RATES[booking.currency as SupportedCurrency]}/${booking.currency})`
                  : `${booking.adults + booking.children} pax · ${booking.nights}N`
              }
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
              label="Vendor Costs"
              value={money(f.totalCostDue)}
              sub={
                f.vendorOutstanding === 0
                  ? 'All paid'
                  : `${money(f.vendorOutstanding)} owed`
              }
              tone={f.vendorOutstanding === 0 ? 'healthy' : 'ink'}
            />
            <MoneyCard
              label={f.totalCostDue > 0 ? 'Actual Margin' : 'Quoted Margin'}
              value={percent(shownMargin)}
              sub={
                f.totalCostDue > 0 && Math.abs(f.marginVariance) > 0
                  ? `${f.marginVariance > 0 ? '+' : ''}${money(f.marginVariance)} vs quote`
                  : money(f.totalCostDue > 0 ? f.actualProfit : f.quotedProfit)
              }
              tone={marginHealth(shownMargin, minMargin)}
            />
          </div>

          {/* Margin Ribbon */}
          <Panel>
            <PanelBody>
              <MarginRibbon
                sell={booking.totalSell}
                cost={f.totalCostDue > 0 ? f.totalCostDue : booking.totalNet}
                minMargin={minMargin}
              />
              {f.totalCostDue === 0 && booking.totalNet > 0 && (
                <p className="mt-2 text-[11px] text-ink-500">
                  Estimated from the quotation. Record vendor payables to see real-time
                  actual margin.
                </p>
              )}
            </PanelBody>
          </Panel>

          {/* Trip Operations Health & Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel className="p-5">
              <PanelTitle className="text-sm font-semibold mb-3">
                Pre-Departure Checklist
              </PanelTitle>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between py-1 border-b border-ink-800/60">
                  <span className="flex items-center gap-2">
                    {f.balanceDue === 0 ? (
                      <CheckCircle2 className="size-4 text-healthy-400" />
                    ) : (
                      <Clock className="size-4 text-warn-400" />
                    )}
                    Client Payment Balance
                  </span>
                  <span className="font-semibold tabular">
                    {f.balanceDue === 0 ? 'Settled' : money(f.balanceDue) + ' due'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-ink-800/60">
                  <span className="flex items-center gap-2">
                    {booking.costs.length > 0 ? (
                      <CheckCircle2 className="size-4 text-healthy-400" />
                    ) : (
                      <Clock className="size-4 text-ink-500" />
                    )}
                    Vendor Reservations Logged
                  </span>
                  <span className="font-semibold tabular">
                    {booking.costs.length} service line(s)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-ink-800/60">
                  <span className="flex items-center gap-2">
                    {booking.fleetAssignments?.[0] ? (
                      <CheckCircle2 className="size-4 text-healthy-400" />
                    ) : (
                      <AlertCircle className="size-4 text-loss-400" />
                    )}
                    Vehicle & Driver Duty Slip
                  </span>
                  <span className="font-semibold">
                    {booking.fleetAssignments?.[0] ? 'Assigned' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    {booking.permitApplications?.[0]?.status === 'ISSUED' ? (
                      <CheckCircle2 className="size-4 text-healthy-400" />
                    ) : (
                      <Clock className="size-4 text-warn-400" />
                    )}
                    DC Office Inner Line Permits
                  </span>
                  <span className="font-semibold">
                    {booking.permitApplications?.[0]?.status ?? 'Not Applied'}
                  </span>
                </div>
              </div>
            </Panel>

            <Panel className="p-5">
              <PanelTitle className="text-sm font-semibold mb-3">
                Guest Contact & Trip Notes
              </PanelTitle>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center gap-2 text-ink-300">
                  <Users2 className="size-4 text-ink-500" />
                  <span>
                    Primary Guest: <b className="text-ink-100">{booking.lead.name}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-ink-300">
                  <Phone className="size-4 text-ink-500" />
                  <a
                    href={`tel:${booking.lead.phone}`}
                    className="text-signal-400 hover:underline tabular"
                  >
                    {booking.lead.phone}
                  </a>
                </div>
                {booking.lead.email && (
                  <div className="flex items-center gap-2 text-ink-300">
                    <Mail className="size-4 text-ink-500" />
                    <a
                      href={`mailto:${booking.lead.email}`}
                      className="text-signal-400 hover:underline"
                    >
                      {booking.lead.email}
                    </a>
                  </div>
                )}
                {booking.notes && (
                  <div className="mt-3 p-3 rounded bg-ink-850 text-xs text-ink-300 border border-ink-800">
                    <p className="font-medium text-ink-400 mb-1">Internal Notes:</p>
                    <p className="whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: QUOTATION & DAY-BY-DAY ITINERARY PLAN
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'itinerary' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-ink-900 border border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-100">
                {itinerary?.title ?? booking.packageName ?? 'Trip Quotation Plan'}
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                {booking.nights} Nights / {booking.nights + 1} Days ·{' '}
                {booking.adults + booking.children} Pax · Quoted Price: {money(booking.totalSell)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBedWiseOpen(true)}
                title="Calculate bed-wise rates (Adult / AwEB / CwEB / CNB)"
              >
                <Calculator className="size-3.5" />
                Bed-Wise Calculator
              </Button>

              {booking.itineraryId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRevisionsOpen(true)}
                  title="View quote version history and diffs"
                >
                  <History className="size-3.5" />
                  Quote Revisions
                </Button>
              )}

              {booking.itineraryId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/itineraries/${booking.itineraryId}`)}
                >
                  <ExternalLink className="size-3.5" />
                  Open Builder
                </Button>
              )}
            </div>
          </div>

          {itinerary && itinerary.days?.length > 0 ? (
            <div className="space-y-3">
              {itinerary.days.map((d) => (
                <Panel key={d.id} className="p-4">
                  <div className="flex items-baseline justify-between border-b border-ink-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-400">
                        Day {d.dayNumber}
                      </span>
                      <h3 className="font-semibold text-ink-100 text-sm">
                        {d.headline ?? d.city ?? `Day ${d.dayNumber}`}
                      </h3>
                    </div>
                    {d.city && <span className="text-xs text-ink-400">{d.city}</span>}
                  </div>

                  {d.summary && (
                    <p className="text-xs text-ink-300 mt-2 whitespace-pre-wrap">
                      {d.summary}
                    </p>
                  )}

                  {d.items && d.items.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {d.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-ink-850/60 text-ink-300"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                              {item.kind}
                            </span>
                            <span className="text-ink-200">{item.title}</span>
                          </div>
                          {item.vendor && (
                            <span className="text-[11px] text-ink-400">
                              Supplier: {item.vendor.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : (
            <Panel className="p-8 text-center text-ink-400 text-sm">
              <p>No full day-by-day plan linked to this file.</p>
              <p className="text-xs text-ink-500 mt-1">
                This booking was created with frozen pricing directly.
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: SERVICE RESERVATIONS & VENDOR COSTS
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'reservations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-ink-900 border border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-100">
                Service Reservations & Payables
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Track room blocks, vehicle confirmations, and supplier payments
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  openBinary(
                    `/bookings/${id}/hotel-voucher.pdf`,
                    `Hotel-Voucher-${booking.bookingNumber}.pdf`,
                  )
                }
              >
                <Building2 className="size-3.5" />
                Hotel Voucher PDF
              </Button>
            </div>
          </div>

          <CostsPanel
            booking={booking}
            busy={busy}
            onAdd={(body) => mutate(() => api.post(`/bookings/${id}/costs`, body))}
            onDelete={(costId) => mutate(() => api.del(`/bookings/costs/${costId}`))}
            onSeed={() => mutate(() => api.post(`/bookings/${id}/costs/from-itinerary`))}
            onUpdateConfirmation={(costId, status, ref) =>
              mutate(() =>
                api.patch(`/bookings/costs/${costId}`, {
                  confirmationStatus: status,
                  confirmationRef: ref,
                }),
              )
            }
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 4: FLEET & DRIVER DISPATCH
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-ink-900 border border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-100">
                Fleet Assignment & Duty Slips
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Vehicle allocation, driver contact, and circuit transit status
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  openBinary(
                    `/bookings/${id}/driver-voucher.pdf`,
                    `Driver-Duty-Slip-${booking.bookingNumber}.pdf`,
                  )
                }
              >
                <Car className="size-3.5" />
                Print Duty Slip
              </Button>
              <Link href="/fleet">
                <Button variant="primary" size="sm">
                  <ExternalLink className="size-3.5" />
                  Fleet Desk
                </Button>
              </Link>
            </div>
          </div>

          {booking.fleetAssignments && booking.fleetAssignments.length > 0 ? (
            <div className="space-y-4">
              {booking.fleetAssignments.map((a) => (
                <Panel key={a.id} className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/60 pb-3">
                    <div>
                      <span className="font-semibold text-ink-100 text-sm">
                        Duty Slip: {a.dutySlipNumber ?? 'PENDING'}
                      </span>
                      <p className="text-xs text-ink-400 mt-0.5">
                        Circuit: <b className="text-ink-200">{a.circuit}</b>
                      </p>
                    </div>
                    <Chip>{humanise(a.status)}</Chip>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vehicle */}
                    <div className="p-3.5 rounded-lg bg-ink-850/60 border border-ink-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                        Vehicle Details
                      </p>
                      {a.vehicle ? (
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-sm font-semibold text-ink-100">
                            {a.vehicle.plateNumber}
                          </p>
                          <p className="text-ink-300">
                            {a.vehicle.makeModel} · {humanise(a.vehicle.vehicleType)}
                          </p>
                          <p className="text-ink-400">
                            Capacity: {a.vehicle.capacity} Pax · Ownership:{' '}
                            {humanise(a.vehicle.ownership)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-warn-400 mt-2">No vehicle allocated</p>
                      )}
                    </div>

                    {/* Driver */}
                    <div className="p-3.5 rounded-lg bg-ink-850/60 border border-ink-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                        Driver Details
                      </p>
                      {a.driver ? (
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink-100">
                              {a.driver.name}
                            </span>
                            {a.driver.isLocalLadakhi && (
                              <span className="rounded bg-brand-500/15 px-1 py-0.2 text-[9.5px] font-semibold text-brand-500">
                                Local Ladakhi
                              </span>
                            )}
                          </div>
                          <p className="text-ink-300">
                            Phone:{' '}
                            <a
                              href={`tel:${a.driver.phone}`}
                              className="text-signal-400 hover:underline tabular"
                            >
                              {a.driver.phone}
                            </a>
                          </p>
                          <p className="text-ink-400">
                            License: {a.driver.licenseNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-warn-400 mt-2">No driver allocated</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-ink-800/60 tabular">
                    <div>
                      <span className="text-ink-500">Dates:</span>
                      <p className="text-ink-200">
                        {shortDate(a.startDate)} – {shortDate(a.endDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-ink-500">Start / End Km:</span>
                      <p className="text-ink-200">
                        {a.startKm ?? '—'} / {a.endKm ?? '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-ink-500">Driver Batta:</span>
                      <p className="text-ink-200">{money(a.driverBatta ?? 0)}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Fuel Advance:</span>
                      <p className="text-ink-200">{money(a.fuelAllowance ?? 0)}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          ) : (
            <Panel className="p-8 text-center text-ink-400 text-sm">
              <p>No fleet assignments linked to this booking yet.</p>
              <Link href="/fleet" className="mt-3 inline-block">
                <Button variant="primary" size="sm">
                  Assign Vehicle & Driver in Fleet Desk
                </Button>
              </Link>
            </Panel>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 5: LADAKH PERMITS (ILP & PAP)
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'permits' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-ink-900 border border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-100">
                Ladakh Inner Line & Protected Area Permits
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                DC Office Leh statutory fee auto-calc and sector clearances
              </p>
            </div>
            <Link href="/permits">
              <Button variant="primary" size="sm">
                <ExternalLink className="size-3.5" />
                Permits Desk
              </Button>
            </Link>
          </div>

          {booking.permitApplications && booking.permitApplications.length > 0 ? (
            <div className="space-y-4">
              {booking.permitApplications.map((p) => (
                <Panel key={p.id} className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-100 text-sm">
                          {p.permitNumber ?? 'Ref: PENDING'}
                        </span>
                        <Chip>{humanise(p.permitType)}</Chip>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">
                        Validity: {shortDate(p.validFrom)} – {shortDate(p.validTo)}
                      </p>
                    </div>
                    <Chip>{humanise(p.status)}</Chip>
                  </div>

                  {/* Statutory Fees Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-ink-850/60 text-xs tabular border border-ink-800">
                    <div>
                      <span className="text-ink-500">Environmental Fee:</span>
                      <p className="font-semibold text-ink-200">
                        {money(p.environmentalFee)}
                      </p>
                    </div>
                    <div>
                      <span className="text-ink-500">Red Cross Society:</span>
                      <p className="font-semibold text-ink-200">{money(p.redCrossFee)}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Wildlife Protection:</span>
                      <p className="font-semibold text-ink-200">{money(p.wildlifeFee)}</p>
                    </div>
                    <div>
                      <span className="text-ink-500">Total Statutory Fee:</span>
                      <p className="font-semibold text-brand-400">{money(p.totalFee)}</p>
                    </div>
                  </div>

                  {/* Sectors */}
                  <div>
                    <p className="text-xs font-medium text-ink-400 mb-1.5">
                      Authorized Sectors:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.sectors.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-ink-800 px-2 py-0.5 text-xs text-ink-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Travellers Roster */}
                  {p.travellers && p.travellers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-ink-400 mb-2">
                        Traveller Roster ({p.travellers.length}):
                      </p>
                      <div className="overflow-x-auto rounded border border-ink-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-ink-850 text-ink-400">
                            <tr>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Nationality</th>
                              <th className="px-3 py-2">ID Type</th>
                              <th className="px-3 py-2">ID Number</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink-800">
                            {p.travellers.map((t) => (
                              <tr key={t.id} className="text-ink-200">
                                <td className="px-3 py-2 font-medium">{t.fullName}</td>
                                <td className="px-3 py-2">{t.nationality}</td>
                                <td className="px-3 py-2">{t.idType}</td>
                                <td className="px-3 py-2 tabular">{t.idNumber}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : (
            <Panel className="p-8 text-center text-ink-400 text-sm">
              <p>No permit applications filed for this trip.</p>
              <Link href="/permits" className="mt-3 inline-block">
                <Button variant="primary" size="sm">
                  Apply DC Office Permits
                </Button>
              </Link>
            </Panel>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 6: CLIENT PAYMENTS & GST BILLING
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-ink-900 border border-ink-800">
            <div>
              <h2 className="text-base font-semibold text-ink-100">
                Client Payments & GST Invoicing
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Outstanding: <b className="text-brand-400">{money(f.balanceDue)}</b> ·
                Status: {f.balanceDue === 0 ? 'Settled' : 'Payment Due'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyReminder}
                title="Copy ready-to-send payment reminder text for WhatsApp"
              >
                {copiedReminder ? (
                  <>
                    <Check className="size-3.5 text-healthy-400" />
                    Copied WhatsApp Text!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    WhatsApp Reminder
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateTaxInvoice}
                disabled={generatingTaxInv}
              >
                <Receipt className="size-3.5" />
                {generatingTaxInv ? 'Generating...' : 'GST Tax Invoice'}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PaymentsPanel
              booking={booking}
              busy={busy}
              onAdd={(body) => mutate(() => api.post(`/bookings/${id}/payments`, body))}
              onDelete={(paymentId) =>
                mutate(() => api.del(`/bookings/payments/${paymentId}`))
              }
              onVerify={(paymentId, status) =>
                mutate(() => api.patch(`/bookings/payments/${paymentId}/verify`, { status }))
              }
            />

            <Panel className="p-5 space-y-4">
              <PanelTitle className="text-sm font-semibold">
                Tax Invoicing & Compliance
              </PanelTitle>
              <div className="space-y-3 text-xs text-ink-300">
                <div className="p-3 rounded bg-ink-850 border border-ink-800">
                  <p className="font-semibold text-ink-100 mb-1">
                    GST SAC Code: 998555 (Tour Operator Services)
                  </p>
                  <p className="text-ink-400">
                    Ladakh State Code: 38. Consecutive sequential financial year
                    numbering enforced.
                  </p>
                </div>

                <div className="space-y-1.5 tabular">
                  <div className="flex justify-between py-1 border-b border-ink-800">
                    <span className="text-ink-500">Gross Package Sell:</span>
                    <span className="text-ink-100 font-medium">{money(booking.totalSell)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink-800">
                    <span className="text-ink-500">Total Received:</span>
                    <span className="text-healthy-400 font-medium">
                      {money(f.totalReceived)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-ink-500">Net Balance Due:</span>
                    <span className="text-brand-400 font-semibold">{money(f.balanceDue)}</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 7: DOCUMENTS & VOUCHERS VAULT
      ────────────────────────────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-ink-900 border border-ink-800">
            <h2 className="text-base font-semibold text-ink-100">
              Trip Documents & Voucher Vault
            </h2>
            <p className="text-xs text-ink-400 mt-0.5">
              Secure digital storage for guest Aadhaar/Passport scans, flight tickets,
              and PDF vouchers
            </p>
          </div>

          <EntityDocuments entityType="booking" entityId={id} />

          {/* Quick PDF downloads matrix */}
          <Panel className="p-5">
            <PanelTitle className="text-sm font-semibold mb-3">
              Official PDF Vouchers & Kits
            </PanelTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() =>
                  openBinary(
                    `/bookings/${id}/invoice.pdf`,
                    `Proforma-${booking.bookingNumber}.pdf`,
                  )
                }
                className="flex items-center gap-3 p-3 rounded-lg border border-ink-800 bg-ink-850 hover:bg-ink-800 hover:border-ink-700 transition-colors text-left"
              >
                <FileDown className="size-5 text-signal-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-100">Proforma Invoice</p>
                  <p className="text-[11px] text-ink-500">Booking Summary</p>
                </div>
              </button>

              <button
                onClick={handleCreateTaxInvoice}
                className="flex items-center gap-3 p-3 rounded-lg border border-ink-800 bg-ink-850 hover:bg-ink-800 hover:border-ink-700 transition-colors text-left"
              >
                <Receipt className="size-5 text-healthy-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-100">GST Tax Invoice</p>
                  <p className="text-[11px] text-ink-500">Official SAC 998555</p>
                </div>
              </button>

              <button
                onClick={() =>
                  openBinary(
                    `/bookings/${id}/hotel-voucher.pdf`,
                    `Hotel-Voucher-${booking.bookingNumber}.pdf`,
                  )
                }
                className="flex items-center gap-3 p-3 rounded-lg border border-ink-800 bg-ink-850 hover:bg-ink-800 hover:border-ink-700 transition-colors text-left"
              >
                <Building2 className="size-5 text-brand-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-100">Hotel Voucher</p>
                  <p className="text-[11px] text-ink-500">Room Confirmations</p>
                </div>
              </button>

              <button
                onClick={() =>
                  openBinary(
                    `/bookings/${id}/driver-voucher.pdf`,
                    `Driver-Duty-Slip-${booking.bookingNumber}.pdf`,
                  )
                }
                className="flex items-center gap-3 p-3 rounded-lg border border-ink-800 bg-ink-850 hover:bg-ink-800 hover:border-ink-700 transition-colors text-left"
              >
                <Car className="size-5 text-signal-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink-100">Driver Duty Slip</p>
                  <p className="text-[11px] text-ink-500">Vehicle & Km Log</p>
                </div>
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* DIALOGS */}
      {booking.itineraryId && (
        <RevisionsDialog
          itineraryId={booking.itineraryId}
          open={revisionsOpen}
          onClose={() => setRevisionsOpen(false)}
          onRestored={load}
        />
      )}

      <BedWisePricerDialog
        open={bedWiseOpen}
        onClose={() => setBedWiseOpen(false)}
        initialNights={booking.nights || 5}
        initialPax={booking.adults + booking.children || 2}
      />

      <HandoverDialog
        isOpen={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        booking={booking}
        users={usersList}
        onHandover={async (operationsOwnerId, notes) => {
          await mutate(() =>
            api.post(`/bookings/${id}/handover`, { operationsOwnerId, notes }),
          );
        }}
      />
    </div>
  );
}

function MoneyCard({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'ink' | 'healthy' | 'warn' | 'loss';
}) {
  const toneClass =
    tone === 'healthy'
      ? 'text-healthy-400'
      : tone === 'warn'
      ? 'text-warn-400'
      : tone === 'loss'
      ? 'text-loss-400'
      : 'text-ink-100';

  return (
    <Panel className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className={`tabular mt-1 text-[22px] font-semibold ${toneClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-500">{sub}</p>
    </Panel>
  );
}

function PaymentsPanel({
  booking,
  busy,
  onAdd,
  onDelete,
  onVerify,
}: {
  booking: BookingDetail;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (paymentId: string) => void;
  onVerify: (paymentId: string, status: 'VERIFIED' | 'REJECTED') => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Wallet className="size-3.5" strokeWidth={1.75} />
          Client Payments Received
        </PanelTitle>
        <span className="tabular text-[13px] text-ink-100">
          {money(booking.financials.totalReceived)}
        </span>
      </PanelHeader>

      {booking.payments.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No payments recorded</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Log the first advance payment below — Cash, UPI, or Bank Wire.
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
                <p className="text-[13px] flex flex-wrap items-center gap-1.5">
                  <span
                    className={`tabular font-medium ${
                      p.isRefund ? 'text-loss-400' : 'text-ink-100'
                    }`}
                  >
                    {money(p.amount)}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-ink-500">
                    {humanise(p.mode)}
                  </span>
                  {p.isRefund && (
                    <Chip className="border-loss-500/40 text-loss-400">
                      Refund
                    </Chip>
                  )}
                  {p.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded bg-healthy-500/15 border border-healthy-500/30 px-1.5 py-0.2 text-[9.5px] font-semibold text-healthy-400">
                      <CheckCircle2 className="size-2.5" />
                      Verified
                    </span>
                  )}
                  {p.verificationStatus === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 rounded bg-loss-500/15 border border-loss-500/30 px-1.5 py-0.2 text-[9.5px] font-semibold text-loss-400">
                      <AlertCircle className="size-2.5" />
                      Rejected
                    </span>
                  )}
                  {(!p.verificationStatus || p.verificationStatus === 'PENDING_VERIFICATION') && (
                    <span className="inline-flex items-center gap-1 rounded bg-warn-500/15 border border-warn-500/30 px-1.5 py-0.2 text-[9.5px] font-semibold text-warn-400">
                      <Clock className="size-2.5" />
                      Pending Audit
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {shortDate(p.receivedAt)}
                  {p.dueDate && (
                    <span className="ml-2 font-medium text-warn-400">· Due: {shortDate(p.dueDate)}</span>
                  )}
                  {p.reference && (
                    <span className="tabular ml-2 font-mono">ref {p.reference}</span>
                  )}
                  {p.verifiedBy && (
                    <span className="ml-2 text-healthy-400/80">· Verified by {p.verifiedBy.name}</span>
                  )}
                  {p.recordedBy && (
                    <span className="ml-2 text-ink-500">· Logged by {p.recordedBy.name}</span>
                  )}
                  {p.notes && <span className="ml-2 text-ink-600">· {p.notes}</span>}
                </p>

                {(!p.verificationStatus || p.verificationStatus === 'PENDING_VERIFICATION') && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => onVerify(p.id, 'VERIFIED')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-healthy-500/20 px-2 py-0.5 text-[10.5px] font-medium text-healthy-400 hover:bg-healthy-500/30 transition-colors"
                    >
                      <Check className="size-3" />
                      Verify
                    </button>
                    <button
                      onClick={() => onVerify(p.id, 'REJECTED')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded bg-loss-500/20 px-2 py-0.5 text-[10.5px] font-medium text-loss-400 hover:bg-loss-500/30 transition-colors"
                    >
                      <X className="size-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm('Remove this payment?')) onDelete(p.id);
                }}
                disabled={busy}
                aria-label="Remove payment"
                className="rounded p-1 text-ink-600 transition-[opacity,color,background-color] duration-150 hover:bg-ink-800 hover:text-loss-400 md:opacity-0 md:group-hover:opacity-100"
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
  const [dueDate, setDueDate] = useState('');
  const [isRefund, setIsRefund] = useState(false);

  function submit() {
    const n = Number(amount);
    if (!n || Number.isNaN(n)) return;
    onAdd({
      amount: n,
      mode,
      reference: reference.trim() || undefined,
      dueDate: dueDate || undefined,
      isRefund,
    });
    setAmount('');
    setReference('');
    setDueDate('');
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
        <div className="w-[130px] space-y-1">
          <Label htmlFor="pay-due">Due Date (opt)</Label>
          <Input
            id="pay-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
  onUpdateConfirmation,
}: {
  booking: BookingDetail;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (costId: string) => void;
  onSeed: () => void;
  onUpdateConfirmation?: (costId: string, status: string, ref?: string) => void;
}) {
  const canSeed =
    booking.itineraryOptionId !== null && booking.costs.length === 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Receipt className="size-3.5" strokeWidth={1.75} />
          Vendor Costs & Service Confirmations
        </PanelTitle>
        <span className="tabular text-[13px] text-ink-100">
          {money(booking.financials.totalCostDue)}
        </span>
      </PanelHeader>

      {booking.costs.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No service reservations recorded</p>
          <p className="mt-1 text-[12px] text-ink-500">
            {canSeed
              ? 'Seed from the itinerary tier to automatically create hotel and cab payables.'
              : 'Add each vendor payable and reservation voucher below.'}
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
            const status = c.confirmationStatus ?? 'PENDING';
            return (
              <li
                key={c.id}
                className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-ink-850/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-ink-100">
                      {c.description}
                    </p>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${
                        status === 'CONFIRMED'
                          ? 'bg-healthy-500/15 text-healthy-400'
                          : status === 'REJECTED'
                          ? 'bg-loss-500/15 text-loss-400'
                          : 'bg-warn-500/15 text-warn-400'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <p className="tabular mt-0.5 text-[11px] text-ink-500">
                    {money(c.amountPaid)} paid of {money(c.amountDue)}
                    {c.dueDate && (
                      <span className="ml-2 font-medium text-warn-400">· Deadline: {shortDate(c.dueDate)}</span>
                    )}
                    {c.reference && <span className="ml-2">· ref {c.reference}</span>}
                    {c.confirmationRef && (
                      <span className="ml-2 text-ink-400">· Voucher #{c.confirmationRef}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {onUpdateConfirmation && status !== 'CONFIRMED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-healthy-400 hover:text-healthy-300 text-xs h-7"
                      onClick={() => {
                        const ref = prompt(
                          'Enter Supplier Confirmation Voucher # (or leave blank):',
                          c.confirmationRef ?? '',
                        );
                        if (ref !== null) {
                          onUpdateConfirmation(c.id, 'CONFIRMED', ref.trim() || undefined);
                        }
                      }}
                    >
                      <Check className="size-3.5" />
                      Confirm
                    </Button>
                  )}

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
                    className="rounded p-1 text-ink-600 transition-[opacity,color,background-color] duration-150 hover:bg-ink-800 hover:text-loss-400 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
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
  const [dueDate, setDueDate] = useState('');

  function submit() {
    if (!description.trim() || !amountDue) return;
    onAdd({
      description: description.trim(),
      amountDue: Number(amountDue) || 0,
      amountPaid: Number(amountPaid) || 0,
      dueDate: dueDate || undefined,
    });
    setDescription('');
    setAmountDue('');
    setAmountPaid('');
    setDueDate('');
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[160px] flex-1 space-y-1">
        <Label htmlFor="cost-desc">Description</Label>
        <Input
          id="cost-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Nubra camp — 2 tents, 1 night"
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
        <Label htmlFor="cost-paid">Paid now</Label>
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
      <div className="w-[130px] space-y-1">
        <Label htmlFor="cost-due-date">Deadline (opt)</Label>
        <Input
          id="cost-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <Button onClick={submit} disabled={disabled || !description.trim() || !amountDue}>
        <Plus className="size-4" strokeWidth={1.75} />
        Add
      </Button>
    </div>
  );
}

function HandoverDialog({
  isOpen,
  onClose,
  booking,
  users,
  onHandover,
}: {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingDetail;
  users: { id: string; name: string; email: string }[];
  onHandover: (operationsOwnerId: string, notes?: string) => Promise<void>;
}) {
  const [selectedUserId, setSelectedUserId] = useState(
    booking.operationsOwnerId || users[0]?.id || '',
  );
  const [notes, setNotes] = useState(booking.handoverNotes || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (booking.operationsOwnerId) setSelectedUserId(booking.operationsOwnerId);
    else if (users.length > 0 && !selectedUserId) setSelectedUserId(users[0].id);
    if (booking.handoverNotes) setNotes(booking.handoverNotes);
  }, [booking, users]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setSubmitting(true);
    try {
      await onHandover(selectedUserId, notes.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-ink-100 flex items-center gap-2">
          <Shield className="size-5 text-signal-400" />
          Operations Handover Sign-off
        </h2>
        <p className="text-xs text-ink-400 mt-1">
          Officially transition this trip file from Sales to the Leh Operations desk.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label className="text-xs text-ink-300">Operations Desk Owner</Label>
            <Select
              className="mt-1.5 w-full"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="" disabled>
                Select an operations manager / coordinator
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="text-xs text-ink-300">Handover Notes & Instructions</Label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-950 p-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-signal-500 focus:outline-none"
              rows={4}
              placeholder="e.g. Guest arriving on early morning AI-445, VIP senior citizens (requires slow acclimatization), driver Tundup preferred, Pangong camp heaters requested."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedUserId}
            >
              {submitting ? 'Signing off...' : 'Confirm Handover Sign-off'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

