'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { api, type VendorRateRow } from '@/lib/api';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { money } from '@/lib/format';
import { humanise } from '@/lib/constants';

const SEASONS = ['PEAK', 'SHOULDER', 'OFF', 'FESTIVE'];
const TYPES = ['HOTEL', 'CAMP', 'HOUSEBOAT', 'TRANSPORT', 'GUIDE', 'ACTIVITY'];

/**
 * Pulls a stored supplier rate. Two shapes:
 *   1. Default (quote lines): also captures quantity + units at insert time,
 *      because "2 rooms x 3 nights" is the actual unit of thought.
 *   2. `simple` mode (itinerary pricing): qty + units already live on the
 *      ItineraryItem, so we just return the rate id and let the parent's
 *      structural values drive the math.
 *
 * The trigger button label and the callback signature switch based on mode.
 */
type FullPick = (rateId: string, quantity: number, units: number) => Promise<void>;
type SimplePick = (rateId: string) => Promise<void>;

interface RatePickerProps {
  triggerLabel?: string;
  onPick: FullPick;
}
interface SimpleRatePickerProps {
  simple: true;
  triggerLabel?: string;
  onPick: SimplePick;
}

export function RatePicker(props: RatePickerProps | SimpleRatePickerProps) {
  const simple = 'simple' in props && props.simple;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<VendorRateRow[]>([]);
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [season, setSeason] = useState('PEAK');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qty, setQty] = useState('1');
  const [units, setUnits] = useState('1');

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (type) params.set('type', type);
    if (season) params.set('season', season);
    try {
      const res = await api.get<VendorRateRow[]>(
        `/vendors/rates/search?${params}`,
      );
      setRows(res);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [city, type, season]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(search, city ? 260 : 0);
    return () => clearTimeout(t);
  }, [open, search, city]);

  async function pick(rate: VendorRateRow) {
    setBusyId(rate.id);
    try {
      if (simple) {
        await (props.onPick as SimplePick)(rate.id);
      } else {
        await (props.onPick as FullPick)(
          rate.id,
          Number(qty) || 1,
          Number(units) || 1,
        );
      }
      setOpen(false);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="size-4" strokeWidth={1.75} />
          {props.triggerLabel ?? (simple ? 'Pick rate' : 'From supplier rates')}
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Supplier rates"
        description={
          simple
            ? 'Net cost is copied from the picked rate. Quantity × units come from the item itself.'
            : 'Net costs from your rate book. Quantity x units is applied on insert.'
        }
      >
        <div className="border-b border-ink-800 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search
                aria-hidden
                strokeWidth={1.75}
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
              />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="pl-8"
                aria-label="Filter by city"
              />
            </div>
            <div className="w-[136px]">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Supplier type"
              >
                <option value="">All types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanise(t)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[124px]">
              <Select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                aria-label="Season"
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {!simple && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-ink-500">
                Insert as
              </span>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-8 w-16 text-center"
                aria-label="Quantity, e.g. rooms"
              />
              <span className="text-[12px] text-ink-500">rooms/units ×</span>
              <Input
                type="number"
                min={1}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="h-8 w-16 text-center"
                aria-label="Units, e.g. nights"
              />
              <span className="text-[12px] text-ink-500">nights/days</span>
            </div>
          )}
        </div>

        <div className="max-h-[46vh] overflow-y-auto">
          {loading ? (
            <p className="px-5 py-8 text-center text-[13px] text-ink-500">
              Searching…
            </p>
          ) : rows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-ink-300">No rates found</p>
              <p className="mt-1 text-[12px] text-ink-500">
                Add suppliers and their seasonal rates first, or widen the filters.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-800/60">
              {rows.map((rate) => (
                <li
                  key={rate.id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-850"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink-100">
                      {rate.vendor.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                      <span>{rate.variant}</span>
                      {rate.mealPlan && <Chip>{rate.mealPlan}</Chip>}
                      <Chip>{humanise(rate.season)}</Chip>
                      {rate.vendor.city && <span>· {rate.vendor.city}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[13px] text-ink-100">
                      {money(rate.netRate)}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-ink-600">
                      net
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={busyId === rate.id}
                    onClick={() => pick(rate)}
                  >
                    {busyId === rate.id ? 'Adding…' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
