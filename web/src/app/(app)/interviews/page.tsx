'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, X } from 'lucide-react';
import { api, ApiError, type InterviewRow } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { humanise } from '@/lib/constants';
import { shortDate } from '@/lib/format';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

const OUTCOMES = ['PENDING', 'SELECTED', 'ON_HOLD', 'REJECTED'] as const;

export default function InterviewsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<InterviewRow[]>([]);
  const [outcome, setOutcome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (outcome) q.set('outcome', outcome);
    try {
      setRows(await api.get<InterviewRow[]>(`/interviews?${q}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load interviews.');
    } finally {
      setLoading(false);
    }
  }, [outcome]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Interviews
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {rows.length} candidate{rows.length === 1 ? '' : 's'}
            {outcome && ` · ${humanise(outcome).toLowerCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScheduleInterviewDialog onCreated={(id) => router.push(`/interviews/${id}`)} />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="w-[180px]">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">All outcomes</option>
            {OUTCOMES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>
        {outcome && (
          <Button variant="ghost" size="sm" onClick={() => setOutcome('')}>
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Briefcase
              aria-hidden strokeWidth={1.25}
              className="mx-auto size-6 text-ink-500"
            />
            <p className="mt-3 text-[13px] text-ink-300">
              No interviews scheduled
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Schedule the first candidate above.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Candidate</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Interviewer</th>
                <th className="px-5 py-2.5 font-medium">Outcome</th>
                <th className="px-5 py-2.5 text-right font-medium">Scheduled</th>
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((iv, i) => (
                <tr
                  key={iv.id}
                  className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                  style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/interviews/${iv.id}`}
                      className="font-medium text-ink-100 transition-colors group-hover:text-signal-600"
                    >
                      {iv.candidateName}
                    </Link>
                    <div className="tabular mt-0.5 text-[11px] text-ink-500">
                      {iv.candidatePhone}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-300">{iv.role}</td>
                  <td className="px-5 py-3 text-ink-400">
                    {iv.interviewer?.fullName ?? iv.interviewerName ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Chip
                      className={
                        iv.outcome === 'SELECTED'
                          ? 'border-healthy-500/40 text-healthy-500'
                          : iv.outcome === 'REJECTED'
                            ? 'border-loss-500/40 text-loss-500'
                            : iv.outcome === 'ON_HOLD'
                              ? 'border-warn-500/40 text-warn-500'
                              : ''
                      }
                    >
                      {humanise(iv.outcome)}
                    </Chip>
                    {iv.overallRating && (
                      <span className="ml-2 text-[11px] text-brand-500">
                        {'★'.repeat(iv.overallRating)}
                      </span>
                    )}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-[12px] text-ink-500">
                    {shortDate(iv.scheduledAt)}
                  </td>
                  <td className="px-2 py-3">
                    <RowActions
                      label={`Delete ${iv.candidateName}`}
                      confirmMessage={`Delete this interview record for ${iv.candidateName}? This cannot be undone.`}
                      onDelete={async () => {
                        try {
                          await api.del(`/interviews/${iv.id}`);
                          load();
                        } catch (err) {
                          alert(err instanceof ApiError ? err.message : 'Could not delete that interview.');
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

/* ------------------------------------------------------------------ */

function ScheduleInterviewDialog({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [interviewerName, setInterviewerName] = useState('');

  function reset() {
    setName(''); setPhone(''); setEmail(''); setRole('');
    setScheduledAt(''); setDurationMinutes('45'); setInterviewerName('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        candidateName: name.trim(),
        candidatePhone: phone.trim(),
        role: role.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 45,
      };
      if (email.trim()) body.candidateEmail = email.trim();
      if (interviewerName.trim()) body.interviewerName = interviewerName.trim();

      const res = await api.post<{ id: string }>('/interviews', body);
      setOpen(false);
      reset();
      onCreated(res.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" strokeWidth={1.75} />
          Schedule interview
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Schedule interview"
        description="Enter the candidate's details. You can add scoring and outcome after the interview happens."
      >
        <form onSubmit={submit} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="iv-name">Candidate name *</Label>
              <Input
                id="iv-name" autoFocus required
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Zaid Bhat"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-phone">Phone *</Label>
              <Input
                id="iv-phone" type="tel" required
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 …"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-email">Email</Label>
              <Input
                id="iv-email" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-role">Role *</Label>
              <Input
                id="iv-role" required
                value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="Sales Executive"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-when">Scheduled at *</Label>
              <Input
                id="iv-when" type="datetime-local" required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-dur">Duration (min)</Label>
              <Input
                id="iv-dur" type="number" min={5} max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="iv-interviewer">Interviewer</Label>
              <Input
                id="iv-interviewer"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Who's taking it"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={busy || !name.trim() || !phone.trim() || !role.trim() || !scheduledAt}
            >
              {busy ? 'Saving…' : 'Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
