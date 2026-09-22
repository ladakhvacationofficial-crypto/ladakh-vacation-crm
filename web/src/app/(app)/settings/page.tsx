'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Sliders, TrendingUp, ShieldCheck, Calculator, Users } from 'lucide-react';
import { api, ApiError, type PricingSettings } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { money, percent } from '@/lib/format';
import { RoutingSettingsPanel } from './routing-settings-panel';

/**
 * Commercial policy — the numbers that shape every quotation. Split into
 * three blocks:
 *   1. Global defaults (round-to, GST, currency)
 *   2. Margin floor + break-even inputs
 *   3. Per-service-type markup overrides
 */

interface Draft extends PricingSettings {
  hotelMarkupPercent?: number | null;
  transportMarkupPercent?: number | null;
  activityMarkupPercent?: number | null;
  flightMarkupPercent?: number | null;
  guideMarkupPercent?: number | null;
  mealMarkupPercent?: number | null;
  permitMarkupPercent?: number | null;
  miscMarkupPercent?: number | null;
}

const SERVICES: { key: keyof Draft; label: string }[] = [
  { key: 'hotelMarkupPercent',     label: 'Hotels' },
  { key: 'transportMarkupPercent', label: 'Transport' },
  { key: 'activityMarkupPercent',  label: 'Activities' },
  { key: 'flightMarkupPercent',    label: 'Flights' },
  { key: 'guideMarkupPercent',     label: 'Guides' },
  { key: 'mealMarkupPercent',      label: 'Meals' },
  { key: 'permitMarkupPercent',    label: 'Permits' },
  { key: 'miscMarkupPercent',      label: 'Misc' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<'commercial' | 'routing'>('commercial');
  const [server, setServer] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.get<Draft>('/settings/pricing');
      setServer(s);
      setDraft(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setSaved(false);
  }

  const dirty =
    !!draft && !!server && JSON.stringify(draft) !== JSON.stringify(server);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {};
      for (const k of Object.keys(draft) as (keyof Draft)[]) {
        if (JSON.stringify(draft[k]) !== JSON.stringify(server?.[k])) {
          patch[k as string] = draft[k];
        }
      }
      await api.patch('/settings/pricing', patch);
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="h-4 w-40 rounded shimmer" />
      </div>
    );
  }

  const exampleCost = 10000;
  const exampleSell = Math.round(exampleCost * (1 + draft.defaultMarkupPercent / 100));
  const exampleMargin = exampleSell - exampleCost;
  const exampleMarginPct =
    exampleSell > 0 ? (exampleMargin / exampleSell) * 100 : 0;
  const breakEven =
    draft.monthlyOverhead && draft.filesPerMonth && draft.filesPerMonth > 0
      ? Math.round(draft.monthlyOverhead / draft.filesPerMonth)
      : null;

  return (
    <div className="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Settings
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Commercial policies, quotation markups, and automated lead routing rules.
          </p>
        </div>
        {tab === 'commercial' && (
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[12px] text-healthy-500">Saved.</span>
            )}
            <Button
              disabled={busy || !dirty}
              onClick={save}
            >
              <Save className="size-4" strokeWidth={1.75} />
              Save changes
            </Button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-ink-800 gap-6 text-[13.5px]">
        <button
          onClick={() => setTab('commercial')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            tab === 'commercial'
              ? 'border-signal-500 text-signal-400'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Sliders className="size-4" />
          Commercial & Pricing
        </button>

        <button
          onClick={() => setTab('routing')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            tab === 'routing'
              ? 'border-signal-500 text-signal-400'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          <Users className="size-4" />
          Lead Auto-Assignment & Routing
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      {tab === 'routing' ? (
        <RoutingSettingsPanel />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {/* Global defaults */}
            <Panel>
              <PanelHeader>
                <PanelTitle className="flex items-center gap-2">
                  <Sliders className="size-3.5" strokeWidth={1.75} />
                  Global Defaults
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Default markup %" hint="Fallback when no service-type override applies">
                  <NumberInput
                    value={draft.defaultMarkupPercent}
                    onChange={(v) => set('defaultMarkupPercent', v)}
                    step={0.5} min={0} max={500}
                  />
                </Field>
                <Field label="Round sell prices to (₹)" hint="0 = no rounding">
                  <NumberInput
                    value={draft.roundTo}
                    onChange={(v) => set('roundTo', v)}
                    step={1} min={0}
                  />
                </Field>
                <Field label="GST %" hint="Shown on client-facing invoices">
                  <NumberInput
                    value={draft.gstPercent}
                    onChange={(v) => set('gstPercent', v)}
                    step={0.5} min={0} max={100}
                  />
                </Field>
                <Field label="Currency" hint="Three-letter code">
                  <Input
                    value={draft.currency}
                    onChange={(e) => set('currency', e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </Field>
              </PanelBody>
            </Panel>

            {/* Margin floor + break-even */}
            <Panel>
              <PanelHeader>
                <PanelTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                  Margin Floor & Break-even
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="space-y-4">
                <Field label="Minimum margin %" hint="Warnings fire on any tier below this">
                  <NumberInput
                    value={draft.minMarginPercent}
                    onChange={(v) => set('minMarginPercent', v)}
                    step={0.5} min={0} max={95}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monthly overhead (₹)" hint="Salaries + rent + tools + fees">
                    <NumberInput
                      value={draft.monthlyOverhead ?? 0}
                      onChange={(v) => set('monthlyOverhead', v || null)}
                      step={500} min={0}
                    />
                  </Field>
                  <Field label="Files per month" hint="Typical monthly file volume">
                    <NumberInput
                      value={draft.filesPerMonth ?? 0}
                      onChange={(v) => set('filesPerMonth', v || null)}
                      step={1} min={0}
                    />
                  </Field>
                </div>
                {breakEven !== null && (
                  <p className="rounded-md border border-signal-500/20 bg-signal-500/[0.04] px-3 py-2 text-[12px] text-signal-500">
                    Break-even overhead ≈ <span className="tabular font-semibold">{money(breakEven)}</span> per file.
                    Quote below this and the file loses money once overheads are counted.
                  </p>
                )}
              </PanelBody>
            </Panel>

            {/* Per-service overrides */}
            <Panel>
              <PanelHeader>
                <PanelTitle className="flex items-center gap-2">
                  <TrendingUp className="size-3.5" strokeWidth={1.75} />
                  Per-Service Markup Overrides
                </PanelTitle>
                <span className="text-[11px] text-ink-500">
                  Leave blank to inherit {draft.defaultMarkupPercent}%
                </span>
              </PanelHeader>
              <PanelBody className="grid gap-4 sm:grid-cols-2">
                {SERVICES.map(({ key, label }) => (
                  <Field key={key} label={`${label} markup %`}>
                    <NumberInput
                      value={(draft[key] as number | null | undefined) ?? undefined}
                      onChange={(v) => set(key as keyof Draft, (v === 0 || v ? v : null) as any)}
                      step={0.5} min={0} max={500}
                      placeholder={`Auto (${draft.defaultMarkupPercent}%)`}
                    />
                  </Field>
                ))}
              </PanelBody>
            </Panel>
          </div>

          {/* Right rail — live example */}
          <div className="space-y-4">
            <Panel>
              <PanelHeader>
                <PanelTitle className="flex items-center gap-2">
                  <Calculator className="size-3.5" strokeWidth={1.75} />
                  Live Quote Effect
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="space-y-3 text-[13px]">
                <p className="text-[12px] text-ink-500">
                  Worked example against a hypothetical ₹10,000 cost:
                </p>
                <ExampleRow label="Cost"           value={money(exampleCost)} />
                <ExampleRow label="Sell (default)" value={money(exampleSell)} strong />
                <ExampleRow label="Margin"         value={money(exampleMargin)} />
                <ExampleRow
                  label="Margin %"
                  value={percent(exampleMarginPct)}
                  tone={
                    exampleMarginPct >= draft.minMarginPercent
                      ? 'healthy' : 'warn'
                  }
                />
                <p className="border-t border-ink-800 pt-3 text-[11.5px] text-ink-500">
                  Every draft quotation re-prices when you save — this is not a
                  one-time snapshot.
                </p>
              </PanelBody>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- primitives ------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value === undefined ? '' : String(value));
  useEffect(() => setLocal(value === undefined ? '' : String(value)), [value]);
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      className="text-right tabular"
    />
  );
}

function ExampleRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'healthy' | 'warn';
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-ink-400">{label}</span>
      <span
        className={`tabular ${strong ? 'text-[15px] font-semibold' : ''} ${
          tone === 'healthy' ? 'text-healthy-500' :
          tone === 'warn'    ? 'text-warn-500'    :
          'text-ink-100'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
