'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Phone as PhoneIcon, Mail, Trash2, UserX } from 'lucide-react';
import {
  api,
  ApiError,
  tokenStore,
  type LeadDetail,
  type UserRow,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { CloseLeadDialog } from '@/components/close-lead-dialog';
import { DeleteLeadDialog } from '@/components/delete-lead-dialog';
import { Select, Textarea } from '@/components/ui/select';
import { Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';
import { ScoreMeter } from '@/components/margin-ribbon';
import { Timeline } from '@/components/timeline';
import { MlLeadScoreCard } from '@/components/leads/ml-lead-score-card';
import { Clock, Flame } from 'lucide-react';
import {
  ACTIVITY_TYPES,
  LEAD_STATUSES,
  humanise,
  whatsappHref,
} from '@/lib/constants';
import { money, shortDate } from '@/lib/format';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [staff, setStaff] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [noteType, setNoteType] = useState<string>('CALL');
  const [note, setNote] = useState('');

  const role = tokenStore.user()?.role ?? '';
  const canAssign = role === 'OWNER' || role === 'SUPER_ADMIN';
  const canDelete = canAssign;
  const canClose = canDelete || role === 'SALES_MANAGER';

  const load = useCallback(async () => {
    try {
      const ld = await api.get<LeadDetail>(`/leads/${id}`);
      setLead(ld);
      try {
        const st = await api.get<UserRow[]>('/users');
        setStaff(st.filter((s) => s.isActive));
      } catch {
        // Non-blocking staff directory fallback
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateAiDraft() {
    setGenerating(true);
    try {
      const res = await api.get<{ draft: string }>(`/leads/${id}/ai-draft`);
      setNote(res.draft);
      setNoteType("WHATSAPP");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.patch(`/leads/${id}`, body);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function logActivity() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/leads/${id}/activities`, {
        type: noteType,
        content: note.trim(),
      });
      setNote('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="h-4 w-40 animate-pulse rounded bg-ink-800" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/leads')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Back to leads
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px] text-ink-100">{error}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  if (!lead) return null;

  const attribution = [
    ['Inbound medium', humanise(lead.source)],
    ['Marketing channel', lead.utmSource ? humanise(lead.utmSource) : null],
    ['Campaign', lead.utmCampaign],
    ['Medium', lead.utmMedium],
    ['Keyword', lead.utmTerm ?? lead.keyword],
    ['Ad content', lead.utmContent],
    ['Landing page', lead.landingPage],
    ['Google click id', lead.gclid],
    ['Meta click id', lead.fbclid],
    ['Device', lead.device],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-3"
        onClick={() => router.push('/leads')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Leads
      </Button>

      {/* Header: identity + the three things you actually do next */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              {lead.name}
            </h1>
            {lead.enquiryCount > 1 && (
              <Chip className="border-warn-500/40 text-warn-400">
                {lead.enquiryCount} enquiries
              </Chip>
            )}
          </div>
          <p className="tabular mt-1 text-[13px] text-ink-400">
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ''}
            {lead.city ? ` · ${lead.city}` : ''}
          </p>
          <div className="mt-2">
            <ResponseBadge lead={lead} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={`tel:${lead.phone}`}>
              <PhoneIcon className="size-4" strokeWidth={1.75} />
              Call
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a
              href={whatsappHref(
                lead.phone,
                `Julley ${lead.name}, this is Ladakh Vacation regarding your ${lead.destination || 'Ladakh'} enquiry.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} />
              WhatsApp
            </a>
          </Button>
          {lead.email && (
            <Button asChild variant="secondary" size="sm">
              <a href={`mailto:${lead.email}`}>
                <Mail className="size-4" strokeWidth={1.75} />
                Email
              </a>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const it = await api.post<{ id: string }>('/itineraries', {
                  leadId: lead.id,
                  title: lead.destination
                    ? `${lead.destination} itinerary`
                    : `Itinerary for ${lead.name}`,
                  totalPax:
                    (lead.adults ?? 2) + (lead.children ?? 0),
                });
                router.push(`/itineraries/${it.id}`);
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.message : 'Could not create.',
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            Build itinerary
          </Button>
          {canClose && (
          <CloseLeadDialog
            leadId={lead.id}
            leadName={lead.name}
            onClosed={() => {
              load();
            }}
          >
            <button
              type="button"
              disabled={saving || lead.status === 'LOST'}
              title="Mark as Lost"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-transparent px-3 text-xs font-medium text-ink-400 transition-colors hover:border-loss-500/35 hover:bg-loss-500/8 hover:text-loss-500 disabled:pointer-events-none disabled:opacity-45"
            >
              <UserX className="size-3.5" strokeWidth={1.75} />
              Mark as Lost
            </button>
          </CloseLeadDialog>
          )}
          {canDelete && (
          <DeleteLeadDialog
            leadId={lead.id}
            leadName={lead.name}
            onDeleted={() => {
              router.push('/leads');
            }}
          >
            <button
              type="button"
              disabled={saving}
              title="Permanently delete lead"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink-700 bg-transparent px-3 text-xs font-medium text-ink-400 transition-colors hover:border-loss-500 hover:bg-loss-500/10 hover:text-loss-400 disabled:pointer-events-none disabled:opacity-45"
            >
              <Trash2 className="size-3.5 text-loss-500" strokeWidth={1.75} />
              Delete
            </button>
          </DeleteLeadDialog>
          )}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
        >
          {error}
        </p>
      )}

      {lead.status === 'LOST' && (
        <div className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-loss-400">Lead Closed</h2>
          <p className="mt-1 text-[13px] text-ink-300">
            <span className="font-medium text-ink-400">Reason:</span> {lead.lostReason ?? 'No reason provided.'}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: the conversation */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle>Log what happened</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <div className="flex gap-2">
                <div className="w-[150px]">
                  <Select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    aria-label="Activity type"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {humanise(t)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did they say? Dates, budget, objections — the things you will not remember next week."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="secondary" onClick={generateAiDraft} disabled={generating}>
                  {generating ? 'Drafting...' : 'Draft follow-up'}
                </Button>
                <Button onClick={logActivity} disabled={saving || !note.trim()}>
                  {saving ? 'Saving...' : 'Save entry'}
                </Button>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>History</PanelTitle>
              <span className="tabular text-[11px] text-ink-500">
                {lead.activities.length} entries
              </span>
            </PanelHeader>
            <PanelBody className="pt-1">
              <Timeline items={lead.activities} />
            </PanelBody>
          </Panel>
        </div>

        {/* Right: the facts */}
        <div className="min-w-0 space-y-4">
          <MlLeadScoreCard leadId={lead.id} initialScore={lead.score} />

          <Panel>
            <PanelHeader>
              <PanelTitle>Stage</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="stage">Pipeline stage</Label>
                <Select
                  id="stage"
                  value={lead.status}
                  disabled={saving}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanise(s)}
                    </option>
                  ))}
                </Select>
              </div>

              {canAssign && (
                <div className="space-y-1.5">
                  <Label htmlFor="owner">Owner</Label>
                  <Select
                    id="owner"
                    value={lead.assignedTo?.id ?? ''}
                    disabled={saving}
                    onChange={(e) =>
                      patch({ assignedToId: e.target.value || null })
                    }
                  >
                    <option value="">Unassigned</option>
                    {staff.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="followup">Next follow-up</Label>
                <div className="flex gap-2">
                  <input
                    id="followup"
                    type="date"
                    disabled={saving}
                    value={lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : ''}
                    onChange={(e) =>
                      patch({ nextFollowUp: e.target.value || null })
                    }
                    className="h-9 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 text-[13px] text-ink-100 focus:border-signal-500 focus:outline-none focus:ring-2 focus:ring-signal-500/25"
                  />
                  {lead.nextFollowUp && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => patch({ nextFollowUp: null })}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex gap-1 pt-1">
                  {[
                    { label: 'Tomorrow', days: 1 },
                    { label: '+3d', days: 3 },
                    { label: '+7d', days: 7 },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        patch({ nextFollowUp: d.toISOString().slice(0, 10) });
                      }}
                      className="rounded-md border border-ink-700 bg-transparent px-2 py-0.5 text-[10.5px] text-ink-400 hover:border-ink-600 hover:text-ink-200"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>The trip</PanelTitle>
            </PanelHeader>
            <PanelBody>
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Destination" value={lead.destination} />
                <Row
                  label="Travel date"
                  value={lead.travelDate ? shortDate(lead.travelDate) : null}
                />
                <Row
                  label="Nights"
                  value={lead.nights ? String(lead.nights) : null}
                />
                <Row
                  label="Party"
                  value={
                    lead.adults
                      ? `${lead.adults} adult${lead.adults === 1 ? '' : 's'}${
                          lead.children ? `, ${lead.children} child` : ''
                        }`
                      : null
                  }
                />
                <Row
                  label="Budget"
                  value={lead.budget ? money(lead.budget) : null}
                  mono
                />
              </dl>
              {lead.message && (
                <p className="mt-4 border-t border-ink-800 pt-3 text-[13px] leading-relaxed text-ink-300">
                  {lead.message}
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Score</PanelTitle>
              <ScoreMeter score={lead.score} />
            </PanelHeader>
            {(lead.scoreNotes || lead.heuristicNotes) && (
              <PanelBody className="space-y-2 pt-3">
                {lead.scoreNotes && (
                  <p className="text-[11px] leading-relaxed text-ink-500">{lead.scoreNotes}</p>
                )}
                {lead.heuristicNotes && (
                  <p className="text-[11px] leading-relaxed text-ink-500">{lead.heuristicNotes}</p>
                )}
              </PanelBody>
            )}
          </Panel>

          {/* This panel is why you can trace a booking back to a keyword. */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Where this came from</PanelTitle>
            </PanelHeader>
            <PanelBody>
              {attribution.length === 0 ? (
                <p className="text-[12px] text-ink-500">
                  No campaign data — this lead did not arrive through a tracked link.
                </p>
              ) : (
                <dl className="space-y-2.5 text-[13px]">
                  {attribution.map(([label, value]) => (
                    <Row key={label} label={label} value={value} mono />
                  ))}
                </dl>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-ink-500">
        {label}
      </dt>
      <dd
        className={
          'min-w-0 truncate text-right text-ink-200 ' +
          (mono ? 'tabular text-[12px]' : '')
        }
        title={value ?? undefined}
      >
        {value ?? <span className="text-ink-600">—</span>}
      </dd>
    </div>
  );
}

function ResponseBadge({ lead }: { lead: LeadDetail }) {
  if (lead.firstContactAt) {
    const ms = new Date(lead.firstContactAt).getTime() - new Date(lead.createdAt).getTime();
    const mins = Math.max(0, Math.floor(ms / 60000));
    const hrs = Math.floor(mins / 60);
    const text = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    return (
      <div className="flex w-max items-center gap-1.5 rounded bg-signal-500/10 px-2 py-1 text-[11.5px] font-medium text-signal-400" title="Time to first response">
        <Clock className="size-3.5" />
        First replied in {text}
      </div>
    );
  }

  // Not contacted yet
  const msWait = Date.now() - new Date(lead.createdAt).getTime();
  const minsWait = Math.floor(msWait / 60000);

  if (minsWait > 180 && lead.status === 'NEW') {
    return (
      <div className="flex w-max items-center gap-1.5 rounded bg-loss-500/10 px-2 py-1 text-[11.5px] font-medium text-loss-400" title="Uncontacted for >3 hours">
        <Flame className="size-3.5" />
        High Cold Risk — Not contacted
      </div>
    );
  }

  return null;
}
