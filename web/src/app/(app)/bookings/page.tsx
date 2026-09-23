'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { api, ApiError, type BookingRow, type Paged } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Stage, Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import {
  money,
  percent,
  shortDate,
  relativeDate,
  marginHealth,
  healthText,
} from '@/lib/format';

export default function BookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get<Paged<BookingRow>>('/bookings?limit=50');
      setRows(r.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Bookings
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {rows.length} booking{rows.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <Panel className="overflow-x-auto">
        {error ? (
          <p className="px-5 py-10 text-center text-[13px] text-loss-400">{error}</p>
        ) : loading ? (
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 animate-pulse rounded bg-ink-800" />
                <div className="ml-auto h-3 w-20 animate-pulse rounded bg-ink-850" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <CalendarCheck
              aria-hidden
              strokeWidth={1.25}
              className="mx-auto size-6 text-ink-600"
            />
            <p className="mt-3 text-[13px] text-ink-300">No bookings yet</p>
            <p className="mt-1 text-[12px] text-ink-500">
              Open a quotation and choose a tier to confirm.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Booking</th>
                <th className="px-5 py-2.5 font-medium">Client</th>
                <th className="px-5 py-2.5 font-medium">Travel</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Sell</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
                <th className="px-5 py-2.5 text-right font-medium">Margin</th>
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                // Real margin trumps the estimate as soon as any cost is booked.
                const f = b.financials;
                const margin =
                  f.totalCostDue > 0 ? f.actualMarginPercent : f.quotedMarginPercent;
                const health = marginHealth(margin);
                return (
                  <tr
                    key={b.id}
                    className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                    style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="font-medium text-ink-100 transition-colors group-hover:text-signal-300"
                      >
                        {b.packageName ?? 'Untitled package'}
                      </Link>
                      <div className="tabular mt-0.5 text-[11px] text-ink-500">
                        {b.bookingNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-300">
                      {b.lead?.name ?? '—'}
                      {b.lead && (
                        <div className="tabular mt-0.5 text-[11px] text-ink-500">
                          {b.lead.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-ink-400">
                      {b.travelStartDate ? shortDate(b.travelStartDate) : '—'}
                      {b.nights > 0 && (
                        <span className="ml-1 text-ink-600">· {b.nights}N</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Stage value={b.status} />
                    </td>
                    <td className="tabular px-5 py-3 text-right text-ink-100">
                      {money(b.totalSell)}
                    </td>
                    <td className="tabular px-5 py-3 text-right">
                      {f.balanceDue === 0 ? (
                        <Chip>Paid</Chip>
                      ) : (
                        <>
                          <span className="text-ink-100">{money(f.balanceDue)}</span>
                          <div className="text-[11px] text-ink-600">
                            of {money(b.totalSell)}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-right">
                      <span className={healthText[health]}>{percent(margin)}</span>
                      <div className="text-[11px] text-ink-600">
                        {relativeDate(b.createdAt)}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <RowActions
                        disabled={b.status === 'CANCELLED'}
                        label={`Cancel ${b.bookingNumber}`}
                        confirmMessage={`Cancel ${b.bookingNumber}? The record stays for accounting; the lead status flips to CANCELLED.`}
                        onDelete={async () => {
                          try {
                            await api.del(`/bookings/${b.id}`);
                            load();
                          } catch (err) {
                            alert(err instanceof ApiError ? err.message : 'Could not cancel that booking.');
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
    </div>
  );
}
