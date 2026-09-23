'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Landmark,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';
import {
  api, ApiError,
  type VendorRow, type VendorRateFullRow,
  type VendorLedgerResponse,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { money, shortDate } from '@/lib/format';
import { SEASONS, MEAL_PLANS, RATE_BASES, humanise } from '@/lib/constants';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setVendor(await api.get<VendorRow>(`/vendors/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load supplier.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

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
        <div className="h-4 w-48 rounded shimmer" />
      </div>
    );
  }
  if (!vendor) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/vendors')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Suppliers
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px] text-ink-100">{error ?? 'Not found.'}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost" size="sm" className="mb-4 -ml-3"
        onClick={() => router.push('/vendors')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Suppliers
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-signal-500 text-ink-950"
          >
            <Building2 className="size-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
                {vendor.name}
              </h1>
              <Chip>{humanise(vendor.type)}</Chip>
              {vendor.starRating && (
                <span className="text-[13px] text-brand-500">
                  {'★'.repeat(vendor.starRating)}
                </span>
              )}
              {!vendor.isActive && (
                <Chip className="border-loss-500/40 text-loss-500">Inactive</Chip>
              )}
            </div>
            <p className="mt-0.5 text-[13.5px] text-ink-400">
              {vendor.city ?? '—'}
              {vendor.area && ` · ${vendor.area}`}
            </p>
          </div>
        </div>
        <DeactivateButton
          disabled={busy || !vendor.isActive}
          label="Deactivate supplier"
          confirmMessage={`Deactivate ${vendor.name}? Rates and history stay; new bookings won't see them in the picker. Blocked if the ledger still has an outstanding balance.`}
          onConfirm={async () => {
            try {
              await api.del(`/vendors/${id}`);
              router.push('/vendors');
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Could not deactivate this supplier.');
            }
          }}
        />
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <RatesPanel
            vendor={vendor}
            busy={busy}
            onAdd={(body) => mutate(() => api.post(`/vendors/${id}/rates`, body))}
            onDelete={(rid) => mutate(() => api.del(`/vendors/rates/${rid}`))}
          />
          <LedgerPanel vendorId={vendor.id} />
        </div>

        <div className="space-y-4">
          {(vendor.type === 'HOTEL' || vendor.type === 'CAMP' || vendor.type === 'HOUSEBOAT') && (
            <PropertyPanel vendor={vendor} />
          )}
          <ContactPanel vendor={vendor} />
          <BankPanel vendor={vendor} />
          {vendor.notes && (
            <Panel>
              <PanelHeader>
                <PanelTitle>Notes</PanelTitle>
              </PanelHeader>
              <PanelBody className="whitespace-pre-wrap text-[13px] text-ink-300">
                {vendor.notes}
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PropertyPanel({ vendor: v }: { vendor: VendorRow }) {
  const hasAnything =
    v.checkInTime || v.checkOutTime || v.roomCount || (v.amenities?.length ?? 0) > 0;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Property</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3 py-4 text-[13px]">
        {!hasAnything && (
          <p className="text-[12.5px] text-ink-500">
            No property details yet. Edit the supplier to add check-in/out times, room count and amenities.
          </p>
        )}
        {(v.checkInTime || v.checkOutTime) && (
          <div className="grid grid-cols-2 gap-2 text-ink-300">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] text-ink-500">Check-in</p>
              <p className="tabular mt-0.5">{v.checkInTime ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.09em] text-ink-500">Check-out</p>
              <p className="tabular mt-0.5">{v.checkOutTime ?? '—'}</p>
            </div>
          </div>
        )}
        {v.roomCount != null && (
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.09em] text-ink-500">Rooms</p>
            <p className="tabular mt-0.5 text-ink-300">{v.roomCount}</p>
          </div>
        )}
        {(v.amenities?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.09em] text-ink-500">
              Amenities
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {v.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-ink-800 bg-ink-950 px-2 py-0.5 text-[11px] text-ink-400"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function ContactPanel({ vendor: v }: { vendor: VendorRow }) {
  if (v.contactRedacted) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Contact</PanelTitle>
        </PanelHeader>
        <PanelBody className="py-4">
          <p className="text-[12.5px] text-ink-500">
            Contact details are hidden for your role. This is the supplier
            protection layer — only owner / ops / accounts see phone, email
            and bank.
          </p>
        </PanelBody>
      </Panel>
    );
  }
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Contact</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-2 text-[13px]">
        {v.contactPerson && <Line icon={Building2} text={v.contactPerson} />}
        {v.phone && <Line icon={Phone} text={v.phone} />}
        {v.altPhone && <Line icon={Phone} text={`Alt: ${v.altPhone}`} />}
        {v.email && <Line icon={Mail} text={v.email} />}
        {v.paymentTerms && <Line icon={MapPin} text={v.paymentTerms} />}
      </PanelBody>
    </Panel>
  );
}

function BankPanel({ vendor: v }: { vendor: VendorRow }) {
  const hasAny = v.bankName || v.accountNumber || v.gstin || v.panNumber;
  if (!hasAny || v.contactRedacted) return null;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <Landmark className="size-3.5" strokeWidth={1.75} />
          Bank & tax
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-1.5 text-[12.5px] text-ink-300">
        {v.bankName && <p>{v.bankName}</p>}
        {v.accountNumber && <p className="tabular">A/C {v.accountNumber}</p>}
        {v.ifsc && <p className="tabular">{v.ifsc}</p>}
        {v.gstin && <p className="tabular">GST {v.gstin}</p>}
        {v.panNumber && <p className="tabular">PAN {v.panNumber}</p>}
      </PanelBody>
    </Panel>
  );
}

function Line({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  text: string;
}) {
  return (
    <p className="flex items-center gap-2 text-ink-200">
      <Icon className="size-3.5 text-ink-500" strokeWidth={1.75} />
      {text}
    </p>
  );
}

function RatesPanel({
  vendor: v,
  busy,
  onAdd,
  onDelete,
}: {
  vendor: VendorRow;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (rid: string) => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Rate card</PanelTitle>
        <span className="tabular text-[11px] text-ink-500">
          {v.rates.length} rate{v.rates.length === 1 ? '' : 's'}
        </span>
      </PanelHeader>

      {v.rates.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No rates on file</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Add the first one below. Rates flow into the quotation builder.
          </p>
        </PanelBody>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-4 py-2.5 font-medium">Variant</th>
                <th className="px-2 py-2.5 font-medium">Season</th>
                <th className="px-2 py-2.5 font-medium">Meal</th>
                <th className="px-2 py-2.5 font-medium">Basis</th>
                <th className="px-2 py-2.5 text-right font-medium">Net</th>
                <th className="px-2 py-2.5 text-right font-medium">Rack</th>
                <th className="px-2 py-2.5 font-medium">Valid</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {v.rates.map((r) => (
                <RateRow key={r.id} rate={r} busy={busy} onDelete={() => onDelete(r.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-ink-800 p-4">
        <AddRate vendor={v} disabled={busy} onAdd={onAdd} />
      </div>
    </Panel>
  );
}

function RateRow({
  rate: r,
  busy,
  onDelete,
}: {
  rate: VendorRateFullRow;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <tr className={`group border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60 ${!r.isActive ? 'opacity-50' : ''}`}>
      <td className="px-4 py-2.5 text-ink-100">{r.variant}</td>
      <td className="px-2 py-2.5 text-[12px] text-ink-400">{humanise(r.season)}</td>
      <td className="px-2 py-2.5 text-[12px] text-ink-400">{r.mealPlan ?? '—'}</td>
      <td className="px-2 py-2.5 text-[11px] text-ink-500">
        {humanise(r.rateBasis)}
      </td>
      <td className="tabular px-2 py-2.5 text-right text-ink-100">
        {money(r.netRate)}
      </td>
      <td className="tabular px-2 py-2.5 text-right text-[12px] text-ink-500">
        {r.rackRate ? money(r.rackRate) : '—'}
      </td>
      <td className="px-2 py-2.5 text-[11px] text-ink-500">
        {r.validFrom || r.validTo ? (
          <>
            {r.validFrom && shortDate(r.validFrom)}
            {r.validTo && ` – ${shortDate(r.validTo)}`}
          </>
        ) : (
          <span className="text-ink-600">any date</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <button
          onClick={() => { if (confirm(`Remove "${r.variant}"?`)) onDelete(); }}
          disabled={busy}
          aria-label={`Remove ${r.variant}`}
          className="rounded p-1 text-ink-500 opacity-0 transition-[opacity,color,background-color] duration-150 group-hover:opacity-100 hover:bg-ink-850 hover:text-loss-500"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}

/**
 * Common hotel room categories in the DMC world. Free text is still allowed
 * for non-standard names ("Maharaja Suite") but the dropdown covers 90% of
 * inventory and stops typos becoming three "Deluxe" rows that don't group.
 */
const HOTEL_VARIANTS = [
  'Standard',
  'Deluxe',
  'Super Deluxe',
  'Premium',
  'Executive',
  'Suite',
  'Club',
  'Cottage',
];

function AddRate({
  vendor: v,
  disabled,
  onAdd,
}: {
  vendor: VendorRow;
  disabled: boolean;
  onAdd: (body: Record<string, unknown>) => void;
}) {
  // Sensible defaults per vendor type so 90% of adds are 3 fields.
  const defaultBasis =
    v.type === 'TRANSPORT'
      ? 'PER_VEHICLE_DAY'
      : v.type === 'GUIDE'
        ? 'PER_UNIT'
        : v.type === 'ACTIVITY'
          ? 'PER_PERSON'
          : 'PER_ROOM_NIGHT';
  const isHotel = v.type === 'HOTEL' || v.type === 'CAMP' || v.type === 'HOUSEBOAT';

  const [variant, setVariant] = useState('');
  const [season, setSeason] = useState<string>('PEAK');
  const [mealPlan, setMealPlan] = useState<string>('CP');
  const [rateBasis, setRateBasis] = useState<string>(defaultBasis);
  const [netRate, setNetRate] = useState('');
  const [rackRate, setRackRate] = useState('');
  const [extraBedRate, setExtraBedRate] = useState('');
  const [childRate, setChildRate] = useState('');
  const [maxOccupancy, setMaxOccupancy] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  function submit() {
    if (!variant.trim() || !netRate) return;
    const body: Record<string, unknown> = {
      variant: variant.trim(),
      season,
      rateBasis,
      netRate: Number(netRate),
    };
    if (isHotel) body.mealPlan = mealPlan;
    if (rackRate) body.rackRate = Number(rackRate);
    if (isHotel && extraBedRate) body.extraBedRate = Number(extraBedRate);
    if (isHotel && childRate) body.childRate = Number(childRate);
    if (isHotel && maxOccupancy) body.maxOccupancy = Number(maxOccupancy);
    if (validFrom) body.validFrom = validFrom;
    if (validTo) body.validTo = validTo;
    onAdd(body);
    setVariant(''); setNetRate(''); setRackRate('');
    setExtraBedRate(''); setChildRate(''); setMaxOccupancy('');
    setValidFrom(''); setValidTo('');
  }

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="r-variant">{isHotel ? 'Room type' : 'Variant'}</Label>
        {isHotel ? (
          <Input
            id="r-variant"
            list="room-variants"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="Deluxe"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        ) : (
          <Input
            id="r-variant" value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder={v.type === 'TRANSPORT' ? 'Toyota Innova' : 'Standard'}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}
        {isHotel && (
          <datalist id="room-variants">
            {HOTEL_VARIANTS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="r-season">Season</Label>
        <Select id="r-season" value={season} onChange={(e) => setSeason(e.target.value)}>
          {SEASONS.map((s) => (
            <option key={s} value={s}>{humanise(s)}</option>
          ))}
        </Select>
      </div>
      {isHotel ? (
        <div className="space-y-1">
          <Label htmlFor="r-meal">Meal plan</Label>
          <Select id="r-meal" value={mealPlan} onChange={(e) => setMealPlan(e.target.value)}>
            {MEAL_PLANS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="r-basis">Basis</Label>
          <Select id="r-basis" value={rateBasis} onChange={(e) => setRateBasis(e.target.value)}>
            {RATE_BASES.map((b) => <option key={b} value={b}>{humanise(b)}</option>)}
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="r-net">
          {isHotel ? 'Double occupancy (₹) *' : 'Net rate (₹) *'}
        </Label>
        <Input
          id="r-net" type="number" min={0}
          value={netRate}
          onChange={(e) => setNetRate(e.target.value)}
          placeholder="6200"
          className="text-right tabular"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="r-rack">Rack rate (₹)</Label>
        <Input
          id="r-rack" type="number" min={0}
          value={rackRate}
          onChange={(e) => setRackRate(e.target.value)}
          placeholder="optional"
          className="text-right tabular"
        />
      </div>

      {isHotel && (
        <>
          <div className="space-y-1">
            <Label htmlFor="r-extra">Extra adult (₹)</Label>
            <Input
              id="r-extra" type="number" min={0}
              value={extraBedRate}
              onChange={(e) => setExtraBedRate(e.target.value)}
              placeholder="1500"
              className="text-right tabular"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r-child">Child w/bed (₹)</Label>
            <Input
              id="r-child" type="number" min={0}
              value={childRate}
              onChange={(e) => setChildRate(e.target.value)}
              placeholder="1000"
              className="text-right tabular"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="r-occ">Max occupancy</Label>
            <Input
              id="r-occ" type="number" min={1} max={10}
              value={maxOccupancy}
              onChange={(e) => setMaxOccupancy(e.target.value)}
              placeholder="3"
              className="text-right tabular"
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label htmlFor="r-from">Valid from</Label>
        <Input
          id="r-from" type="date"
          value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="r-to">Valid to</Label>
        <Input
          id="r-to" type="date"
          value={validTo} onChange={(e) => setValidTo(e.target.value)}
        />
      </div>
      <div className="flex items-end sm:col-span-4 sm:justify-end">
        <Button onClick={submit} disabled={disabled || !variant.trim() || !netRate}>
          <Plus className="size-4" strokeWidth={1.75} />
          Add rate
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Supplier ledger — every payable the CRM has raised for this vendor, plus
 * a running total. Lazy-loaded on first expand so the vendor page stays
 * fast for the majority of visits that don't need it.
 */
function LedgerPanel({ vendorId }: { vendorId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<VendorLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<VendorLedgerResponse>(`/vendors/${vendorId}/ledger`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load ledger.');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    // Fire the fetch when the operator expands the panel, not on mount —
    // most visits to a vendor page are about rates, not history.
    if (expanded && !data && !loading) load();
  }, [expanded, data, loading, load]);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <BookOpen className="size-3.5" strokeWidth={1.75} />
          Ledger
        </PanelTitle>
        <div className="flex items-center gap-2">
          {data && data.totals.outstanding > 0 && (
            <span className="tabular text-[11.5px] text-warn-500">
              {money(data.totals.outstanding)} outstanding
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? 'Hide' : 'Show'}
          </Button>
        </div>
      </PanelHeader>

      {expanded && (
        <>
          {error && (
            <p role="alert" className="px-5 py-3 text-[12.5px] text-loss-500">
              {error}
            </p>
          )}

          {loading ? (
            <div className="space-y-2 px-5 py-4">
              <div className="h-3 w-40 rounded shimmer" />
              <div className="h-3 w-64 rounded shimmer" />
              <div className="h-3 w-32 rounded shimmer" />
            </div>
          ) : data ? (
            data.totals.rowCount === 0 ? (
              <PanelBody className="py-8 text-center">
                <p className="text-[13px] text-ink-300">
                  No payables recorded for this supplier yet
                </p>
                <p className="mt-1 text-[12px] text-ink-500">
                  Costs land here when you book something priced against this
                  vendor and seed costs from the itinerary.
                </p>
              </PanelBody>
            ) : (
              <>
                {/* Totals strip */}
                <div className="grid grid-cols-3 gap-3 border-y border-ink-800 bg-ink-950/50 px-5 py-3">
                  <TotalCell
                    label="Total business"
                    value={money(data.totals.totalDue)}
                    sub={`${data.totals.rowCount} row${data.totals.rowCount === 1 ? '' : 's'}`}
                  />
                  <TotalCell
                    label="Paid to date"
                    value={money(data.totals.totalPaid)}
                    tone="healthy"
                  />
                  <TotalCell
                    label="Outstanding"
                    value={money(data.totals.outstanding)}
                    tone={data.totals.outstanding > 0 ? 'warn' : 'healthy'}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                        <th className="px-5 py-2.5 font-medium">Recorded</th>
                        <th className="px-2 py-2.5 font-medium">Booking</th>
                        <th className="px-2 py-2.5 font-medium">Description</th>
                        <th className="px-2 py-2.5 text-right font-medium">Due</th>
                        <th className="px-5 py-2.5 text-right font-medium">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => {
                        const bal = r.amountDue - r.amountPaid;
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/70"
                          >
                            <td className="tabular px-5 py-2.5 text-[12px] text-ink-500">
                              {shortDate(r.createdAt)}
                            </td>
                            <td className="px-2 py-2.5">
                              <Link
                                href={`/bookings/${r.booking.id}`}
                                className="tabular text-[12px] text-signal-600 hover:text-signal-500"
                              >
                                {r.booking.bookingNumber}
                              </Link>
                              <div className="text-[10.5px] text-ink-500">
                                {r.booking.clientName}
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-[12.5px] text-ink-300">
                              {r.description}
                              {r.reference && (
                                <div className="tabular text-[10.5px] text-ink-500">
                                  ref {r.reference}
                                </div>
                              )}
                            </td>
                            <td className="tabular px-2 py-2.5 text-right text-ink-100">
                              {money(r.amountDue)}
                            </td>
                            <td className="tabular px-5 py-2.5 text-right">
                              {bal === 0 ? (
                                <Chip className="border-healthy-500/40 text-healthy-500">
                                  Paid
                                </Chip>
                              ) : r.amountPaid > 0 ? (
                                <>
                                  <span className="text-warn-500">
                                    {money(bal)}
                                  </span>
                                  <div className="text-[10.5px] text-ink-500">
                                    of {money(r.amountDue)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-warn-500">
                                  {money(bal)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : null}
        </>
      )}
    </Panel>
  );
}

function TotalCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'healthy' | 'warn';
}) {
  const toneCls =
    tone === 'healthy'
      ? 'text-healthy-500'
      : tone === 'warn'
        ? 'text-warn-500'
        : 'text-ink-100';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.09em] text-ink-500">
        {label}
      </p>
      <p className={`tabular mt-0.5 text-[15px] font-semibold ${toneCls}`}>
        {value}
      </p>
      {sub && <p className="text-[10.5px] text-ink-500">{sub}</p>}
    </div>
  );
}
