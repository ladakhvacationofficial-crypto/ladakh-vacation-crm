'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Building2 } from 'lucide-react';
import { api, ApiError, type VendorRow, type Paged } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { AddVendorDialog } from '@/components/add-vendor-dialog';
import { humanise } from '@/lib/constants';
import { money } from '@/lib/format';

export default function VendorsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 0 });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ page: String(page), limit: '25' });
    if (search.trim()) q.set('search', search.trim());
    if (type) q.set('type', type);
    if (city.trim()) q.set('city', city.trim());
    try {
      const res = await api.get<Paged<VendorRow>>(`/vendors?${q}`);
      setRows(res.data);
      setMeta({ total: res.total, page: res.page, pages: res.pages });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [search, type, city, page]);

  useEffect(() => {
    const t = setTimeout(load, search || city ? 240 : 0);
    return () => clearTimeout(t);
  }, [load, search, city]);

  const filtered = Boolean(search || type || city);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Suppliers
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {meta.total} supplier{meta.total === 1 ? '' : 's'} on the books
          </p>
        </div>
        <AddVendorDialog onCreated={(id) => router.push(`/vendors/${id}`)} />
      </header>

      {/* Type tabs — the DMC only cares about hotel-vs-transport-vs-rest 90%
          of the time. Rare types live in "All". */}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {[
          { value: '', label: 'All' },
          { value: 'HOTEL', label: 'Hotels' },
          { value: 'CAMP', label: 'Camps' },
          { value: 'HOUSEBOAT', label: 'Houseboats' },
          { value: 'TRANSPORT', label: 'Transport' },
          { value: 'GUIDE', label: 'Guides' },
          { value: 'ACTIVITY', label: 'Activities' },
          { value: 'RESTAURANT', label: 'Restaurants' },
        ].map((t) => {
          const active = type === t.value;
          return (
            <button
              key={t.value || 'all'}
              onClick={() => { setType(t.value); setPage(1); }}
              className={
                active
                  ? 'rounded-full border border-signal-500 bg-signal-500/12 px-3 py-1.5 text-[12px] font-medium text-signal-600'
                  : 'rounded-full border border-transparent px-3 py-1.5 text-[12px] text-ink-400 hover:bg-ink-850 hover:text-ink-200'
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            aria-hidden strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
          />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, area, contact person"
            className="pl-8"
            aria-label="Search suppliers"
          />
        </div>

        <div className="w-[168px]">
          <Input
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            placeholder="City"
          />
        </div>

        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setType(''); setCity(''); setPage(1); }}>
            <X className="size-4" strokeWidth={1.75} />
            Clear
          </Button>
        )}
      </div>

      <Panel className="overflow-x-auto">
        {error ? (
          <p className="px-5 py-10 text-center text-[13px] text-loss-500">{error}</p>
        ) : loading ? (
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 rounded shimmer" />
                <div className="ml-auto h-3 w-24 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Building2
              aria-hidden strokeWidth={1.25}
              className="mx-auto size-6 text-ink-500"
            />
            <p className="mt-3 text-[13px] text-ink-300">
              {filtered ? 'No suppliers match those filters' : 'No suppliers yet'}
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Add hotels, transport, guides — anyone you pay.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">City / Area</th>
                <th className="px-5 py-2.5 font-medium">Contact</th>
                <th className="px-5 py-2.5 text-right font-medium">Rates</th>
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((v, i) => {
                const cheapest = v.rates
                  .filter((r) => r.isActive)
                  .reduce<number | null>(
                    (a, r) => (a === null || r.netRate < a ? r.netRate : a),
                    null,
                  );
                return (
                  <tr
                    key={v.id}
                    className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                    style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/vendors/${v.id}`}
                        className="font-medium text-ink-100 transition-colors group-hover:text-signal-600"
                      >
                        {v.name}
                      </Link>
                      {v.starRating && (
                        <span className="ml-2 text-[11px] text-brand-500">
                          {'★'.repeat(v.starRating)}
                        </span>
                      )}
                      {!v.isActive && (
                        <span className="ml-2 text-[11px] text-ink-500">inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Chip>{humanise(v.type)}</Chip>
                    </td>
                    <td className="px-5 py-3 text-ink-400">
                      {v.city ?? '—'}
                      {v.area && <span className="text-ink-500"> · {v.area}</span>}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-ink-400">
                      {v.contactRedacted ? (
                        <span className="text-ink-500">— hidden —</span>
                      ) : (
                        <>
                          {v.contactPerson ?? '—'}
                          {v.phone && (
                            <div className="tabular mt-0.5 text-[11px] text-ink-500">
                              {v.phone}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-[12px]">
                      {v.rates.length === 0 ? (
                        <span className="text-ink-600">none</span>
                      ) : (
                        <>
                          <span className="text-ink-100">
                            {v.rates.length} rate{v.rates.length === 1 ? '' : 's'}
                          </span>
                          {cheapest !== null && (
                            <div className="text-[11px] text-ink-500">
                              from {money(cheapest)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <RowActions
                        disabled={!v.isActive}
                        label={`Deactivate ${v.name}`}
                        confirmMessage={`Deactivate ${v.name}? Rates and history stay; new bookings won't see them in the picker. Blocked if the ledger still has an outstanding balance.`}
                        onDelete={async () => {
                          try {
                            await api.del(`/vendors/${v.id}`);
                            load();
                          } catch (err) {
                            alert(err instanceof ApiError ? err.message : 'Could not deactivate that supplier.');
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {meta.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="tabular text-[12px] text-ink-500">
            Page {meta.page} of {meta.pages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
