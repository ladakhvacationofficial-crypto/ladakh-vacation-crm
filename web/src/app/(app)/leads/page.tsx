'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Inbox, Flame, Clock, Trash2, Users, Sparkles, RefreshCw } from 'lucide-react';
import { api, ApiError, tokenStore, type LeadRow, type Paged, type UserRow } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Stage, Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { AddLeadDialog } from '@/components/add-lead-dialog';
import { CloseLeadDialog } from '@/components/close-lead-dialog';
import { DeleteLeadDialog } from '@/components/delete-lead-dialog';
import { ApprovalsDialog } from '@/components/approvals-dialog';
import { ImportLeadsDialog } from '@/components/import-leads-dialog';
import { DateRangePicker, defaultRange, type DateRange } from '@/components/ui/date-range-picker';
import { toApiRange } from '@/lib/date-range';
import { LEAD_SOURCES, LEAD_STATUSES, humanise } from '@/lib/constants';
import { relativeDate } from '@/lib/format';

const CAN_ASSIGN_ROLES = new Set(['OWNER', 'SUPER_ADMIN']);

export default function LeadsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [range, setRange] = useState<DateRange>(() => defaultRange('today'));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk assignment state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staff, setStaff] = useState<UserRow[]>([]);
  const [bulkTarget, setBulkTarget] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const role = tokenStore.user()?.role ?? '';
  const canAssign = useMemo(() => CAN_ASSIGN_ROLES.has(role), [role]);
  const canDelete = role === 'OWNER' || role === 'SUPER_ADMIN';
  const canClose = canDelete || role === 'SALES_MANAGER';

  useEffect(() => {
    if (!canAssign) return;
    api.get<UserRow[]>('/users').then((u) => setStaff(u.filter((x) => x.isActive))).catch(() => setStaff([]));
  }, [canAssign]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }
  function clearSelection() { setSelected(new Set()); }

  async function applyBulk() {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const body = { leadIds: Array.from(selected), assignedToId: bulkTarget || null };
      const res = await api.post<{ updated: number; skippedSameOwner: number; missing: number }>('/leads/bulk-assign', body);
      alert(`Reassigned ${res.updated} lead${res.updated === 1 ? '' : 's'}${res.skippedSameOwner ? ` · ${res.skippedSameOwner} already on that owner` : ''}`);
      clearSelection();
      setBulkTarget('');
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Bulk assign failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  const [rescoring, setRescoring] = useState(false);

  async function handleRescoreAll() {
    if (!confirm('Recalculate lead scores for all active leads using the Category-Ceiling algorithm?')) return;
    setRescoring(true);
    try {
      const res = await api.post<{ updatedCount: number; message: string }>('/leads/rescore-all');
      alert(res.message);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to rescore leads.');
    } finally {
      setRescoring(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    // IST-anchored ISO timestamps — see lib/date-range.ts for why.
    const apiRange = toApiRange(range);
    if (apiRange.from) params.set('from', apiRange.from);
    if (apiRange.to) params.set('to', apiRange.to);

    try {
      const res = await api.get<Paged<LeadRow>>(`/leads?${params}`);
      setRows(res.data);
      setMeta({ total: res.total, page: res.page, pages: res.pages });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load leads.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, source, range]);

  // debounce so typing in search doesn't hammer the API
  useEffect(() => {
    const t = setTimeout(load, search ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // Any active narrowing — filters OR a date range that isn't "all time".
  const filtered = Boolean(search || status || source || range.preset !== 'all');

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSource('');
    setRange(defaultRange('all'));
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Leads
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {meta.total} enquir{meta.total === 1 ? 'y' : 'ies'}
            <span className="text-ink-500"> · {range.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={rescoring}
            onClick={handleRescoreAll}
            className="gap-1.5 border-ink-700/50 text-ink-300 hover:text-ink-100"
            title="Recalculate all active lead scores using the Category-Ceiling algorithm"
          >
            <RefreshCw className={`size-3.5 ${rescoring ? 'animate-spin' : ''}`} />
            {rescoring ? 'Scoring...' : 'Recalculate Scores'}
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-1.5 border-signal-500/30 text-signal-400 hover:text-signal-300">
            <Link href="/reports/ml">
              <Sparkles className="size-3.5" />
              ML Forecast
            </Link>
          </Button>
          <DateRangePicker value={range} onChange={(r) => { setRange(r); setPage(1); }} />
          <ImportLeadsDialog onImported={load} />
          <ApprovalsDialog onResolved={load} />
          <AddLeadDialog onCreated={(id) => router.push(`/leads/${id}`)} />
        </div>
      </header>

      {/* Filters — a toolbar, not a panel. It is chrome, not content. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Name, phone, email or destination"
            className="pl-8"
            aria-label="Search leads"
          />
        </div>

        <div className="w-[168px]">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by stage"
          >
            <option value="">All stages</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-[168px]">
          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>

        {filtered && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" strokeWidth={1.75} />
            Clear
          </Button>
        )}
      </div>

      {canAssign && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-signal-500/40 bg-signal-500/8 px-3 py-2 text-[13px]">
          <Users className="size-3.5 text-signal-500" strokeWidth={1.75} />
          <span className="tabular font-medium text-ink-100">
            {selected.size} selected
          </span>
          <span className="text-ink-500">·</span>
          <span className="text-ink-400">Assign to</span>
          <select
            aria-label="Bulk assign target"
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value)}
            className="rounded border border-ink-700 bg-ink-950 px-2 py-1 text-[12.5px] text-ink-100 focus:border-signal-500 focus:outline-none"
          >
            <option value="">— Unassign —</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <Button size="sm" disabled={bulkBusy} onClick={applyBulk}>
            {bulkBusy ? 'Applying…' : 'Apply'}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>Cancel</Button>
        </div>
      )}

      <Panel className="overflow-x-auto">
        {error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-loss-400">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Inbox
              aria-hidden
              strokeWidth={1.25}
              className="mx-auto size-6 text-ink-600"
            />
            <p className="mt-3 text-[13px] text-ink-300">
              {filtered
                ? `No leads for this view (${range.label})`
                : 'No leads yet'}
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              {filtered
                ? 'Try a wider date range or clear the filters.'
                : 'Point a landing page form at /api/leads/capture and they arrive here.'}
            </p>
            {filtered && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[960px] table-fixed text-left text-[13px]">
            {/* Fixed widths: without them the name and phone wrap while
                "Landing page" and the owner select take space they do not
                need. Every cell truncates instead of reflowing the row. */}
            <colgroup>
              {canAssign && <col className="w-9" />}
              <col className="w-[25%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                {canAssign && (
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={rows.length > 0 && selected.size === rows.length}
                      ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < rows.length; }}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="px-4 py-2.5 font-medium">Lead</th>
                <th className="px-4 py-2.5 font-medium">Trip</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Owner</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 text-right font-medium">Received</th>
                <th className="px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((lead, i) => (
                <tr
                  key={lead.id}
                  className={
                    (selected.has(lead.id) ? 'bg-signal-500/6 ' : '') +
                    'group rise border-b border-ink-800/60 align-top transition-colors duration-150 last:border-0 hover:bg-ink-850'
                  }
                  style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                >
                  {canAssign && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${lead.name}`}
                        checked={selected.has(lead.id)}
                        onChange={() => toggleRow(lead.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      title={lead.name}
                      className="block truncate font-medium text-ink-100 transition-colors group-hover:text-signal-300"
                    >
                      {lead.name}
                    </Link>
                    <a
                      href={`tel:${lead.phone}`}
                      className="tabular mt-0.5 block truncate text-[11.5px] text-ink-500 transition-colors hover:text-ink-300"
                    >
                      {lead.phone}
                    </a>
                  </td>
                  <td className="truncate px-4 py-3 text-ink-300" title={lead.destination ?? undefined}>
                    {lead.destination ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block truncate text-[12.5px] text-ink-200" title={humanise(lead.source)}>
                      {humanise(lead.source)}
                    </span>
                    {lead.utmSource && lead.utmSource !== lead.source && (
                      <span className="block truncate text-[11px] text-signal-400" title={humanise(lead.utmSource)}>
                        {humanise(lead.utmSource)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Stage and how long the lead has waited belong together:
                        a NEW lead nobody has answered is the thing to see. */}
                    <Stage value={lead.status} />
                    <div className="mt-1.5">
                      <ResponseBadge lead={lead} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {canAssign ? (
                      <select
                        aria-label={`Owner of ${lead.name}`}
                        value={lead.assignedTo?.id ?? ''}
                        disabled={bulkBusy}
                        onChange={async (e) => {
                          const next = e.target.value || null;
                          if (next === (lead.assignedTo?.id ?? null)) return;
                          try {
                            await api.patch(`/leads/${lead.id}`, { assignedToId: next });
                            load();
                          } catch (err) {
                            alert(err instanceof ApiError ? err.message : 'Could not reassign.');
                          }
                        }}
                        className={
                          'w-full truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] hover:border-ink-700 focus:border-signal-500 focus:outline-none ' +
                          (lead.assignedTo ? 'text-ink-300' : 'text-warn-400')
                        }
                      >
                        <option value="">Unassigned</option>
                        {staff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : lead.assignedTo ? (
                      <span className="block truncate" title={lead.assignedTo.name}>{lead.assignedTo.name}</span>
                    ) : (
                      <span className="text-warn-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreChip score={lead.score} />
                    {lead.urgency && (
                      <div className="mt-1">
                        <span
                          title={lead.urgency.reason}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            lead.urgency.tier === 'P1'
                              ? 'bg-loss-500/20 text-loss-500 border border-loss-500/40 animate-pulse'
                              : lead.urgency.tier === 'P2'
                              ? 'bg-warn-500/15 text-warn-500 border border-warn-500/30'
                              : lead.urgency.tier === 'P3'
                              ? 'bg-signal-500/15 text-signal-500 border border-signal-500/30'
                              : 'bg-ink-800/80 text-ink-400 border border-ink-700'
                          }`}
                        >
                          {lead.urgency.tier === 'P1' ? '⚡ ' : ''}{lead.urgency.tier} · {lead.urgency.label}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-3 text-right text-[12px] text-ink-500">
                    {relativeDate(lead.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {canClose && (
                        <CloseLeadDialog leadId={lead.id} leadName={lead.name} onClosed={load} />
                      )}
                      {canDelete && (
                        <DeleteLeadDialog leadId={lead.id} leadName={lead.name} onDeleted={load} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-ink-800/60">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="h-3 w-40 animate-pulse rounded bg-ink-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-ink-850" />
          <div className="ml-auto h-3 w-16 animate-pulse rounded bg-ink-850" />
        </div>
      ))}
    </div>
  );
}

/**
 * Lead score in one place: the number, the band it falls in, and a bar.
 * Previously a meter, a number and a coloured pill sat side by side in a
 * narrow cell and collided.
 */
function ScoreChip({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score));
  const band =
    value >= 75
      ? { label: 'Hot', text: 'text-healthy-500', dot: 'bg-healthy-500', bar: 'bg-healthy-500/12' }
      : value >= 50
        ? { label: 'Warm', text: 'text-signal-400', dot: 'bg-signal-400', bar: 'bg-signal-400/70' }
        : value >= 30
          ? { label: 'Cool', text: 'text-ink-300', dot: 'bg-ink-400', bar: 'bg-ink-400/70' }
          : { label: 'Cold', text: 'text-ink-500', dot: 'bg-ink-600', bar: 'bg-ink-600' };

  return (
    <div title={`Lead score ${value} of 100`}>
      <div className="flex items-baseline gap-1.5">
        <span className={`tabular text-[13px] font-semibold ${band.text}`}>{value}</span>
        <span className="text-[11px] uppercase tracking-[0.06em] text-ink-500">{band.label}</span>
      </div>
      <div className="mt-1 h-0.5 w-full max-w-[72px] overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${band.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ResponseBadge({ lead }: { lead: LeadRow }) {
  if (lead.firstContactAt) {
    const ms = new Date(lead.firstContactAt).getTime() - new Date(lead.createdAt).getTime();
    const mins = Math.max(0, Math.floor(ms / 60000));
    const hrs = Math.floor(mins / 60);
    const text = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-signal-400" title="Time to first response">
        <Clock className="size-3.5" />
        {text}
      </div>
    );
  }

  // Not contacted yet
  const msWait = Date.now() - new Date(lead.createdAt).getTime();
  const minsWait = Math.floor(msWait / 60000);

  if (minsWait > 180 && lead.status === 'NEW') {
    return (
      <div className="flex w-max items-center gap-1 rounded bg-loss-500/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] text-loss-400">
        <Flame className="size-3" strokeWidth={2} />
        Cold Risk
      </div>
    );
  }

  return (
    <div className="text-[11.5px] text-ink-500">
      Pending
    </div>
  );
}
