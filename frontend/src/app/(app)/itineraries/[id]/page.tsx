'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileDown,
  Plus,
  Trash2,
  GripVertical,
  MapPin,
  Users2,
  CalendarCheck,
  Sparkles,
  TrendingUp,
  History,
  Calculator,
} from 'lucide-react';
import { RevisionsDialog } from '@/components/itineraries/revisions-dialog';
import { BedWisePricerDialog } from '@/components/bed-wise-pricer-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  api,
  ApiError,
  openBinary,
  type ItineraryDetail,
  type ItineraryDayRow,
  type ItineraryItemRow,
  type ItineraryItemKind,
  type ItineraryOptionRow,
} from '@/lib/api';
import {
  money,
  percent,
  marginHealth,
  healthText,
  shortDate,
  moneyWithCurrency,
  SupportedCurrency,
  DEFAULT_FX_RATES,
} from '@/lib/format';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { ITINERARY_ITEM_KINDS, KIND_META, humanise } from '@/lib/constants';
import { Star } from 'lucide-react';
import { RatePicker } from '@/components/rate-picker';

/**
 * Day-by-day editor.
 *   Days list on the left (sortable), selected day's items on the right
 *   (also sortable). Cover fields (title, headline, intro, inclusions,
 *   exclusions) live in the header panel above.
 *
 * Every mutation refetches — the server is the source of truth for
 * sort orders and day numbers so a two-tab concurrent edit stays coherent.
 */
export interface MlMarginAdvice {
  recommendedMarginPercent: number;
  demandIndex: number;
  surgePercentage: number;
  strategy: 'PREMIUM_SURGE' | 'OPTIMAL_STANDARD' | 'VOLUME_PROMOTIONAL';
  badge: string;
  headline: string;
  seasonTag: string;
  actionableAdvice: string;
}

