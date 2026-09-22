'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileDown, Plus, Star, Trash2,
} from 'lucide-react';
import {
  api, ApiError, openBinary, type InterviewDetail,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { humanise } from '@/lib/constants';
import { shortDate } from '@/lib/format';

const OUTCOMES = ['PENDING', 'SELECTED', 'ON_HOLD', 'REJECTED'] as const;

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [iv, setIv] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIv(await api.get<InterviewDetail>(`/interviews/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/interviews/${id}`, body);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="h-4 w-48 rounded shimmer" />
      </div>
    );
  }
  if (!iv) {
    return (
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/interviews')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Interviews
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px]">{error ?? 'Not found.'}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost" size="sm" className="mb-4 -ml-3"
        onClick={() => router.push('/interviews')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Interviews
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            {iv.candidateName}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-400">
            Candidate for {iv.role}
            {'  ·  '}
            {new Date(iv.scheduledAt).toLocaleString('en-IN', {
              weekday: 'short', day: '2-digit', month: 'short',
              hour: '2-digit', minute: '2-digit',
            })}
            {iv.durationMinutes && ` · ${iv.durationMinutes} min`}
          </p>
          <p className="tabular mt-0.5 text-[12px] text-ink-500">
            {iv.candidatePhone}
            {iv.candidateEmail && ` · ${iv.candidateEmail}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary" size="sm" disabled={busy}
            onClick={() =>
              openBinary(
                `/interviews/${iv.id}/pdf`,
                `Interview-${iv.candidateName}.pdf`,
              ).catch((e) =>
                setError(e instanceof ApiError ? e.message : 'Download failed.'),
              )
            }
          >
            <FileDown className="size-4" strokeWidth={1.75} />
            Sheet PDF
          </Button>
          <div className="w-[160px]">
            <Select
              value={iv.outcome}
              disabled={busy}
              onChange={(e) => patch({ outcome: e.target.value })}
              aria-label="Outcome"
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>{humanise(o)}</option>
              ))}
            </Select>
          </div>
          <DeactivateButton
            disabled={busy}
            label="Delete interview"
            confirmMessage={`Delete this interview record for ${iv.candidateName}? This cannot be undone.`}
            onConfirm={async () => {
              try {
                await api.del(`/interviews/${iv.id}`);
                router.push('/interviews');
              } catch (e) {
                setError(e instanceof ApiError ? e.message : 'Could not delete this interview.');
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

      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <QuestionnairePanel iv={iv} busy={busy} onSave={patch} />
          <FeedbackPanel iv={iv} busy={busy} onSave={patch} />
        </div>

        <div className="space-y-4">
          <RatingPanel iv={iv} busy={busy} onSave={patch} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionnairePanel({
  iv, busy, onSave,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  // Local, editable copy — commits on Save, so operators can jot notes without
  // firing an API call per keystroke.
  const [rows, setRows] = useState(iv.questionnaire.length > 0
    ? iv.questionnaire
    : []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows(iv.questionnaire ?? []);
    setDirty(false);
  }, [iv]);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Questions & answers</PanelTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              setRows((r) => [...r, { question: '', answer: '', rating: 3 }]);
              setDirty(true);
            }}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Add
          </Button>
          {dirty && (
            <Button
              size="sm" disabled={busy}
              onClick={() => onSave({ questionnaire: rows })}
            >
              Save
            </Button>
          )}
        </div>
      </PanelHeader>

      {rows.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No questions yet</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Add a question above, or print a blank sheet and fill it by hand.
          </p>
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60">
          {rows.map((r, idx) => (
            <li key={idx} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Input
                    value={r.question}
                    placeholder={`Question ${idx + 1}`}
                    onChange={(e) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], question: e.target.value };
                      setRows(c); setDirty(true);
                    }}
                  />
                  <Textarea
                    rows={2}
                    value={r.answer ?? ''}
                    placeholder="Candidate's response"
                    onChange={(e) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], answer: e.target.value };
                      setRows(c); setDirty(true);
                    }}
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StarRating
                    value={r.rating ?? 0}
                    onChange={(v) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], rating: v };
                      setRows(c); setDirty(true);
                    }}
                  />
                  <button
                    onClick={() => {
                      setRows(rows.filter((_, i) => i !== idx));
                      setDirty(true);
                    }}
                    className="rounded p-1 text-ink-500 hover:bg-ink-850 hover:text-loss-500"
                    aria-label="Remove question"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function FeedbackPanel({
  iv, busy, onSave,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [strengths, setStrengths] = useState(iv.strengths ?? '');
  const [concerns, setConcerns] = useState(iv.concerns ?? '');
  const [outcomeNote, setOutcomeNote] = useState(iv.outcomeNote ?? '');
  useEffect(() => {
    setStrengths(iv.strengths ?? '');
    setConcerns(iv.concerns ?? '');
    setOutcomeNote(iv.outcomeNote ?? '');
  }, [iv]);

  const dirty =
    strengths !== (iv.strengths ?? '') ||
    concerns !== (iv.concerns ?? '') ||
    outcomeNote !== (iv.outcomeNote ?? '');

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Feedback</PanelTitle>
        {dirty && (
          <Button
            size="sm" disabled={busy}
            onClick={() => onSave({ strengths, concerns, outcomeNote })}
          >
            Save
          </Button>
        )}
      </PanelHeader>
      <PanelBody className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Strengths</Label>
          <Textarea
            rows={3} value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="What impressed you?"
          />
        </div>
        <div className="space-y-1">
          <Label>Concerns</Label>
          <Textarea
            rows={3} value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="What worried you?"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Outcome note</Label>
          <Textarea
            rows={2} value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder="Why selected / on hold / rejected"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

function RatingPanel({
  iv, busy, onSave,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Overall</PanelTitle>
      </PanelHeader>
      <PanelBody className="flex flex-col items-center gap-3 py-6">
        <StarRating
          value={iv.overallRating ?? 0}
          size="lg"
          onChange={(v) => onSave({ overallRating: v })}
          disabled={busy}
        />
        <p className="text-[11px] text-ink-500">
          {iv.overallRating
            ? `${iv.overallRating} of 5`
            : 'Tap a star to rate'}
        </p>
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
        <p className="text-[11px] text-ink-500">
          Scheduled {shortDate(iv.scheduledAt)}
        </p>
      </PanelBody>
    </Panel>
  );
}

function StarRating({
  value, onChange, size = 'sm', disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'lg';
  disabled?: boolean;
}) {
  const sizeClass = size === 'lg' ? 'size-6' : 'size-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={`rounded p-0.5 transition-colors ${
            n <= value ? 'text-brand-500' : 'text-ink-700 hover:text-brand-400'
          }`}
        >
          <Star
            className={sizeClass}
            strokeWidth={1.75}
            fill={n <= value ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}
