'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileDown,
  Plus,
  Star,
  Trash2,
  Sparkles,
  Bot,
  Copy,
  Check,
  MessageCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  ApiError,
  openBinary,
  type InterviewDetail,
  type InterviewQuestionItem,
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

  // Copy candidate link state
  const [copied, setCopied] = useState(false);

  // Live AI session modal
  const [sessionOpen, setSessionOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIv(await api.get<InterviewDetail>(`/interviews/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  // Trigger AI Evaluation
  async function runAiEvaluation() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/interviews/${id}/ai/evaluate`, {});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'AI Evaluation failed.');
    } finally {
      setBusy(false);
    }
  }

  // Generate 5 Easy Questions
  async function generateEasyQuestions() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/interviews/${id}/ai/reset`, {});
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to generate AI questions.');
    } finally {
      setBusy(false);
    }
  }

  // Copy Candidate Direct Link
  function copyCandidateLink() {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/interview/session/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // WhatsApp Candidate Invite
  function openWhatsAppInvite() {
    if (!iv) return;
    const cleanPhone = iv.candidatePhone.replace(/[^0-9]/g, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ladakhvacation.in';
    const link = `${origin}/interview/session/${iv.id}`;
    const message = `Hello ${iv.candidateName}, greetings from Ladakh Vacation! We invite you to complete your friendly AI interview session for the position of "${iv.role}".\n\nPlease click this link to begin in simple English:\n${link}\n\nAll the best!`;
    const waUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
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
    <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-3"
        onClick={() => router.push('/interviews')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Interviews
      </Button>

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              {iv.candidateName}
            </h1>
            <span className="rounded-full bg-gold-500/15 border border-gold-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-gold-400">
              AI Interview Ready
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-400">
            Candidate for <strong className="text-ink-200">{iv.role}</strong>
            {'  ·  '}
            {new Date(iv.scheduledAt).toLocaleString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {iv.durationMinutes && ` · ${iv.durationMinutes} min`}
          </p>
          <p className="tabular mt-0.5 text-[12px] text-ink-500">
            {iv.candidatePhone}
            {iv.candidateEmail && ` · ${iv.candidateEmail}`}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Launch Live AI Session Modal */}
          <Button
            size="sm"
            onClick={() => setSessionOpen(true)}
            className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold shadow-md shadow-gold-500/20"
          >
            <Bot className="size-4" />
            Launch AI Session
          </Button>

          {/* Copy Candidate Link */}
          <Button
            variant="secondary"
            size="sm"
            onClick={copyCandidateLink}
            title="Copy direct session link for the candidate"
          >
            {copied ? (
              <>
                <Check className="size-4 text-healthy-400" />
                <span className="text-healthy-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Link
              </>
            )}
          </Button>

          {/* WhatsApp Candidate Invite */}
          <Button
            variant="secondary"
            size="sm"
            onClick={openWhatsAppInvite}
            title="Send WhatsApp invitation to candidate"
          >
            <MessageCircle className="size-4 text-[#25D366]" />
            WhatsApp
          </Button>

          {/* Sheet PDF */}
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
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
            PDF
          </Button>

          {/* Outcome Select */}
          <div className="w-[140px]">
            <Select
              value={iv.outcome}
              disabled={busy}
              onChange={(e) => patch({ outcome: e.target.value })}
              aria-label="Outcome"
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {humanise(o)}
                </option>
              ))}
            </Select>
          </div>

          {/* Delete Interview */}
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
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500"
        >
          {error}
        </p>
      )}

      {/* AI SUITABILITY & SCORECARD CARD */}
      <AiScorecardCard
        iv={iv}
        busy={busy}
        onRunEvaluation={runAiEvaluation}
        onGenerateQuestions={generateEasyQuestions}
      />

      {/* Main Grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <QuestionnairePanel
            iv={iv}
            busy={busy}
            onSave={patch}
            onGenerateEasyQuestions={generateEasyQuestions}
          />
          <FeedbackPanel iv={iv} busy={busy} onSave={patch} />
        </div>

        <div className="space-y-6">
          <RatingPanel iv={iv} busy={busy} onSave={patch} onRunAi={runAiEvaluation} />
          <CandidatePortalAccessCard iv={iv} onCopy={copyCandidateLink} onWhatsApp={openWhatsAppInvite} />
        </div>
      </div>

      {/* Live AI Interview Modal Runner */}
      {sessionOpen && (
        <LiveAiSessionModal
          iv={iv}
          onClose={() => {
            setSessionOpen(false);
            load();
          }}
          onUpdated={() => load()}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI Scorecard & Suitability Card                                     */
/* ------------------------------------------------------------------ */

function AiScorecardCard({
  iv,
  busy,
  onRunEvaluation,
  onGenerateQuestions,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onRunEvaluation: () => void;
  onGenerateQuestions: () => void;
}) {
  const hasEvaluation = Boolean(iv.overallRating || iv.strengths || iv.concerns || iv.outcomeNote);
  const questionsCount = iv.questionnaire?.length || 0;
  const answeredCount = iv.questionnaire?.filter((q) => q.answer && q.answer.trim().length > 0).length || 0;

  return (
    <Panel className="border-gold-500/30 bg-gradient-to-br from-gold-500/[0.04] to-ink-900/60 shadow-lg">
      <PanelHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-gold-500/20 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-gold-500/40 bg-gold-500/10 text-gold-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <PanelTitle className="text-base text-ink-100 flex items-center gap-2">
              AI Suitability & Ability Scorecard
              <span className="rounded bg-gold-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-gold-400 uppercase tracking-wide">
                Easy English Mode
              </span>
            </PanelTitle>
            <p className="text-[12px] text-ink-400">
              Evaluated across {questionsCount} role-specific conversational questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {questionsCount === 0 ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={onGenerateQuestions}
              className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold"
            >
              <Bot className="size-3.5" />
              Generate 5 Easy Questions
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || answeredCount === 0}
              onClick={onRunEvaluation}
              className="border-gold-500/30 text-gold-300 hover:text-gold-200"
            >
              <Sparkles className="size-3.5 text-gold-400" />
              {hasEvaluation ? 'Re-evaluate with AI' : 'Run AI Evaluation'}
            </Button>
          )}
        </div>
      </PanelHeader>

      <PanelBody className="p-5">
        {hasEvaluation ? (
          <div className="grid gap-5 md:grid-cols-[200px_1fr]">
            {/* Score & Verdict Pillar */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-ink-800 bg-ink-950/60 p-4 text-center">
              <div className="flex items-center gap-1 text-gold-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="size-5"
                    strokeWidth={1.5}
                    fill={s <= (iv.overallRating ?? 0) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <div className="mt-2 text-2xl font-bold text-ink-50">
                {iv.overallRating ? `${iv.overallRating} / 5` : '—'}
              </div>
              <div className="mt-1 text-xs text-ink-400">Overall Match Score</div>

              <div className="mt-3">
                <Chip
                  className={
                    iv.outcome === 'SELECTED'
                      ? 'border-healthy-500/40 bg-healthy-500/10 text-healthy-400 font-semibold px-2.5 py-1'
                      : iv.outcome === 'REJECTED'
                        ? 'border-loss-500/40 bg-loss-500/10 text-loss-400 font-semibold px-2.5 py-1'
                        : 'border-warn-500/40 bg-warn-500/10 text-warn-400 font-semibold px-2.5 py-1'
                  }
                >
                  {humanise(iv.outcome)}
                </Chip>
              </div>
            </div>

            {/* AI Notes Breakdown */}
            <div className="space-y-3.5">
              {iv.outcomeNote && (
                <div className="rounded-lg border border-gold-500/20 bg-gold-500/[0.05] p-3 text-xs leading-relaxed text-ink-200">
                  <span className="font-semibold text-gold-400">Hiring Summary: </span>
                  {iv.outcomeNote}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-ink-800/80 bg-ink-950/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-healthy-400 mb-1.5">
                    <CheckCircle2 className="size-3.5" /> Key Strengths
                  </div>
                  <p className="text-xs text-ink-300 whitespace-pre-line leading-relaxed">
                    {iv.strengths || 'None recorded.'}
                  </p>
                </div>

                <div className="rounded-lg border border-ink-800/80 bg-ink-950/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-warn-400 mb-1.5">
                    <AlertTriangle className="size-3.5" /> Concerns / Training Needed
                  </div>
                  <p className="text-xs text-ink-300 whitespace-pre-line leading-relaxed">
                    {iv.concerns || 'None recorded.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <Bot className="mx-auto size-8 text-gold-400/80" />
            <p className="mt-2 text-sm font-medium text-ink-200">
              No AI evaluation recorded yet
            </p>
            <p className="mt-1 text-xs text-ink-400 max-w-md mx-auto">
              Launch the live session with the candidate or send them their direct link. Once answers are recorded, click &quot;Run AI Evaluation&quot; to determine candidate suitability.
            </p>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Questionnaire Panel                                                */
/* ------------------------------------------------------------------ */

function QuestionnairePanel({
  iv,
  busy,
  onSave,
  onGenerateEasyQuestions,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onGenerateEasyQuestions: () => void;
}) {
  const [rows, setRows] = useState<InterviewQuestionItem[]>(iv.questionnaire ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows(iv.questionnaire ?? []);
    setDirty(false);
  }, [iv]);

  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-center gap-2">
          <PanelTitle>Questions & Answers</PanelTitle>
          <span className="text-xs text-ink-400">
            ({rows.filter((r) => r.answer).length} / {rows.length} answered)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRows((r) => [...r, { question: '', answer: '', rating: 3 }]);
              setDirty(true);
            }}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Add Question
          </Button>
          {dirty && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onSave({ questionnaire: rows })}
              className="bg-gold-500 text-ink-950 hover:bg-gold-400"
            >
              Save Changes
            </Button>
          )}
        </div>
      </PanelHeader>

      {rows.length === 0 ? (
        <PanelBody className="py-10 text-center">
          <Bot className="mx-auto size-8 text-gold-400" />
          <p className="mt-2 text-sm font-medium text-ink-200">No interview questions yet</p>
          <p className="mt-1 text-xs text-ink-400 max-w-sm mx-auto">
            Click below to generate 5 simple, easy-English questions tailored for {iv.role}.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={onGenerateEasyQuestions}
              className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold"
            >
              <Sparkles className="size-3.5" />
              Generate 5 Easy Questions
            </Button>
          </div>
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60">
          {rows.map((r, idx) => (
            <li key={idx} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-gold-500/10 px-2 py-0.5 text-[11px] font-medium text-gold-400">
                      Q{idx + 1} {r.category ? `· ${r.category}` : ''}
                    </span>
                    {r.feedback && (
                      <span className="text-[11px] text-ink-400 italic">
                        Feedback: {r.feedback}
                      </span>
                    )}
                  </div>
                  <Input
                    value={r.question}
                    placeholder={`Question ${idx + 1}`}
                    onChange={(e) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], question: e.target.value };
                      setRows(c);
                      setDirty(true);
                    }}
                    className="font-medium text-ink-100"
                  />
                  <Textarea
                    rows={2}
                    value={r.answer ?? ''}
                    placeholder="Candidate's response..."
                    onChange={(e) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], answer: e.target.value };
                      setRows(c);
                      setDirty(true);
                    }}
                  />
                </div>
                <div className="flex flex-col items-end gap-2 pt-6">
                  <StarRating
                    value={r.rating ?? 0}
                    onChange={(v) => {
                      const c = rows.slice();
                      c[idx] = { ...c[idx], rating: v };
                      setRows(c);
                      setDirty(true);
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

/* ------------------------------------------------------------------ */
/* Feedback Panel                                                     */
/* ------------------------------------------------------------------ */

function FeedbackPanel({
  iv,
  busy,
  onSave,
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
        <PanelTitle>Manual Feedback & Overrides</PanelTitle>
        {dirty && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onSave({ strengths, concerns, outcomeNote })}
            className="bg-gold-500 text-ink-950 hover:bg-gold-400"
          >
            Save
          </Button>
        )}
      </PanelHeader>
      <PanelBody className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Strengths</Label>
          <Textarea
            rows={3}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Candidate strengths..."
          />
        </div>
        <div className="space-y-1">
          <Label>Concerns</Label>
          <Textarea
            rows={3}
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Concerns or training needs..."
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Hiring Manager Note</Label>
          <Textarea
            rows={2}
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            placeholder="Why selected / on hold / rejected..."
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Rating Panel                                                       */
/* ------------------------------------------------------------------ */

function RatingPanel({
  iv,
  busy,
  onSave,
  onRunAi,
}: {
  iv: InterviewDetail;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onRunAi: () => void;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Final Verdict</PanelTitle>
      </PanelHeader>
      <PanelBody className="flex flex-col items-center gap-3 py-6">
        <StarRating
          value={iv.overallRating ?? 0}
          size="lg"
          onChange={(v) => onSave({ overallRating: v })}
          disabled={busy}
        />
        <p className="text-[11px] text-ink-500">
          {iv.overallRating ? `${iv.overallRating} of 5 Stars` : 'Tap a star to override rating'}
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
        <p className="text-[11px] text-ink-500">Scheduled {shortDate(iv.scheduledAt)}</p>

        <div className="mt-2 w-full border-t border-ink-800 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRunAi}
            disabled={busy}
            className="w-full text-xs text-gold-400 hover:text-gold-300"
          >
            <Sparkles className="mr-1.5 size-3.5" />
            Recalculate with AI
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Candidate Portal Access Card                                       */
/* ------------------------------------------------------------------ */

function CandidatePortalAccessCard({
  iv,
  onCopy,
  onWhatsApp,
}: {
  iv: InterviewDetail;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${origin}/interview/session/${iv.id}`;

  return (
    <Panel className="border-ink-800">
      <PanelHeader>
        <PanelTitle className="text-xs uppercase tracking-wider text-ink-400">
          Candidate Portal Link
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3 p-4">
        <p className="text-xs text-ink-400 leading-relaxed">
          Send this link to the candidate so they can take the AI interview from their phone or laptop.
        </p>

        <div className="rounded-lg border border-ink-800 bg-ink-950/80 p-2 text-[11px] text-ink-400 break-all select-all font-mono">
          {portalUrl}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCopy} className="flex-1 text-xs">
            <Copy className="size-3.5" /> Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={onWhatsApp} className="flex-1 text-xs">
            <MessageCircle className="size-3.5 text-[#25D366]" /> WhatsApp
          </Button>
        </div>

        <a
          href={`/interview/session/${iv.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-1.5 text-[11.5px] text-gold-400 hover:text-gold-300 pt-1"
        >
          <span>Preview Candidate Portal</span>
          <ExternalLink className="size-3" />
        </a>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Live AI Interview Modal Runner                                     */
/* ------------------------------------------------------------------ */

function LiveAiSessionModal({
  iv,
  onClose,
  onUpdated,
}: {
  iv: InterviewDetail;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>(iv.questionnaire ?? []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Init questions
  useEffect(() => {
    async function init() {
      if (!iv.questionnaire || iv.questionnaire.length === 0) {
        try {
          const res = await api.post<any>(`/interviews/${iv.id}/ai/start`, {});
          if (res?.questions) {
            setQuestions(res.questions);
          }
        } catch (e) {
          console.warn('Failed to start AI session:', e);
        }
      } else {
        const firstUnanswered = iv.questionnaire.findIndex(
          (q) => !q.answer || q.answer.trim().length === 0,
        );
        const idx = firstUnanswered !== -1 ? firstUnanswered : 0;
        setCurrentIdx(idx);
        setAnswerText(iv.questionnaire[idx]?.answer || '');
      }
    }
    init();
  }, [iv]);

  function speakQuestion(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-IN';
    utt.rate = 0.95;
    utt.onstart = () => setIsPlayingAudio(true);
    utt.onend = () => setIsPlayingAudio(false);
    utt.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utt);
  }

  function toggleListening() {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      rec.onstart = () => setIsListening(true);
      rec.onresult = (e: any) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + ' ';
        }
        setAnswerText(text.trim());
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  }

  async function handleAnswerSubmit() {
    if (!answerText.trim() || submitting) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }

    setSubmitting(true);
    try {
      const res = await api.post<any>(`/interviews/${iv.id}/ai/answer`, {
        questionIndex: currentIdx,
        answer: answerText.trim(),
      });

      setFeedback(res.feedback);

      const updated = [...questions];
      if (updated[currentIdx]) {
        updated[currentIdx] = {
          ...updated[currentIdx],
          answer: answerText.trim(),
          feedback: res.feedback,
        };
      }
      setQuestions(updated);

      if (res.isCompleted || res.nextIndex === null) {
        setIsCompleted(true);
        onUpdated();
      } else {
        const next = res.nextIndex;
        setCurrentIdx(next);
        setAnswerText(updated[next]?.answer || '');
      }
    } catch (e) {
      console.warn('Failed to submit answer:', e);
    } finally {
      setSubmitting(false);
    }
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-ink-800 bg-ink-900 shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-ink-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 border border-gold-500/30">
              <Bot className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-ink-50">
                Live AI Interview Session — {iv.candidateName}
              </h3>
              <p className="text-xs text-ink-400">
                Role: <span className="text-gold-400 font-medium">{iv.role}</span> · Very Easy English Mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {isCompleted ? (
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h4 className="text-xl font-bold text-ink-50">All Questions Completed!</h4>
            <p className="text-xs text-ink-400 max-w-md mx-auto">
              AI has analyzed all candidate responses and updated the candidate scorecard, overall rating, and suitability recommendation.
            </p>
            <Button
              onClick={onClose}
              className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold mt-4"
            >
              View Updated Scorecard
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Question Box */}
            <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gold-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold-400">
                  Question {currentIdx + 1} of {questions.length}
                </span>

                {currentQ && (
                  <button
                    type="button"
                    onClick={() => speakQuestion(currentQ.question)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-300 hover:text-ink-100 bg-ink-800"
                  >
                    {isPlayingAudio ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                    <span>{isPlayingAudio ? 'Stop' : 'Listen'}</span>
                  </button>
                )}
              </div>

              <div className="mt-3 text-base font-medium text-ink-50 leading-relaxed">
                {currentQ?.question || 'Generating question...'}
              </div>
            </div>

            {feedback && (
              <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-gold-300 flex items-start gap-2">
                <Sparkles className="size-3.5 shrink-0 text-gold-400 mt-0.5" />
                <div>{feedback}</div>
              </div>
            )}

            {/* Answer Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink-300">
                  Candidate Response (Speak or Type):
                </label>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isListening
                      ? 'bg-loss-500 text-white animate-pulse'
                      : 'bg-gold-500/15 text-gold-400 hover:bg-gold-500/25'
                  }`}
                >
                  {isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                  <span>{isListening ? 'Stop' : 'Speak'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Candidate's answer in simple English..."
                className="w-full rounded-xl border border-ink-700 bg-ink-950 p-3 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-ink-500">
                {questions.filter((q) => q.answer).length} answered
              </span>
              <Button
                onClick={handleAnswerSubmit}
                disabled={submitting || !answerText.trim()}
                className="bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold"
              >
                {submitting ? 'Analyzing...' : 'Save & Next Question'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Star Rating Component                                              */
/* ------------------------------------------------------------------ */

function StarRating({
  value,
  onChange,
  size = 'sm',
  disabled,
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