export default function ItineraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [it, setIt] = useState<ItineraryDetail | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const [mlAdvice, setMlAdvice] = useState<MlMarginAdvice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [bedWiseOpen, setBedWiseOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ItineraryDetail>(`/itineraries/${id}`);
      setIt(data);
      setSelectedDayId((cur) =>
        cur && data.days.some((d) => d.id === cur)
          ? cur
          : (data.days[0]?.id ?? null),
      );
      // Preserve current active option if it still exists, otherwise pick
      // the recommended one, otherwise the first.
      setActiveOptionId((cur) => {
        if (cur && data.options.some((o) => o.id === cur)) return cur;
        const rec = data.options.find((o) => o.isRecommended) ?? data.options[0];
        return rec?.id ?? null;
      });

      // Fetch dynamic ML margin recommendation based on travel date and destination
      const travelDate = data.lead?.travelDate || data.days[0]?.date || undefined;
      const destination = data.lead?.destination || undefined;
      const q = new URLSearchParams();
      if (travelDate) q.set('date', travelDate);
      if (destination) q.set('destination', destination);
      try {
        const advice = await api.get<MlMarginAdvice>(`/ml/dynamic-margin?${q.toString()}`);
        setMlAdvice(advice);
      } catch {
        // Safe fallback if ML is unavailable
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load itinerary.');
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
        <div className="h-4 w-40 rounded shimmer" />
      </div>
    );
  }

  if (!it) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/itineraries')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Itineraries
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px] text-ink-100">{error ?? 'Not found.'}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  const selectedDay = it.days.find((d) => d.id === selectedDayId) ?? null;

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost" size="sm" className="mb-4 -ml-3"
        onClick={() => router.push('/itineraries')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Itineraries
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              {it.title}
            </h1>
            <Chip className="tabular">{it.code}</Chip>
            {it.currency && it.currency !== 'INR' && (
              <span className="rounded-full bg-brand-500/15 border border-brand-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-brand-400">
                {it.currency} (@ ₹{it.fxRate ?? (DEFAULT_FX_RATES[it.currency as SupportedCurrency] || 1)})
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-ink-400">
            for{' '}
            <Link
              href={`/leads/${it.lead.id}`}
              className="text-signal-600 transition-colors hover:text-signal-500"
            >
              {it.lead.name}
            </Link>
            <span className="tabular"> · {it.lead.phone}</span>
            {'  ·  '}
            <Users2 className="inline size-3.5" strokeWidth={1.75} /> {it.totalPax} pax
            {'  ·  '}
            {it.days.length} day{it.days.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[110px]">
            <Select
              value={it.currency || 'INR'}
              disabled={busy}
              aria-label="Quote Currency"
              onChange={(e) => {
                const c = e.target.value as SupportedCurrency;
                mutate(() =>
                  api.patch(`/itineraries/${id}`, {
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

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBedWiseOpen(true)}
            title="Calculate bed-wise rates (Adult / AwEB / CwEB / CNB)"
          >
            <Calculator className="size-4" strokeWidth={1.75} />
            Bed-Wise Calculator
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRevisionsOpen(true)}
            title="View quote version history and compare diffs"
          >
            <History className="size-4" strokeWidth={1.75} />
            Quote Revisions
          </Button>

          <Button
            variant="secondary" size="sm" disabled={busy}
            onClick={() =>
              openBinary(
                `/itineraries/${id}/pdf`,
                `Itinerary-${it.code}.pdf`,
              ).catch((e) =>
                setError(e instanceof ApiError ? e.message : 'Download failed.'),
              )
            }
          >
            <FileDown className="size-4" strokeWidth={1.75} />
            Itinerary PDF
          </Button>
          <DeactivateButton
            disabled={busy}
            label="Delete itinerary"
            confirmMessage={`Delete "${it.title}"? Days, options and pricing go with it. Any bookings already made from this itinerary are not affected.`}
            onConfirm={async () => {
              try {
                await api.del(`/itineraries/${id}`);
                router.push('/itineraries');
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Could not delete this itinerary.');
              }
            }}
          />
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      <CoverPanel it={it} busy={busy} onSave={(body) => mutate(() => api.patch(`/itineraries/${id}`, body))} />

      <TiersStrip
        options={it.options}
        activeId={activeOptionId}
        busy={busy}
        currency={it.currency}
        fxRate={it.fxRate}
        mlAdvice={mlAdvice}
        onApplyMlMargin={(optionId, margin) =>
          mutate(() => api.patch(`/itineraries/options/${optionId}`, { markupPercent: margin }))
        }
        onSelect={setActiveOptionId}
        onAdd={() =>
          mutate(async () => {
            const created: any = await api.post(`/itineraries/${id}/options`, {
              name: `Tier ${it.options.length + 1}`,
            });
            setActiveOptionId(created.id);
          })
        }
        onDuplicate={(optionId, currentName) =>
          mutate(async () => {
            const created: any = await api.post(
              `/itineraries/options/${optionId}/duplicate`,
              { name: `${currentName} copy` },
            );
            setActiveOptionId(created.id);
          })
        }
        onRename={(optionId, name) =>
          mutate(() => api.patch(`/itineraries/options/${optionId}`, { name }))
        }
        onMarkRecommended={(optionId) =>
          mutate(async () => {
            // A single recommended tier at a time — flip the current one off
            // if needed, then flip the target on.
            for (const o of it.options) {
              if (o.isRecommended && o.id !== optionId) {
                await api.patch(`/itineraries/options/${o.id}`, { isRecommended: false });
              }
            }
            await api.patch(`/itineraries/options/${optionId}`, { isRecommended: true });
          })
        }
        onDelete={(optionId) =>
          mutate(() => api.del(`/itineraries/options/${optionId}`))
        }
        onBook={(optionId, name, totalSell) => {
          if (totalSell <= 0) {
            setError('This tier has no pricing yet. Set rates on the priceable items first.');
            return;
          }
          if (
            !confirm(
              `Confirm booking for "${name}" at ${money(totalSell)}?\n\nThis freezes the price and moves the lead to Confirmed.`,
            )
          )
            return;
          mutate(async () => {
            const booking: any = await api.post('/bookings', {
              itineraryOptionId: optionId,
            });
            router.push(`/bookings/${booking.id}`);
          });
        }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <DayList
          days={it.days}
          selectedId={selectedDayId}
          busy={busy}
          onSelect={setSelectedDayId}
          onAdd={() =>
            mutate(async () => {
              const created: any = await api.post(`/itineraries/${id}/days`, {});
              setSelectedDayId(created.id);
            })
          }
          onReorder={(ids) => mutate(() => api.post(`/itineraries/${id}/days/reorder`, { ids }))}
          onDelete={(dayId) => mutate(() => api.del(`/itineraries/days/${dayId}`))}
        />

        {selectedDay ? (
          <DayEditor
            key={selectedDay.id}
            day={selectedDay}
            activeOptionId={activeOptionId}
            busy={busy}
            onSaveDay={(body) => mutate(() => api.patch(`/itineraries/days/${selectedDay.id}`, body))}
            onAddItem={(body) => mutate(() => api.post(`/itineraries/days/${selectedDay.id}/items`, body))}
            onSaveItem={(itemId, body) => mutate(() => api.patch(`/itineraries/items/${itemId}`, body))}
            onDeleteItem={(itemId) => mutate(() => api.del(`/itineraries/items/${itemId}`))}
            onReorderItems={(ids) => mutate(() => api.post(`/itineraries/days/${selectedDay.id}/items/reorder`, { ids }))}
            onPriceItem={(itemId, body) =>
              mutate(() =>
                api.post(
                  `/itineraries/items/${itemId}/pricing/${activeOptionId}`,
                  body,
                ),
              )
            }
          />
        ) : (
          <Panel>
            <PanelBody className="py-14 text-center">
              <p className="text-[13px] text-ink-300">No days yet</p>
              <p className="mt-1 text-[12px] text-ink-500">
                Add the first day on the left to start planning.
              </p>
            </PanelBody>
          </Panel>
        )}
      </div>

      <RevisionsDialog
        itineraryId={id}
        open={revisionsOpen}
        onClose={() => setRevisionsOpen(false)}
        onRestored={load}
      />

      <BedWisePricerDialog
        open={bedWiseOpen}
        onClose={() => setBedWiseOpen(false)}
        initialNights={it.days.length || 5}
        initialPax={it.totalPax || 4}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CoverPanel({
  it,
  busy,
  onSave,
}: {
  it: ItineraryDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(it.title);
  const [headline, setHeadline] = useState(it.headline ?? '');
  const [intro, setIntro] = useState(it.intro ?? '');
  const [totalPax, setTotalPax] = useState(String(it.totalPax));
  const [inclusions, setInclusions] = useState(it.inclusions ?? '');
  const [exclusions, setExclusions] = useState(it.exclusions ?? '');
  useEffect(() => {
    setTitle(it.title);
    setHeadline(it.headline ?? '');
    setIntro(it.intro ?? '');
    setTotalPax(String(it.totalPax));
    setInclusions(it.inclusions ?? '');
    setExclusions(it.exclusions ?? '');
  }, [it]);

  const dirty =
    title !== it.title ||
    headline !== (it.headline ?? '') ||
    intro !== (it.intro ?? '') ||
    Number(totalPax) !== it.totalPax ||
    inclusions !== (it.inclusions ?? '') ||
    exclusions !== (it.exclusions ?? '');

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Cover</PanelTitle>
        {dirty && (
          <Button
            size="sm" disabled={busy}
            onClick={() =>
              onSave({
                title, headline: headline || null, intro: intro || null,
                totalPax: Number(totalPax) || 1,
                inclusions: inclusions || null, exclusions: exclusions || null,
              })
            }
          >
            Save cover
          </Button>
        )}
      </PanelHeader>
      <PanelBody className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Headline (client sees this under the title)</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="A honeymoon between the Nubra dunes and Pangong Tso"
          />
        </div>
        <div className="space-y-1">
          <Label>Pax</Label>
          <Input
            type="number" min={1}
            value={totalPax}
            onChange={(e) => setTotalPax(e.target.value)}
            className="text-right tabular"
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label>Intro paragraph</Label>
          <Textarea
            rows={3} value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="A short intro shown at the top of the itinerary."
          />
        </div>
        <div className="space-y-1">
          <Label>What&rsquo;s included (one per line)</Label>
          <Textarea
            rows={4} value={inclusions}
            onChange={(e) => setInclusions(e.target.value)}
            placeholder="Accommodation on twin-sharing&#10;Airport pickup and drop&#10;Daily breakfast"
          />
        </div>
        <div className="space-y-1">
          <Label>Not included (one per line)</Label>
          <Textarea
            rows={4} value={exclusions}
            onChange={(e) => setExclusions(e.target.value)}
            placeholder="Airfare&#10;Personal expenses&#10;GST on services"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function DayList({
  days,
  selectedId,
  busy,
  onSelect,
  onAdd,
  onReorder,
  onDelete,
}: {
  days: ItineraryDayRow[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (ids: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = days.findIndex((d) => d.id === e.active.id);
    const newIndex = days.findIndex((d) => d.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(days, oldIndex, newIndex).map((d) => d.id));
  }

  return (
    <Panel className="self-start">
      <PanelHeader>
        <PanelTitle>Days</PanelTitle>
        <Button size="sm" onClick={onAdd} disabled={busy}>
          <Plus className="size-4" strokeWidth={1.75} />
          Add
        </Button>
      </PanelHeader>

      {days.length === 0 ? (
        <PanelBody className="py-6 text-center">
          <p className="text-[12.5px] text-ink-500">No days yet.</p>
        </PanelBody>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={days.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-ink-800/60">
              {days.map((d) => (
                <SortableDay
                  key={d.id}
                  day={d}
                  selected={d.id === selectedId}
                  busy={busy}
                  onSelect={() => onSelect(d.id)}
                  onDelete={() => {
                    if (confirm(`Delete Day ${d.dayNumber}?`)) onDelete(d.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Panel>
  );
}

function SortableDay({
  day,
  selected,
  busy,
  onSelect,
  onDelete,
}: {
  day: ItineraryDayRow;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: day.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 px-2 py-2 transition-colors ${
        selected ? 'bg-signal-600/8' : 'hover:bg-ink-850'
      }`}
    >
      <button
        {...attributes} {...listeners}
        aria-label="Reorder day"
        className="cursor-grab touch-none p-1 text-ink-500 active:cursor-grabbing hover:text-ink-200"
      >
        <GripVertical className="size-3.5" strokeWidth={1.75} />
      </button>
      <button
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <p className={`text-[13px] ${selected ? 'font-medium text-signal-600' : 'text-ink-100'}`}>
          Day {day.dayNumber}
          {day.city && <span className="text-ink-500"> · {day.city}</span>}
        </p>
        <p className="truncate text-[11.5px] text-ink-500">
          {day.headline ?? (day.date ? shortDate(day.date) : 'Untitled')}
          {' · '}
          {day.items.length} item{day.items.length === 1 ? '' : 's'}
        </p>
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        aria-label="Delete day"
        className="rounded p-1 text-ink-500 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-ink-850 hover:text-loss-500"
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */

function DayEditor({
  day,
  activeOptionId,
  busy,
  onSaveDay,
  onAddItem,
  onSaveItem,
  onDeleteItem,
  onReorderItems,
  onPriceItem,
}: {
  day: ItineraryDayRow;
  activeOptionId: string | null;
  busy: boolean;
  onSaveDay: (body: Record<string, unknown>) => void;
  onAddItem: (body: Record<string, unknown>) => void;
  onSaveItem: (itemId: string, body: Record<string, unknown>) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItems: (ids: string[]) => void;
  onPriceItem: (itemId: string, body: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <DayHeaderPanel day={day} busy={busy} onSave={onSaveDay} />
      <ItemsPanel
        day={day}
        activeOptionId={activeOptionId}
        busy={busy}
        onAdd={onAddItem}
        onSave={onSaveItem}
        onDelete={onDeleteItem}
        onReorder={onReorderItems}
        onPrice={onPriceItem}
      />
    </div>
  );
}

function DayHeaderPanel({
  day,
  busy,
  onSave,
}: {
  day: ItineraryDayRow;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [city, setCity] = useState(day.city ?? '');
  const [headline, setHeadline] = useState(day.headline ?? '');
  const [summary, setSummary] = useState(day.summary ?? '');
  const [date, setDate] = useState(day.date ? day.date.slice(0, 10) : '');
  useEffect(() => {
    setCity(day.city ?? '');
    setHeadline(day.headline ?? '');
    setSummary(day.summary ?? '');
    setDate(day.date ? day.date.slice(0, 10) : '');
  }, [day]);

  const dirty =
    city !== (day.city ?? '') ||
    headline !== (day.headline ?? '') ||
    summary !== (day.summary ?? '') ||
    date !== (day.date ? day.date.slice(0, 10) : '');

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Day {day.dayNumber}</PanelTitle>
        {dirty && (
          <Button
            size="sm" disabled={busy}
            onClick={() => onSave({
              city: city || null,
              headline: headline || null,
              summary: summary || null,
              date: date || null,
            })}
          >
            Save
          </Button>
        )}
      </PanelHeader>
      <PanelBody className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Leh" />
        </div>
        <div className="md:col-span-2 space-y-1">
          <Label>Headline</Label>
          <Input
            value={headline} onChange={(e) => setHeadline(e.target.value)}
            placeholder="Arrive Leh · acclimatisation afternoon"
          />
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="md:col-span-3 space-y-1">
          <Label>Summary (optional)</Label>
          <Textarea
            rows={2} value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A short paragraph about this day."
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function ItemsPanel({
  day,
  activeOptionId,
  busy,
  onAdd,
  onSave,
  onDelete,
  onReorder,
  onPrice,
}: {
  day: ItineraryDayRow;
  activeOptionId: string | null;
  busy: boolean;
  onAdd: (body: Record<string, unknown>) => void;
  onSave: (itemId: string, body: Record<string, unknown>) => void;
  onDelete: (itemId: string) => void;
  onReorder: (ids: string[]) => void;
  onPrice: (itemId: string, body: Record<string, unknown>) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = day.items.findIndex((i) => i.id === e.active.id);
    const newIndex = day.items.findIndex((i) => i.id === e.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(day.items, oldIndex, newIndex).map((i) => i.id));
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Plan</PanelTitle>
        <span className="tabular text-[11px] text-ink-500">{day.items.length} item{day.items.length === 1 ? '' : 's'}</span>
      </PanelHeader>

      {day.items.length === 0 ? (
        <PanelBody className="py-6 text-center text-[12.5px] text-ink-500">
          Add the first activity below.
        </PanelBody>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-ink-800/60">
              {day.items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  activeOptionId={activeOptionId}
                  busy={busy}
                  onSave={(body) => onSave(item.id, body)}
                  onDelete={() => onDelete(item.id)}
                  onPrice={(body) => onPrice(item.id, body)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="border-t border-ink-800 p-4">
        <AddItem disabled={busy} onAdd={onAdd} />
      </div>
    </Panel>
  );
}

function SortableItem({
  item,
  activeOptionId,
  busy,
  onSave,
  onDelete,
  onPrice,
}: {
  item: ItineraryItemRow;
  activeOptionId: string | null;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: () => void;
  onPrice: (body: Record<string, unknown>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const [editing, setEditing] = useState(false);
  const kind = KIND_META[item.kind];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 px-4 py-3 hover:bg-ink-850/60"
    >
      <button
        {...attributes} {...listeners}
        aria-label="Reorder item"
        className="mt-0.5 cursor-grab touch-none p-1 text-ink-500 active:cursor-grabbing hover:text-ink-200"
      >
        <GripVertical className="size-3.5" strokeWidth={1.75} />
      </button>

      <span
        className={`mt-1 rounded px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.09em] text-white ${kind.tone}`}
      >
        {kind.short}
      </span>

      {editing ? (
        <ItemEditor
          item={item}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={(body) => { onSave(body); setEditing(false); }}
        />
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-ink-100">
              {item.time && (
                <span className="tabular mr-2 text-[11px] text-ink-500">{item.time}</span>
              )}
              {item.title}
              {item.priceable && item.kind === 'STAY' && (
                <span className="tabular ml-2 text-[10.5px] text-ink-500">
                  {item.quantity} × {item.units}N
                </span>
              )}
              {item.priceable && item.kind === 'TRANSFER' && (
                <span className="tabular ml-2 text-[10.5px] text-ink-500">
                  {item.quantity} × {item.units}D
                </span>
              )}
            </p>
            {item.location && (
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-500">
                <MapPin className="size-3" strokeWidth={1.75} /> {item.location}
              </p>
            )}
            {item.description && (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                {item.description}
              </p>
            )}
          </div>

          {item.priceable && activeOptionId && (
            <PriceCell
              item={item}
              activeOptionId={activeOptionId}
              busy={busy}
              onPrice={onPrice}
            />
          )}

          <button
            onClick={() => setEditing(true)}
            className="rounded px-1.5 py-1 text-[11px] text-ink-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-signal-600"
          >
            Edit
          </button>
          <button
            onClick={() => { if (confirm(`Remove "${item.title}"?`)) onDelete(); }}
            disabled={busy}
            aria-label={`Remove ${item.title}`}
            className="rounded p-1 text-ink-500 opacity-0 transition-[opacity,color,background-color] group-hover:opacity-100 hover:bg-ink-850 hover:text-loss-500"
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        </>
      )}
    </li>
  );
}

function ItemEditor({
  item,
  busy,
  onCancel,
  onSave,
}: {
  item: ItineraryItemRow;
  busy: boolean;
  onCancel: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [kind, setKind] = useState<ItineraryItemKind>(item.kind);
  const [title, setTitle] = useState(item.title);
  const [time, setTime] = useState(item.time ?? '');
  const [description, setDescription] = useState(item.description ?? '');
  const [location, setLocation] = useState(item.location ?? '');

  return (
    <div className="flex-1 space-y-2">
      <div className="grid gap-2 sm:grid-cols-[112px_120px_1fr]">
        <Select value={kind} onChange={(e) => setKind(e.target.value as ItineraryItemKind)}>
          {ITINERARY_ITEM_KINDS.map((k) => (
            <option key={k} value={k}>{KIND_META[k].label}</option>
          ))}
        </Select>
        <Input
          value={time} onChange={(e) => setTime(e.target.value)}
          placeholder="09:00 or Morning"
        />
        <Input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
      </div>
      <Input
        value={location} onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
      />
      <Textarea
        rows={2}
        value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Details for the client"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm" disabled={busy || !title.trim()}
          onClick={() =>
            onSave({
              kind,
              title: title.trim(),
              time: time.trim() || null,
              description: description.trim() || null,
              location: location.trim() || null,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function AddItem({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (body: Record<string, unknown>) => void;
}) {
  const [kind, setKind] = useState<ItineraryItemKind>('SIGHTSEEING');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  function submit() {
    if (!title.trim()) return;
    onAdd({
      kind,
      title: title.trim(),
      time: time.trim() || null,
    });
    setTitle('');
    setTime('');
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-[128px] space-y-1">
        <Label>Kind</Label>
        <Select value={kind} onChange={(e) => setKind(e.target.value as ItineraryItemKind)}>
          {ITINERARY_ITEM_KINDS.map((k) => (
            <option key={k} value={k}>{humanise(k)}</option>
          ))}
        </Select>
      </div>
      <div className="w-[120px] space-y-1">
        <Label>Time</Label>
        <Input
          value={time} onChange={(e) => setTime(e.target.value)}
          placeholder="Morning"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <div className="min-w-[220px] flex-1 space-y-1">
        <Label>Title</Label>
        <Input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Sunset at Shanti Stupa"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      <Button onClick={submit} disabled={disabled || !title.trim()}>
        <Plus className="size-4" strokeWidth={1.75} />
        Add item
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Tier strip: pick which option's prices you're editing, add/duplicate/
 * delete tiers, mark one recommended. Compact so it sits above the days
 * grid without pushing content down.
 */
function TiersStrip({
  options,
  activeId,
  busy,
  onSelect,
  onAdd,
  onDuplicate,
  onRename,
  onMarkRecommended,
  onDelete,
  onBook,
  mlAdvice,
  onApplyMlMargin,
  currency = 'INR',
  fxRate = 1.0,
}: {
  options: ItineraryOptionRow[];
  activeId: string | null;
  busy: boolean;
  mlAdvice?: MlMarginAdvice | null;
  onApplyMlMargin?: (optionId: string, margin: number) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string, currentName: string) => void;
  onRename: (id: string, name: string) => void;
  onMarkRecommended: (id: string) => void;
  onDelete: (id: string) => void;
  onBook: (id: string, name: string, totalSell: number) => void;
  currency?: string;
  fxRate?: number;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  const activeOption = options.find((o) => o.id === activeId) ?? null;

  return (
    <div className="mt-4 space-y-2.5">
      {mlAdvice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-2.5 py-0.5 font-semibold text-brand-300">
              <TrendingUp className="size-3.5 text-brand-400" />
              {mlAdvice.badge}
            </span>
            <span className="text-ink-200">
              <strong>{mlAdvice.seasonTag}</strong> · Demand Index: <strong>{mlAdvice.demandIndex}x</strong>
            </span>
            <span className="hidden text-ink-400 sm:inline">|</span>
            <span className="text-ink-300">
              ML Target Margin: <strong className="text-brand-300">{mlAdvice.recommendedMarginPercent}%</strong>
            </span>
          </div>

          {activeOption && onApplyMlMargin && (
            <div className="flex items-center gap-3">
              <span className="text-[11.5px] text-ink-400">
                Current {activeOption.name} Margin:{' '}
                <strong>{activeOption.marginPercent !== null ? `${Math.round(activeOption.marginPercent)}%` : 'Default'}</strong>
              </span>
              <button
                type="button"
                onClick={() => onApplyMlMargin(activeOption.id, mlAdvice.recommendedMarginPercent)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[11.5px] font-semibold text-ink-950 shadow-sm transition-all hover:bg-brand-400 disabled:opacity-50"
              >
                <Sparkles className="size-3" />
                Apply {mlAdvice.recommendedMarginPercent}% Margin
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-2">
      {options
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((o) => {
          const active = o.id === activeId;
          const health = marginHealth(o.marginPercent);
          const isRenaming = renamingId === o.id;

          return (
            <div
              key={o.id}
              onClick={() => !isRenaming && onSelect(o.id)}
              className={`group relative min-w-[180px] cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200 ${
                active
                  ? 'border-signal-500/35 bg-ink-900 shadow-[0_2px_10px_-4px_rgba(11,74,90,0.2)]'
                  : 'border-ink-800 bg-ink-900/80 hover:-translate-y-px hover:border-ink-700'
              }`}
            >
              {o.isRecommended && (
                <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-950">
                  <Star className="size-2.5" fill="currentColor" strokeWidth={0} />
                  Recommended
                </span>
              )}

              {isRenaming ? (
                <Input
                  autoFocus
                  className="h-7"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
              ) : (
                <p
                  className={`text-[13px] font-medium ${active ? 'text-signal-600' : 'text-ink-100'}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(o.id);
                    setRenameValue(o.name);
                  }}
                >
                  {o.name}
                </p>
              )}

              {o.totalSell > 0 ? (
                <>
                  <p className="tabular mt-1 text-[17px] font-semibold text-ink-100">
                    {money(o.totalSell)}
                  </p>
                  {currency && currency !== 'INR' && (
                    <p className="tabular text-[12px] font-semibold text-brand-400">
                      {moneyWithCurrency(o.totalSell, currency, fxRate)}
                    </p>
                  )}
                  <p className="tabular mt-0.5 text-[11px]">
                    <span className={healthText[health]}>
                      {percent(o.marginPercent)}
                    </span>
                    <span className="text-ink-500"> margin</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[11.5px] text-ink-500">Not priced yet</p>
              )}

              {/* per-tier menu */}
              <div className="mt-2 flex flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {o.totalSell > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onBook(o.id, o.name, o.totalSell); }}
                    className="flex items-center gap-1 rounded bg-signal-600/10 px-1.5 py-1 text-[10px] font-medium uppercase tracking-[0.09em] text-signal-600 hover:bg-signal-600 hover:text-ink-950"
                    disabled={busy}
                    title="Confirm booking with this tier's price"
                  >
                    <CalendarCheck className="size-3" strokeWidth={1.75} />
                    Book
                  </button>
                )}
                {!o.isRecommended && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkRecommended(o.id); }}
                    className="rounded p-1 text-ink-500 hover:bg-ink-850 hover:text-brand-500"
                    aria-label="Mark recommended"
                    disabled={busy}
                  >
                    <Star className="size-3" strokeWidth={1.75} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(o.id, o.name); }}
                  className="rounded px-1.5 py-1 text-[10px] uppercase tracking-[0.09em] text-ink-500 hover:bg-ink-850 hover:text-ink-200"
                  disabled={busy}
                >
                  Duplicate
                </button>
                {options.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete tier "${o.name}"?`)) onDelete(o.id);
                    }}
                    className="rounded p-1 text-ink-500 hover:bg-ink-850 hover:text-loss-500"
                    aria-label="Delete tier"
                    disabled={busy}
                  >
                    <Trash2 className="size-3" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

      <button
        onClick={onAdd}
        disabled={busy}
        className="min-w-[150px] rounded-xl border border-dashed border-ink-700 px-4 py-3 text-[13px] text-ink-500 transition-colors duration-150 hover:border-ink-600 hover:text-ink-300"
      >
        <Plus className="mr-1.5 inline size-4" strokeWidth={1.75} />
        Add tier
      </button>
      </div>
    </div>
  );
}

/**
 * Per-item, per-tier price cell. Compact: shows the sell amount when priced,
 * and an inline unit-net editor when clicked. Manual net-cost entry only for
 * now — the RatePicker upgrade for choosing stored vendor rates lands in a
 * follow-up pass.
 */
function PriceCell({
  item,
  activeOptionId,
  busy,
  onPrice,
}: {
  item: ItineraryItemRow;
  activeOptionId: string;
  busy: boolean;
  onPrice: (body: Record<string, unknown>) => void;
}) {
  const pricing = (item.pricing ?? []).find((p) => p.optionId === activeOptionId);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pricing ? String(pricing.unitNet) : '');
  useEffect(() => {
    setValue(pricing ? String(pricing.unitNet) : '');
  }, [pricing]);

  function commit() {
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) onPrice({ unitNet: n });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-ink-500">₹</span>
        <Input
          type="number" min={0} autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="h-7 w-[100px] text-right tabular"
        />
      </div>
    );
  }

  // Reusable rate-picker trigger — same in both empty and priced states.
  const pickRate = (
    <RatePicker
      simple
      triggerLabel={pricing ? 'Change rate' : 'Pick rate'}
      onPick={async (rateId: string) => {
        await Promise.resolve(onPrice({ vendorRateId: rateId }));
      }}
    />
  );

  if (!pricing) {
    return (
      <div className="flex items-center gap-1">
        {pickRate}
        <button
          onClick={() => setEditing(true)}
          disabled={busy}
          className="rounded border border-dashed border-ink-700 px-2 py-1 text-[11px] text-ink-500 hover:border-signal-500/35 hover:text-signal-600"
        >
          Set manually
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {pickRate}
      <button
        onClick={() => setEditing(true)}
        disabled={busy}
        className="text-right"
        title={`Net ${pricing.lineNet} · Sell ${pricing.lineSell}`}
      >
        <p className="tabular text-[13px] font-semibold text-ink-100">
          {money(pricing.lineSell)}
        </p>
        <p className="tabular text-[10.5px] text-ink-500">
          net {money(pricing.lineNet)}
        </p>
      </button>
    </div>
  );
}
