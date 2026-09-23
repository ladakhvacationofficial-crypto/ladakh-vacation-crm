'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlarmClock, PhoneCall, MessageCircle, CalendarDays } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Stage } from '@/components/ui/badge';
import { shortDate } from '@/lib/format';

/**
 * Work queue for calls. Three buckets: overdue (fix now), due today (work
 * before end-of-day), upcoming (planning ahead this week).
 *
 * Snoozes patch `nextFollowUp` directly — a shortcut to the picker on the
 * lead detail page. Keeps this page fast to grind through.
 */

interface FollowUpLead {
  id: string;
  name: string;
  phone: string;
  destination: string | null;
  nextFollowUp: string | null;
  status: string;
  assignedTo: { id: string; name: string } | null;
}

interface FollowUpBuckets {
  overdue: FollowUpLead[];
  dueToday: FollowUpLead[];
  upcoming: FollowUpLead[];
}

export default function FollowUpsPage() {
  const [data, setData] = useState<FollowUpBuckets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.get<FollowUpBuckets>('/leads/follow-ups'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your work queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function snooze(leadId: string, days: number) {
    try {
      const d = new Date();
      d.setDate(d.getDate() + days);
      await api.patch(`/leads/${leadId}`, { nextFollowUp: d.toISOString().slice(0, 10) });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Could not snooze.');
    }
  }

  const total =
    (data?.overdue.length ?? 0) +
    (data?.dueToday.length ?? 0) +
    (data?.upcoming.length ?? 0);

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
          Follow-ups
        </h1>
        <p className="mt-0.5 text-[13px] text-ink-400">
          {loading ? 'Loading your queue…' : `${total} lead${total === 1 ? '' : 's'} on your desk.`}
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <Bucket
          title="Overdue"
          tone="loss"
          rows={data?.overdue ?? []}
          loading={loading}
          emptyText="Nothing overdue — clean queue."
          onSnooze={snooze}
        />
        <Bucket
          title="Due today"
          tone="warn"
          rows={data?.dueToday ?? []}
          loading={loading}
          emptyText="Nothing due today."
          onSnooze={snooze}
        />
        <Bucket
          title="Upcoming this week"
          tone="signal"
          rows={data?.upcoming ?? []}
          loading={loading}
          emptyText="Nothing scheduled this week."
          onSnooze={snooze}
        />
      </div>
    </div>
  );
}

function Bucket({
  title, tone, rows, loading, emptyText, onSnooze,
}: {
  title: string;
  tone: 'loss' | 'warn' | 'signal';
  rows: FollowUpLead[];
  loading: boolean;
  emptyText: string;
  onSnooze: (leadId: string, days: number) => void;
}) {
  const toneClass = {
    loss: 'text-loss-500',
    warn: 'text-warn-500',
    signal: 'text-signal-600',
  }[tone];
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-1.5">
          <AlarmClock className={`size-3.5 ${toneClass}`} strokeWidth={1.75} />
          {title}
        </PanelTitle>
        <span className="tabular text-[11px] text-ink-500">
          {rows.length} lead{rows.length === 1 ? '' : 's'}
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
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-[12.5px] text-ink-500">
            {emptyText}
          </p>
        ) : (
          <ul className="divide-y divide-ink-800/50">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-850"
              >
                <div>
                  <Link
                    href={`/leads/${r.id}`}
                    className="text-[13px] font-medium text-ink-100 hover:text-signal-600"
                  >
                    {r.name}
                  </Link>
                  <div className="tabular mt-0.5 text-[11px] text-ink-500">
                    {r.phone}
                    {r.destination && <span className="ml-2 text-ink-400">· {r.destination}</span>}
                    {r.assignedTo && <span className="ml-2 text-ink-500">· {r.assignedTo.name}</span>}
                    {r.nextFollowUp && (
                      <span className="ml-2 tabular text-ink-500">
                        · due {shortDate(r.nextFollowUp)}
                      </span>
                    )}
                  </div>
                </div>
                <Stage value={r.status} />
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${r.phone}`}
                    aria-label={`Call ${r.name}`}
                    title="Call"
                    className="grid size-7 place-items-center rounded-md text-ink-500 transition-colors hover:bg-signal-500/10 hover:text-signal-600"
                  >
                    <PhoneCall className="size-3.5" strokeWidth={1.75} />
                  </a>
                  <a
                    href={`https://wa.me/${r.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${r.name}`}
                    title="WhatsApp"
                    className="grid size-7 place-items-center rounded-md text-ink-500 transition-colors hover:bg-healthy-500/10 hover:text-healthy-500"
                  >
                    <MessageCircle className="size-3.5" strokeWidth={1.75} />
                  </a>
                  <button
                    onClick={() => onSnooze(r.id, 1)}
                    aria-label="Snooze to tomorrow"
                    title="Snooze +1 day"
                    className="inline-flex items-center gap-1 rounded-md border border-ink-700 bg-transparent px-2 py-1 text-[10.5px] text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200"
                  >
                    <CalendarDays className="size-3" strokeWidth={1.75} />
                    +1d
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
