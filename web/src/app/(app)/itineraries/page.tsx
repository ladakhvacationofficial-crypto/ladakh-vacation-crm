'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Map, Calendar } from 'lucide-react';
import { api, ApiError, type ItineraryListRow } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { relativeDate } from '@/lib/format';

export default function ItinerariesPage() {
  const [rows, setRows] = useState<ItineraryListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await api.get<ItineraryListRow[]>('/itineraries'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load itineraries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Itineraries
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Day-by-day plans. {rows.length} itinerar{rows.length === 1 ? 'y' : 'ies'} on file.
          </p>
        </div>
      </header>

      <Panel className="overflow-x-auto">
        {error ? (
          <p className="px-5 py-10 text-center text-[13px] text-loss-500">{error}</p>
        ) : loading ? (
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 rounded shimmer" />
                <div className="ml-auto h-3 w-20 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Map
              aria-hidden strokeWidth={1.25}
              className="mx-auto size-6 text-ink-500"
            />
            <p className="mt-3 text-[13px] text-ink-300">No itineraries yet</p>
            <p className="mt-1 text-[12px] text-ink-500">
              Open a lead and click &ldquo;Build itinerary&rdquo; to start planning day by day.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Itinerary</th>
                <th className="px-5 py-2.5 font-medium">For</th>
                <th className="px-5 py-2.5 font-medium">Days</th>
                <th className="px-5 py-2.5 font-medium">Pax</th>
                <th className="px-5 py-2.5 text-right font-medium">Created</th>
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((it, i) => (
                <tr
                  key={it.id}
                  className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                  style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/itineraries/${it.id}`}
                      className="font-medium text-ink-100 transition-colors group-hover:text-signal-600"
                    >
                      {it.title}
                    </Link>
                    <div className="tabular mt-0.5 text-[11px] text-ink-500">
                      {it.code}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-300">
                    {it.lead?.name ?? '—'}
                    {it.lead && (
                      <div className="tabular mt-0.5 text-[11px] text-ink-500">
                        {it.lead.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Chip>
                      <Calendar className="mr-1 size-3" strokeWidth={1.75} />
                      {it._count.days} day{it._count.days === 1 ? '' : 's'}
                    </Chip>
                  </td>
                  <td className="tabular px-5 py-3 text-ink-400">{it.totalPax}</td>
                  <td className="tabular px-5 py-3 text-right text-[12px] text-ink-500">
                    {relativeDate(it.createdAt)}
                  </td>
                  <td className="px-2 py-3">
                    <RowActions
                      label={`Delete ${it.title}`}
                      confirmMessage={`Delete "${it.title}"? Days, options and pricing are removed. Any bookings already made from this itinerary are not affected.`}
                      onDelete={async () => {
                        try {
                          await api.del(`/itineraries/${it.id}`);
                          load();
                        } catch (err) {
                          alert(err instanceof ApiError ? err.message : 'Could not delete that itinerary.');
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
