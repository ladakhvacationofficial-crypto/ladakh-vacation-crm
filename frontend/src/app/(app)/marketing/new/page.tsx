'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  MessageSquare,
  Mail,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Info,
  Send,
} from 'lucide-react';
import { api, type AudiencePreviewResult } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';
import { money } from '@/lib/format';

const ALL_STATUSES = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'FUTURE_FOLLOWUP',
  'LOST',
];

const ALL_SOURCES = [
  'META_ADS',
  'GOOGLE_ADS',
  'INSTAGRAM',
  'WALK_IN',
  'REFERRAL',
  'B2B_PARTNER',
  'WEBSITE',
  'OTHER',
];

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');

  // Audience Filter State
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['NEW', 'CONTACTED', 'INTERESTED']);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [minScore, setMinScore] = useState<number>(0);
  const [inactiveDays, setInactiveDays] = useState<number | undefined>(undefined);
  const [destination, setDestination] = useState<string>('');

  // Audience Preview State
  const [preview, setPreview] = useState<AudiencePreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Template State
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState<string>('kashmir_seasonal_offer');
  const [emailSubject, setEmailSubject] = useState('Special Holiday Offer from Ladakh Vacation');
  const [emailHtml, setEmailHtml] = useState(
    `<p>Hello {{name}},</p>\n<p>We have refreshed holiday packages for <strong>{{destination}}</strong> with special seasonal pricing.</p>\n<p>Reply to this email or contact your Ladakh Vacation travel advisor to plan your getaway.</p>`,
  );

  // Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch WhatsApp Templates on mount
  useEffect(() => {
    api
      .get<any[]>('/marketing/templates/whatsapp')
      .then((data) => {
        setWaTemplates(data || []);
        if (data && data.length > 0) {
          setSelectedWaTemplate(data[0].name);
        }
      })
      .catch((err) => console.error('Failed to load WA templates', err));
  }, []);

  // Fetch Live Audience Preview
  const runPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await api.post<AudiencePreviewResult>(
        `/marketing/audience/preview?channel=${channel}`,
        {
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
          minScore: minScore > 0 ? minScore : undefined,
          inactiveDays: inactiveDays && inactiveDays > 0 ? inactiveDays : undefined,
          destination: destination.trim() || undefined,
        },
      );
      setPreview(data);
    } catch (err) {
      console.error('Audience preview error', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [channel, selectedStatuses, selectedSources, minScore, inactiveDays, destination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runPreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [runPreview]);

  const toggleStatus = (st: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st],
    );
  };

  const toggleSource = (src: string) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src],
    );
  };

  const currentTemplateObj = waTemplates.find((t) => t.name === selectedWaTemplate);
  const currentTemplateBody =
    currentTemplateObj?.components?.find((c: any) => c.type === 'BODY')?.text ||
    'Hello {{1}}, explore magical Kashmir with exclusive packages tailored for you. Reply to this message to claim your ₹{{2}} discount!';

  const handleSubmit = async (sendImmediately: boolean) => {
    if (!name.trim()) {
      alert('Please provide a campaign name.');
      return;
    }

    try {
      setSubmitting(true);
      const campaign = await api.post<any>('/marketing/campaigns', {
        name: name.trim(),
        channel,
        audienceFilter: {
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          sources: selectedSources.length > 0 ? selectedSources : undefined,
          minScore: minScore > 0 ? minScore : undefined,
          inactiveDays: inactiveDays && inactiveDays > 0 ? inactiveDays : undefined,
          destination: destination.trim() || undefined,
        },
        templateName: channel === 'WHATSAPP' ? selectedWaTemplate : undefined,
        templateLang: 'en',
        emailSubject: channel === 'EMAIL' ? emailSubject : undefined,
        emailHtml: channel === 'EMAIL' ? emailHtml : undefined,
        scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });

      if (sendImmediately && !isScheduled) {
        await api.post(`/marketing/campaigns/${campaign.id}/send`);
      }

      router.push(`/marketing/${campaign.id}`);
    } catch (err: any) {
      alert(`Failed to create campaign: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="text-ink-400 hover:text-ink-100">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-100">Create Broadcast Campaign</h1>
            <p className="text-[12.5px] text-ink-400">Step {step} of 4</p>
          </div>
        </div>
      </div>

      {/* Wizard Step Progress Header */}
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-ink-800 bg-ink-950 p-2 text-center text-[12px] font-medium">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            step === 1 ? 'bg-signal-600 text-white font-semibold' : step > 1 ? 'text-healthy-400 hover:bg-ink-900' : 'text-ink-500'
          }`}
        >
          {step > 1 ? <Check className="size-3.5" /> : <span>1.</span>} Channel & Name
        </button>

        <button
          onClick={() => setStep(2)}
          disabled={!name.trim()}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            step === 2 ? 'bg-signal-600 text-white font-semibold' : step > 2 ? 'text-healthy-400 hover:bg-ink-900' : 'text-ink-500'
          }`}
        >
          {step > 2 ? <Check className="size-3.5" /> : <span>2.</span>} Audience Builder
        </button>

        <button
          onClick={() => setStep(3)}
          disabled={!name.trim()}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            step === 3 ? 'bg-signal-600 text-white font-semibold' : step > 3 ? 'text-healthy-400 hover:bg-ink-900' : 'text-ink-500'
          }`}
        >
          {step > 3 ? <Check className="size-3.5" /> : <span>3.</span>} Template & Content
        </button>

        <button
          onClick={() => setStep(4)}
          disabled={!name.trim()}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 transition ${
            step === 4 ? 'bg-signal-600 text-white font-semibold' : 'text-ink-500'
          }`}
        >
          <span>4.</span> Review & Dispatch
        </button>
      </div>

      {/* STEP 1: Channel & Name */}
      {step === 1 && (
        <Panel className="border-ink-800 bg-ink-950">
          <PanelHeader className="border-b border-ink-800 px-6 py-4">
            <PanelTitle>Select Channel & Campaign Details</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-6 px-6 py-6">
            <div>
              <Label className="text-[13px] text-ink-300">Campaign Name</Label>
              <Input
                placeholder="e.g. Kashmir Autumn Fest — Re-engagement Broadcast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-ink-900 border-ink-700 text-ink-100 placeholder:text-ink-600"
              />
              <p className="mt-1 text-[11px] text-ink-500">
                An internal name to identify this broadcast in reports and analytics.
              </p>
            </div>

            <div>
              <Label className="text-[13px] text-ink-300">Broadcast Channel</Label>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* WhatsApp Option */}
                <div
                  onClick={() => setChannel('WHATSAPP')}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    channel === 'WHATSAPP'
                      ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500'
                      : 'border-ink-800 bg-ink-900/40 hover:border-ink-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-emerald-900/60 p-2 text-emerald-300">
                        <MessageSquare className="size-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-100">WhatsApp Cloud API</p>
                        <p className="text-[11px] text-emerald-400 font-medium">98% Open Rate · High Intent</p>
                      </div>
                    </div>
                    {channel === 'WHATSAPP' && <Check className="size-4 text-emerald-400" />}
                  </div>
                  <p className="mt-3 text-[12px] text-ink-400">
                    Sends official Meta-approved marketing templates directly to traveler WhatsApp chats. Cost: ~₹0.72 / contact.
                  </p>
                </div>

                {/* Email Option */}
                <div
                  onClick={() => setChannel('EMAIL')}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    channel === 'EMAIL'
                      ? 'border-sky-500 bg-sky-950/30 ring-1 ring-sky-500'
                      : 'border-ink-800 bg-ink-900/40 hover:border-ink-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-sky-900/60 p-2 text-sky-300">
                        <Mail className="size-5 text-sky-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-100">Brevo Email Broadcast</p>
                        <p className="text-[11px] text-sky-400 font-medium">Rich HTML Itineraries · Zero Cost</p>
                      </div>
                    </div>
                    {channel === 'EMAIL' && <Check className="size-4 text-sky-400" />}
                  </div>
                  <p className="mt-3 text-[12px] text-ink-400">
                    Dispatches branded HTML email newsletters and itinerary promos with automatic one-click unsubscribe links.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                disabled={!name.trim()}
                onClick={() => setStep(2)}
                className="bg-signal-600 hover:bg-signal-500 text-white gap-2 font-medium"
              >
                Proceed to Audience Builder
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </PanelBody>
        </Panel>
      )}

      {/* STEP 2: Audience Builder */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Filters */}
          <div className="space-y-6 lg:col-span-2">
            <Panel className="border-ink-800 bg-ink-950">
              <PanelHeader className="border-b border-ink-800 px-6 py-4">
                <PanelTitle className="flex items-center gap-2">
                  <Users className="size-4 text-signal-500" />
                  Audience Segmentation Filters
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="space-y-6 px-6 py-6">
                {/* Lead Statuses */}
                <div>
                  <Label className="text-[13px] text-ink-300">Lead Pipeline Stages</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ALL_STATUSES.map((st) => {
                      const isSel = selectedStatuses.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleStatus(st)}
                          className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                            isSel
                              ? 'border-signal-500 bg-signal-950/60 text-signal-300'
                              : 'border-ink-800 bg-ink-900/40 text-ink-400 hover:border-ink-700'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lead Sources */}
                <div>
                  <Label className="text-[13px] text-ink-300">Lead Ingestion Sources</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ALL_SOURCES.map((src) => {
                      const isSel = selectedSources.includes(src);
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => toggleSource(src)}
                          className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                            isSel
                              ? 'border-signal-500 bg-signal-950/60 text-signal-300'
                              : 'border-ink-800 bg-ink-900/40 text-ink-400 hover:border-ink-700'
                          }`}
                        >
                          {src.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Destination & Inactivity */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-[13px] text-ink-300">Destination Keyword</Label>
                    <Input
                      placeholder="e.g. Kashmir, Ladakh, Gulmarg"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="mt-1.5 bg-ink-900 border-ink-700 text-ink-100 text-[13px]"
                    />
                  </div>

                  <div>
                    <Label className="text-[13px] text-ink-300">Inactivity (Days since last contact)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 14 (contacted >14 days ago)"
                      value={inactiveDays || ''}
                      onChange={(e) => setInactiveDays(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="mt-1.5 bg-ink-900 border-ink-700 text-ink-100 text-[13px]"
                    />
                  </div>
                </div>

                {/* Minimum Lead Score */}
                <div>
                  <div className="flex justify-between">
                    <Label className="text-[13px] text-ink-300">Minimum Lead Score</Label>
                    <span className="text-[12px] font-semibold text-signal-400">{minScore} pts</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    className="mt-2 w-full accent-signal-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ink-500">
                    <span>All Leads (0)</span>
                    <span>High Intent Only (80+)</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="secondary" onClick={() => setStep(1)} className="border-ink-800 text-ink-300">
                    Back
                  </Button>
                  <Button
                    disabled={!preview || preview.eligibleCount === 0}
                    onClick={() => setStep(3)}
                    className="bg-signal-600 hover:bg-signal-500 text-white gap-2 font-medium"
                  >
                    Configure Template
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </PanelBody>
            </Panel>
          </div>

          {/* Right Col: Live Audience Estimate Box */}
          <div className="space-y-4">
            <Panel className="border-ink-800 bg-ink-950/80 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                  Live Audience Preview
                </p>
                {previewLoading && <span className="text-[11px] text-signal-400 animate-pulse">Updating…</span>}
              </div>

              <div className="mt-4 rounded-xl border border-ink-800 bg-ink-900/60 p-4 text-center">
                <p className="text-[11px] text-ink-400">Eligible Recipients</p>
                <p className="mt-1 text-3xl font-black text-emerald-400">
                  {preview ? preview.eligibleCount : 0}
                </p>
                {channel === 'WHATSAPP' && (
                  <p className="mt-2 text-[12px] font-medium text-amber-300/90">
                    Estimated Cost: {preview ? money(preview.estimatedCost) : '₹0'}
                  </p>
                )}
              </div>

              {/* Guardrails Breakdown */}
              <div className="mt-4 space-y-2 text-[12px] border-t border-ink-800 pt-3">
                <div className="flex justify-between text-ink-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-healthy-400" />
                    Total Matched Leads
                  </span>
                  <span className="font-semibold">{preview?.totalMatched ?? 0}</span>
                </div>

                <div className="flex justify-between text-ink-400">
                  <span className="flex items-center gap-1.5 text-amber-400/90">
                    <ShieldCheck className="size-3.5 text-amber-400" />
                    7-Day Frequency Capped
                  </span>
                  <span>-{preview?.frequencyCappedCount ?? 0}</span>
                </div>

                <div className="flex justify-between text-ink-400">
                  <span className="flex items-center gap-1.5 text-loss-400/90">
                    <AlertTriangle className="size-3.5 text-loss-400" />
                    Marketing Opt-Outs
                  </span>
                  <span>-{preview?.optOutCount ?? 0}</span>
                </div>
              </div>

              {/* Sample Leads */}
              {preview && preview.sampleLeads && preview.sampleLeads.length > 0 && (
                <div className="mt-5 border-t border-ink-800 pt-3">
                  <p className="text-[11px] font-semibold text-ink-400">Sample Target Leads</p>
                  <div className="mt-2 space-y-1.5">
                    {preview.sampleLeads.map((l) => (
                      <div key={l.id} className="rounded-md border border-ink-800/80 bg-ink-900/40 px-2.5 py-1.5 text-[11px]">
                        <p className="font-medium text-ink-200">{l.name}</p>
                        <p className="text-[10px] text-ink-500">
                          {channel === 'WHATSAPP' ? l.phone : l.email || 'No email'} · {l.destination || 'Kashmir'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* STEP 3: Template & Content */}
      {step === 3 && (
        <Panel className="border-ink-800 bg-ink-950">
          <PanelHeader className="border-b border-ink-800 px-6 py-4">
            <PanelTitle>
              {channel === 'WHATSAPP' ? 'Select WhatsApp Approved Template' : 'Compose Email Message'}
            </PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-6 px-6 py-6">
            {channel === 'WHATSAPP' ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-[13px] text-ink-300">Pre-Approved Meta Template</Label>
                  <select
                    value={selectedWaTemplate}
                    onChange={(e) => setSelectedWaTemplate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-[13px] font-medium text-ink-100 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  >
                    {waTemplates.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-ink-500">
                    Meta requires pre-approved templates for outbound marketing messages outside the 24-hour customer window.
                  </p>
                </div>

                {/* WhatsApp Chat Preview */}
                <div>
                  <Label className="text-[13px] text-ink-300">Live WhatsApp Chat Bubble Preview</Label>
                  <div className="mt-2 max-w-md rounded-2xl border border-emerald-900/60 bg-[#0B141A] p-4 font-sans text-white shadow-lg">
                    <div className="flex items-center gap-2 border-b border-emerald-900/40 pb-2 text-[12px] font-semibold text-emerald-400">
                      <MessageSquare className="size-4" />
                      Ladakh Vacation (Verified Business)
                    </div>

                    <div className="mt-3 rounded-xl bg-[#202C33] p-3 text-[13px] leading-relaxed text-zinc-100">
                      {currentTemplateBody}
                      <div className="mt-2 text-right text-[10px] text-zinc-400">12:30 PM ✓✓</div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Parameters:</span>
                      <span className="text-emerald-400 font-mono">{'{{1}} = Traveler Name, {{2}} = Destination'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-[13px] text-ink-300">Email Subject Line</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="mt-1.5 bg-ink-900 border-ink-700 text-ink-100"
                  />
                </div>

                <div>
                  <Label className="text-[13px] text-ink-300">Email HTML Content (Supports {'{{name}}'}, {'{{destination}}'})</Label>
                  <textarea
                    rows={8}
                    value={emailHtml}
                    onChange={(e) => setEmailHtml(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-900 p-3 font-mono text-[12.5px] text-ink-100 focus:outline-none focus:ring-1 focus:ring-signal-500"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    A legal one-click unsubscribe footer will be automatically appended to each outbound email.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(2)} className="border-ink-800 text-ink-300">
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-signal-600 hover:bg-signal-500 text-white gap-2 font-medium"
              >
                Review & Schedule
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </PanelBody>
        </Panel>
      )}

      {/* STEP 4: Review & Dispatch */}
      {step === 4 && (
        <Panel className="border-ink-800 bg-ink-950">
          <PanelHeader className="border-b border-ink-800 px-6 py-4">
            <PanelTitle>Review Broadcast & Dispatch</PanelTitle>
          </PanelHeader>
          <PanelBody className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-ink-800 bg-ink-900/40 p-4">
              <div>
                <p className="text-[11px] text-ink-500">Campaign Name</p>
                <p className="font-semibold text-ink-100">{name}</p>
              </div>

              <div>
                <p className="text-[11px] text-ink-500">Channel</p>
                <p className="font-semibold text-ink-100">{channel}</p>
              </div>

              <div>
                <p className="text-[11px] text-ink-500">Target Recipients</p>
                <p className="text-xl font-bold text-emerald-400">{preview?.eligibleCount || 0}</p>
              </div>

              <div>
                <p className="text-[11px] text-ink-500">Estimated Cost</p>
                <p className="text-xl font-bold text-amber-400">
                  {channel === 'WHATSAPP' ? money(preview?.estimatedCost || 0) : '₹0'}
                </p>
              </div>
            </div>

            {/* Schedule Option */}
            <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink-100">Schedule Broadcast for Later</p>
                  <p className="text-[12px] text-ink-400">
                    Automatically trigger campaign at a specific date and time.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="size-5 rounded border-ink-700 bg-ink-900 text-signal-600 focus:ring-signal-500 cursor-pointer"
                />
              </div>

              {isScheduled && (
                <div className="pt-2">
                  <Label className="text-[12px] text-ink-300">Execution Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 bg-ink-900 border-ink-700 text-ink-100 text-[13px] max-w-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-ink-800">
              <Button variant="secondary" onClick={() => setStep(3)} className="border-ink-800 text-ink-300">
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="border-ink-700 text-ink-200"
                >
                  Save as Draft
                </Button>

                <Button
                  disabled={submitting || (isScheduled && !scheduledAt)}
                  onClick={() => handleSubmit(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow-sm"
                >
                  {isScheduled ? <Clock className="size-4" /> : <Send className="size-4" />}
                  {isScheduled ? 'Schedule Campaign' : 'Send Immediately'}
                </Button>
              </div>
            </div>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
