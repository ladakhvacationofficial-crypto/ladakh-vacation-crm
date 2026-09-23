'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plug,
  Plus,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Pencil,
  Zap,
} from 'lucide-react';
import {
  api,
  ApiError,
  type IntegrationCategory,
  type IntegrationRow,
  type IntegrationTestResponse,
  type ProviderCatalogEntry,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { IntegrationDialog } from '@/components/integration-dialog';
import { relativeDate } from '@/lib/format';

/**
 * One page, five tabs: payments (domestic and international share a tab), AI,
 * ads, search and analytics, social. Each tab lists configured rows and offers
 * the catalog of providers not yet added.
 */

type Tab = 'PAYMENTS' | 'AI' | 'ADS' | 'ANALYTICS' | 'SOCIAL';

const TAB_LABELS: Record<Tab, string> = {
  PAYMENTS: 'Payments',
  AI: 'AI models',
  ADS: 'Ads platforms',
  ANALYTICS: 'Search & analytics',
  SOCIAL: 'Social media',
};

const TAB_CATEGORIES: Record<Tab, IntegrationCategory[]> = {
  PAYMENTS: ['PAYMENT_DOMESTIC', 'PAYMENT_INTERNATIONAL'],
  AI: ['AI'],
  ADS: ['ADS'],
  ANALYTICS: ['ANALYTICS'],
  SOCIAL: ['SOCIAL'],
};

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('PAYMENTS');
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [catalog, setCatalog] = useState<ProviderCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTestId, setBusyTestId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawTab = (params.get('tab') || params.get('category') || '').toUpperCase();
    if (rawTab === 'ANALYTICS' || rawTab === 'SEARCH' || rawTab === 'SEO') {
      setTab('ANALYTICS');
    } else if (rawTab in TAB_LABELS) {
      setTab(rawTab as Tab);
    }
  }, []);

  const selectTab = (t: Tab) => {
    setTab(t);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t.toLowerCase());
      window.history.replaceState(null, '', url.toString());
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        api.get<IntegrationRow[]>('/integrations'),
        api.get<ProviderCatalogEntry[]>('/integrations/catalog'),
      ]);
      setRows(r);
      setCatalog(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load integrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(row: IntegrationRow) {
    try {
      await api.patch(`/integrations/${row.id}`, { isActive: !row.isActive });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Could not update.');
    }
  }

  async function test(row: IntegrationRow) {
    setBusyTestId(row.id);
    try {
      const res = await api.post<IntegrationTestResponse>(`/integrations/${row.id}/test`);
      alert(res.testResult.ok ? `✓ ${res.testResult.message}` : `✗ ${res.testResult.message}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Test failed.');
    } finally {
      setBusyTestId(null);
    }
  }

  const activeCats = TAB_CATEGORIES[tab];
  const rowsForTab = rows.filter((r) => activeCats.includes(r.category));
  const catalogForTab = catalog.filter((c) => activeCats.includes(c.category));
  const providerById = new Map(catalog.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
          Integrations
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-400">
          Third-party services. Credentials are encrypted at rest with AES-256-GCM.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      {/* Tab strip */}
      <div className="mb-4 -mx-1 flex flex-wrap items-center gap-1 overflow-x-auto px-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const on = tab === t;
          const count = rows.filter((r) => TAB_CATEGORIES[t].includes(r.category)).length;
          return (
            <button
              key={t}
              onClick={() => selectTab(t)}
              className={
                on
                  ? 'rounded-full border border-signal-500 bg-signal-500/12 px-3 py-1.5 text-[12px] font-medium text-signal-600'
                  : 'rounded-full border border-transparent px-3 py-1.5 text-[12px] text-ink-400 hover:bg-ink-850 hover:text-ink-200'
              }
            >
              {TAB_LABELS[t]}
              {count > 0 && (
                <span className={`tabular ml-1.5 ${on ? 'text-signal-500' : 'text-ink-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Configured rows */}
      <Panel className="mb-4 overflow-hidden">
        <PanelHeader>
          <PanelTitle>Configured</PanelTitle>
          <span className="tabular text-[11px] text-ink-500">
            {rowsForTab.length} {rowsForTab.length === 1 ? 'integration' : 'integrations'}
          </span>
        </PanelHeader>
        <PanelBody className="p-0">
          {loading ? (
            <div className="divide-y divide-ink-800/50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-3 w-40 rounded shimmer" />
                  <div className="ml-auto h-3 w-20 rounded shimmer" />
                </div>
              ))}
            </div>
          ) : rowsForTab.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12.5px] text-ink-500">
              Nothing configured yet. Pick a provider below to add one.
            </p>
          ) : (
            <ul className="divide-y divide-ink-800/50">
              {rowsForTab.map((row) => {
                const p = providerById.get(row.provider);
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-[1fr_auto] items-start gap-3 px-5 py-3 sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink-100">
                          {row.label ?? p?.label ?? row.provider}
                        </span>
                        <Chip>{p?.label ?? row.provider}</Chip>
                        <TestBadge row={row} />
                        {!row.isActive && (
                          <Chip className="border-ink-700 text-ink-500">Inactive</Chip>
                        )}
                        {row.category === 'AI' && row.priority > 0 && (
                          <span className="text-[10.5px] text-ink-500">
                            priority {row.priority}
                          </span>
                        )}
                      </div>
                      {row.lastTestMessage && (
                        <p className="mt-0.5 truncate text-[11px] text-ink-500">
                          {row.lastTestMessage}
                          {row.lastTestedAt && (
                            <span className="ml-2 text-ink-600">
                              · {relativeDate(row.lastTestedAt)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      {p?.hasTest && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyTestId === row.id}
                          onClick={() => test(row)}
                        >
                          {busyTestId === row.id ? (
                            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                          ) : (
                            <Zap className="size-3.5" strokeWidth={1.75} />
                          )}
                          Test
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(row)}
                      >
                        {row.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      {p && (
                        <IntegrationDialog
                          provider={p}
                          editing={row}
                          onDone={load}
                          trigger={
                            <Button variant="ghost" size="sm" aria-label="Edit">
                              <Pencil className="size-3.5" strokeWidth={1.75} />
                            </Button>
                          }
                        />
                      )}
                      <RowActions
                        label={`Delete ${row.label ?? row.provider}`}
                        confirmMessage={`Delete this ${p?.label ?? row.provider} integration? Credentials are wiped immediately.`}
                        onDelete={async () => {
                          try {
                            await api.del(`/integrations/${row.id}`);
                            load();
                          } catch (e) {
                            alert(e instanceof ApiError ? e.message : 'Could not delete.');
                          }
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelBody>
      </Panel>

      {/* Available providers */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Add {TAB_LABELS[tab].toLowerCase()}</PanelTitle>
          <span className="text-[11px] text-ink-500">Pick a provider</span>
        </PanelHeader>
        <PanelBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogForTab.map((p) => (
              <IntegrationDialog
                key={p.id}
                provider={p}
                onDone={load}
                trigger={
                  <button
                    type="button"
                    className="group flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950 px-3 py-2.5 text-left transition-colors hover:border-signal-500/60 hover:bg-signal-500/5"
                  >
                    <span className="grid size-8 place-items-center rounded-md border border-ink-800 bg-ink-900 text-ink-400 group-hover:border-signal-500/40 group-hover:text-signal-600">
                      <Plus className="size-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-100">{p.label}</p>
                      <p className="text-[11px] text-ink-500">
                        {p.category === 'PAYMENT_DOMESTIC' && 'Domestic gateway'}
                        {p.category === 'PAYMENT_INTERNATIONAL' && 'International gateway'}
                        {p.category === 'AI' && 'LLM provider'}
                        {p.category === 'ADS' && 'Ads platform'}
                        {p.category === 'ANALYTICS' && 'Search & analytics'}
                        {p.category === 'SOCIAL' && 'Social platform'}
                      </p>
                    </div>
                    {p.hasTest && (
                      <span title="Test-connection supported">
                        <Zap className="size-3.5 text-ink-500 group-hover:text-signal-500" strokeWidth={1.75} />
                      </span>
                    )}
                  </button>
                }
              />
            ))}
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

function TestBadge({ row }: { row: IntegrationRow }) {
  if (row.lastTestStatus === 'OK') {
    return (
      <span title="Last test passed" className="inline-flex items-center gap-1 rounded-full border border-healthy-500/40 px-2 py-0.5 text-[10.5px] text-healthy-500">
        <CheckCircle2 className="size-3" strokeWidth={2} />
        OK
      </span>
    );
  }
  if (row.lastTestStatus === 'FAILED') {
    return (
      <span title="Last test failed" className="inline-flex items-center gap-1 rounded-full border border-loss-500/40 px-2 py-0.5 text-[10.5px] text-loss-500">
        <XCircle className="size-3" strokeWidth={2} />
        Failed
      </span>
    );
  }
  return (
    <span title="Not tested" className="inline-flex items-center gap-1 rounded-full border border-ink-700 px-2 py-0.5 text-[10.5px] text-ink-500">
      <MinusCircle className="size-3" strokeWidth={2} />
      Untested
    </span>
  );
}

// keep import warm for the sidebar link
void Plug;
