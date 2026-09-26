'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Bed,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Clock,
  Layers,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  api,
  ApiError,
  type VendorDraftRow,
  type ScrapeDraftStatus,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RowActions } from '@/components/ui/row-actions';
import { ExtractVendorDialog } from '@/components/extract-vendor-dialog';
import { relativeDate } from '@/lib/format';

export default function VendorDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<VendorDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [quickSeedDest, setQuickSeedDest] = useState('all');
  const [seedingBusy, setSeedingBusy] = useState(false);

  // Custom modal states replacing browser prompt() and confirm()
  const [rejectTarget, setRejectTarget] = useState<{ draftId: string; draftName: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const [approveTarget, setApproveTarget] = useState<VendorDraftRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') q.set('status', statusFilter);
    if (cityFilter) q.set('city', cityFilter);
    if (providerFilter) q.set('sourceProvider', providerFilter);

    try {
      const res = await api.get<VendorDraftRow[]>(`/vendor-drafts?${q}`);
      setDrafts(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load property drafts.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cityFilter, providerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Modern Approval Flow
  const handleOpenApprove = (draft: VendorDraftRow) => {
    setApproveTarget(draft);
  };

  const submitApprove = async () => {
    if (!approveTarget) return;
    const draftId = approveTarget.id;
    setBusyActionId(draftId);
    setError(null);
    try {
      const res = await api.post<{ draft: VendorDraftRow; vendor: { id: string; name: string } }>(
        `/vendor-drafts/${draftId}/approve`,
        {},
      );
      setApproveTarget(null);
      setSuccessBanner(`Supplier "${res.vendor.name}" created successfully! Opening supplier file...`);
      setTimeout(() => {
        router.push(`/vendors/${res.vendor.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve draft.');
      setApproveTarget(null);
      load();
    } finally {
      setBusyActionId(null);
    }
  };

  // Modern Rejection Flow
  const handleOpenReject = (draftId: string, draftName: string) => {
    setRejectTarget({ draftId, draftName });
    setRejectNotes('');
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const { draftId } = rejectTarget;
    setBusyActionId(draftId);
    setError(null);
    try {
      await api.post(`/vendor-drafts/${draftId}/reject`, { notes: rejectNotes || undefined });
      setRejectTarget(null);
      setSuccessBanner('Draft marked as rejected.');
      load();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject draft.');
    } finally {
      setBusyActionId(null);
    }
  };

  // AI Re-analysis Flow
  const handleReanalyze = async (draftId: string) => {
    setBusyActionId(draftId);
    setSuccessBanner(null);
    setError(null);
    try {
      const updated = await api.post<VendorDraftRow>(`/vendor-drafts/${draftId}/reanalyze`, {});
      setSuccessBanner(`✨ Property "${updated.name}" re-analyzed with active AI swarm!`);
      await load();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'AI Re-analysis failed.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDelete = async (draftId: string) => {
    try {
      await api.del(`/vendor-drafts/${draftId}`);
      load();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete draft.');
    }
  };

  const handleQuickSeed = async () => {
    setSeedingBusy(true);
    setError(null);
    setSuccessBanner(null);
    try {
      const res = await api.post<{
        destination: string;
        totalAvailable: number;
        seeded: number;
        drafts: VendorDraftRow[];
      }>('/vendor-drafts/seed-destination', {
        destination: quickSeedDest,
      });

      const destLabel =
        quickSeedDest === 'all'
          ? 'All Destinations (Ladakh & Kashmir)'
          : quickSeedDest.toUpperCase();

      setSuccessBanner(
        `⚡ Successfully staged all ${res.seeded} verified operational properties for ${destLabel} into staging review!`,
      );
      await load();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to seed destination directory.');
    } finally {
      setSeedingBusy(false);
    }
  };

  const pendingCount = drafts.filter((d) => d.status === 'PENDING_REVIEW').length;

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-200 transition-colors mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Back to Suppliers
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100 flex items-center gap-2.5">
              Property Intelligence & Staging Drafts
              <Chip className="bg-signal-50 border border-signal-200 text-signal-700 font-semibold text-[11.5px]">
                AI Swarm Engine
              </Chip>
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-400">
              Staging review for hotels, houseboats, and seasonal camps discovered via Firecrawl, Jina Reader & AI Swarm (NVIDIA, Gemini, Groq, OpenRouter).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExtractVendorDialog onExtracted={load} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-500 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successBanner && (
        <div className="mb-4 rounded-md border border-healthy-500/40 bg-healthy-500/10 p-3 text-[13px] text-healthy-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-healthy-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Quick Seed Master Directory Banner */}
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="grid size-6 place-items-center rounded bg-amber-600 text-white shadow-xs">
                <Zap className="size-3.5 fill-white" />
              </div>
              <h2 className="text-[15px] font-bold text-ink-100">
                Instant Destination Seeding (Complete Valley Inventory)
              </h2>
            </div>
            <p className="text-[12.5px] text-ink-400 max-w-2xl leading-relaxed">
              Stage all 73 verified operational properties across Ladakh & Kashmir with room categories (AP, MAP, CP, EP), seasonal validity, and altitude metrics with a single click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <select
              value={quickSeedDest}
              onChange={(e) => setQuickSeedDest(e.target.value)}
              className="rounded-lg border border-ink-700 bg-white px-3 py-2 text-[12.5px] font-medium text-ink-100 shadow-xs hover:border-ink-600 focus:border-signal-500 focus:outline-none"
            >
              <option value="all">🌟 All Destinations (73 Properties)</option>
              <option value="leh">🏰 Leh & Sham Valley (18 Hotels)</option>
              <option value="nubra">🏔️ Nubra Valley (15 Camps)</option>
              <option value="pangong">🌊 Pangong Lake (12 Tents)</option>
              <option value="hanle">🔭 Hanle & Changthang (8 Stays)</option>
              <option value="zanskar">⛰️ Zanskar & Kargil (8 Resorts)</option>
              <option value="srinagar">🛶 Srinagar & Kashmir (12 Houseboats/Hotels)</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              disabled={seedingBusy}
              onClick={handleQuickSeed}
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold shadow-xs h-9 px-4"
            >
              {seedingBusy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Zap className="size-3.5 fill-white" />
                  Seed Destination
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-ink-800/80 py-3">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { value: 'PENDING_REVIEW', label: 'Pending Review', badge: pendingCount > 0 ? pendingCount : undefined },
            { value: 'APPROVED', label: 'Approved & Live' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'ALL', label: 'All Drafts' },
          ].map((t) => {
            const active = statusFilter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setStatusFilter(t.value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? 'border border-signal-600 bg-signal-50 text-signal-700 font-semibold shadow-xs'
                    : 'border border-ink-800 bg-white text-ink-400 hover:text-ink-100 hover:border-ink-700'
                }`}
              >
                {t.label}
                {t.badge !== undefined && (
                  <span className="rounded-full bg-signal-100 px-1.5 py-0.2 text-[10px] font-bold text-signal-700">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* City and provider filters */}
        <div className="flex items-center gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-lg border border-ink-700 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-100 shadow-xs hover:border-ink-600 focus:border-signal-500 focus:outline-none"
          >
            <option value="">All Destinations</option>
            <option value="Srinagar">Srinagar</option>
            <option value="Leh">Leh</option>
            <option value="Nubra">Nubra Valley</option>
            <option value="Pangong">Pangong Lake</option>
            <option value="Kargil">Kargil</option>
            <option value="Zanskar">Zanskar</option>
            <option value="Gulmarg">Gulmarg</option>
            <option value="Pahalgam">Pahalgam</option>
            <option value="Sonamarg">Sonamarg</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg border border-ink-700 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-100 shadow-xs hover:border-ink-600 focus:border-signal-500 focus:outline-none"
          >
            <option value="">All Scrapers & Sources</option>
            <option value="verified_directory">Verified Master Directory</option>
            <option value="firecrawl">Firecrawl</option>
            <option value="jina">Jina Reader</option>
            <option value="scrape_do">scrape.do</option>
            <option value="crawl4ai">Crawl4AI</option>
            <option value="tinyfish">TinyFish</option>
            <option value="direct_fetch">Direct Fetch</option>
          </select>
        </div>
      </div>

      {/* List of drafts */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg border border-ink-800 bg-ink-900/60 shimmer" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <Panel className="p-8 text-center">
          <Sparkles className="mx-auto size-8 text-ink-600 mb-2" strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold text-ink-200">No property drafts found</h3>
          <p className="mt-1 text-[12.5px] text-ink-500 max-w-md mx-auto">
            Use the "Instant Destination Seeding" bar above or the "Scrape Property Intelligence" button to stage hotels, camps, and houseboats.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const isPending = draft.status === 'PENDING_REVIEW';
            const isApproved = draft.status === 'APPROVED';
            const isRejected = draft.status === 'REJECTED';
            const isBusy = busyActionId === draft.id;
            const hasAi = draft.sourceProvider?.includes('ai') || Boolean((draft.rawPayload as any)?.settlementInfo?.confidence);

            // Clean checkin/checkout display without "In null / Out null"
            const hasCheckIn = draft.checkInTime && draft.checkInTime !== 'null';
            const hasCheckOut = draft.checkOutTime && draft.checkOutTime !== 'null';

            return (
              <div
                key={draft.id}
                className="rounded-lg border border-ink-800 bg-ink-900 p-4 transition-colors hover:border-ink-700/80 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink-100">{draft.name}</span>
                      <Chip className="bg-ink-850 text-ink-300 border border-ink-800 font-medium">{draft.propertyType}</Chip>
                      {draft.city && <Chip className="border-ink-700 bg-white text-ink-300 font-medium">{draft.city}</Chip>}
                      {(draft.rawPayload as any)?.settlementInfo?.settlement && (
                        <Chip className="border-emerald-300 bg-emerald-50 text-emerald-800 font-medium">
                          📍 {(draft.rawPayload as any).settlementInfo.settlement}
                        </Chip>
                      )}
                      {(draft.rawPayload as any)?.settlementInfo?.altitudeMeters && (
                        <span className="text-[11px] text-ink-400 font-mono font-semibold">
                          {(draft.rawPayload as any).settlementInfo.altitudeMeters}m
                        </span>
                      )}

                      <Chip className="border-sky-300 bg-sky-50 text-sky-800 font-medium">
                        via {draft.sourceProvider.split('+')[0]}
                      </Chip>

                      {hasAi && (
                        <Chip className="border-purple-300 bg-purple-50 text-purple-800 flex items-center gap-1 text-[11px] font-medium">
                          <Sparkles className="size-3 text-purple-600" />
                          AI Intelligence
                        </Chip>
                      )}

                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          <Clock className="size-3" strokeWidth={2} />
                          Pending Staging Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="size-3" strokeWidth={2} />
                          Approved & Active
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                          <XCircle className="size-3" strokeWidth={2} />
                          Rejected
                        </span>
                      )}
                    </div>

                    {/* Source link */}
                    <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-500">
                      <a
                        href={draft.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-signal-400 hover:underline"
                      >
                        <ExternalLink className="size-3" strokeWidth={1.75} />
                        {draft.sourceUrl.replace(/^https?:\/\//, '').slice(0, 60)}...
                      </a>
                      {draft.createdAt && <span>· Scraped {relativeDate(draft.createdAt)}</span>}
                    </div>

                    {/* Contact & Location details */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-ink-400">
                      {draft.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3.5 text-ink-500" strokeWidth={1.75} />
                          {draft.phone}
                        </span>
                      )}
                      {draft.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3.5 text-ink-500" strokeWidth={1.75} />
                          {draft.email}
                        </span>
                      )}
                      {draft.address && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[360px]">
                          <MapPin className="size-3.5 text-ink-500" strokeWidth={1.75} />
                          {draft.address}
                        </span>
                      )}
                      {(hasCheckIn || hasCheckOut) && (
                        <span className="text-ink-400 flex items-center gap-1">
                          <Clock className="size-3 text-ink-500" />
                          Hours: {hasCheckIn ? `In ${draft.checkInTime}` : ''} {hasCheckOut ? `/ Out ${draft.checkOutTime}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Bed-wise Room Categories */}
                    <div className="mt-3.5 rounded-md border border-ink-800/80 bg-ink-950/60 p-2.5">
                      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1.5 flex items-center gap-1.5">
                        <Bed className="size-3.5 text-signal-400" strokeWidth={1.75} />
                        Discovered Room Categories & Bed-Wise Specs:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(draft.roomCategories) && draft.roomCategories.length > 0 ? (
                          draft.roomCategories.map((rc, idx) => (
                            <div
                              key={idx}
                              className="rounded border border-ink-700/60 bg-ink-900 px-2 py-1 text-[11.5px] text-ink-300 flex items-center gap-2"
                            >
                              <span className="font-semibold text-ink-200">{rc.name}</span>
                              <span className="text-ink-500">
                                (Max {rc.maxOccupancy ?? 3} pax
                                {rc.bedType ? `, ${rc.bedType}` : ''}
                                {rc.extraBedRate ? `, ExBed: ₹${rc.extraBedRate}` : ''})
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[11.5px] text-ink-500 italic">No variants parsed</span>
                        )}
                      </div>
                    </div>

                    {/* Seasonal Dates & Amenities */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12px]">
                      {(draft.seasonalFrom || draft.seasonalTo) && (
                        <div className="flex items-center gap-1.5 text-signal-700 bg-signal-50 px-2.5 py-0.5 rounded border border-signal-200 text-[11.5px] font-medium">
                          <Calendar className="size-3" strokeWidth={2} />
                          Operating Season: {draft.seasonalFrom ? new Date(draft.seasonalFrom).toLocaleDateString() : 'Start'} – {draft.seasonalTo ? new Date(draft.seasonalTo).toLocaleDateString() : 'End'}
                        </div>
                      )}

                      {draft.reportedAmenities && draft.reportedAmenities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-ink-400">
                          <span className="text-ink-500">Reported Amenities:</span>
                          {draft.reportedAmenities.slice(0, 5).map((a, idx) => (
                            <span key={idx} className="rounded bg-ink-850 px-1.5 py-0.5 text-ink-300 border border-ink-800">
                              {a}
                            </span>
                          ))}
                          {draft.reportedAmenities.length > 5 && (
                            <span className="text-ink-500">+{draft.reportedAmenities.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {draft.notes && (
                      <p className="mt-2 text-[11.5px] text-ink-500 italic">Note: {draft.notes}</p>
                    )}
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start">
                    {/* Re-analyze with AI button */}
                    {draft.sourceUrl && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleReanalyze(draft.id)}
                        title="Re-run deep extraction with the AI failover swarm (NVIDIA, Gemini, Groq, OpenRouter)"
                        className="text-signal-700 hover:text-signal-800 border-signal-200 bg-signal-50/60 hover:bg-signal-50 font-medium"
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin text-signal-700" />
                        ) : (
                          <Sparkles className="size-3.5 text-signal-700" strokeWidth={1.75} />
                        )}
                        Re-analyze with AI
                      </Button>
                    )}

                    {isPending && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenApprove(draft)}
                        >
                          <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                          Approve & Add to Suppliers
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleOpenReject(draft.id, draft.name)}
                          className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-medium"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {isApproved && draft.createdVendorId && (
                      <Link href={`/vendors/${draft.createdVendorId}`}>
                        <Button variant="secondary" size="sm">
                          <Building2 className="size-3.5" strokeWidth={1.75} />
                          View Active Supplier →
                        </Button>
                      </Link>
                    )}

                    <RowActions
                      label={`Delete draft ${draft.name}`}
                      confirmMessage={`Permanently remove drafted property "${draft.name}"?`}
                      onDelete={() => handleDelete(draft.id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reject Confirmation Dialog (Replaces browser prompt) ── */}
      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent
          title="Reject Property Draft"
          description={`Mark "${rejectTarget?.draftName}" as rejected and remove it from active review.`}
        >
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400 mb-1.5">
                Rejection Reason or Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. Incomplete pricing, seasonal closure, or duplicate listing..."
                className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 placeholder:text-ink-600 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={submitReject}
                disabled={busyActionId === rejectTarget?.draftId}
                className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
              >
                {busyActionId === rejectTarget?.draftId ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Rejecting…</>
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Approve Confirmation Dialog (Replaces browser confirm) ── */}
      <Dialog open={Boolean(approveTarget)} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent
          title="Approve & Create Active Supplier"
          description={`Convert "${approveTarget?.name}" into an active supplier on the books.`}
        >
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-500">Property Name:</span>
                <span className="font-semibold text-ink-100">{approveTarget?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Location:</span>
                <span className="text-ink-300">{approveTarget?.city || 'Ladakh'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Property Type:</span>
                <span className="text-ink-300">{approveTarget?.propertyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Room Categories:</span>
                <span className="text-ink-300">{approveTarget?.roomCategories?.length ?? 0} variants discovered</span>
              </div>
            </div>
            <p className="text-[11.5px] text-ink-400">
              This will instantiate an active supplier profile with all discovered room specs, phone numbers, and operational dates.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setApproveTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={submitApprove}
                disabled={busyActionId === approveTarget?.id}
              >
                {busyActionId === approveTarget?.id ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Creating Supplier…</>
                ) : (
                  <><ShieldCheck className="size-3.5" /> Confirm & Add to Suppliers</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
