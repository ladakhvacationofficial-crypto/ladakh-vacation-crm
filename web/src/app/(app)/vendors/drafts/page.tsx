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
import { RowActions } from '@/components/ui/row-actions';
import { ExtractVendorDialog } from '@/components/extract-vendor-dialog';
import { relativeDate } from '@/lib/format';

export default function VendorDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<VendorDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

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

  const handleApprove = async (draftId: string) => {
    if (!confirm('Approve this drafted property and create an active Supplier on the books?')) {
      return;
    }
    setBusyActionId(draftId);
    try {
      const res = await api.post<{ draft: VendorDraftRow; vendor: { id: string; name: string } }>(
        `/vendor-drafts/${draftId}/approve`,
        {},
      );
      alert(`Supplier "${res.vendor.name}" created successfully! Opening supplier file...`);
      router.push(`/vendors/${res.vendor.id}`);
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Failed to approve draft.');
      setBusyActionId(null);
      load();
    }
  };

  const handleReject = async (draftId: string) => {
    const reason = prompt('Rejection reason or notes (optional):');
    if (reason === null) return;
    setBusyActionId(draftId);
    try {
      await api.post(`/vendor-drafts/${draftId}/reject`, { notes: reason });
      load();
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Failed to reject draft.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDelete = async (draftId: string) => {
    try {
      await api.del(`/vendor-drafts/${draftId}`);
      load();
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete draft.');
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
              <Chip className="bg-signal-500/15 border-signal-500/40 text-signal-400">
                Swarm Engine
              </Chip>
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-400">
              Staging review for hotels, houseboats, and seasonal camps discovered via Firecrawl, Jina Reader, scrape.do, Crawl4AI, and TinyFish.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExtractVendorDialog onExtracted={load} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-500">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-ink-800/60 py-3">
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1">
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
                    ? 'border border-signal-500 bg-signal-500/15 text-signal-500'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                {t.label}
                {t.badge !== undefined && (
                  <span className="rounded-full bg-signal-500/20 px-1.5 py-0.2 text-[10px] text-signal-400">
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
            className="rounded-md border border-ink-800 bg-ink-950 px-2.5 py-1 text-[12px] text-ink-300 focus:border-signal-500 focus:outline-none"
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
            className="rounded-md border border-ink-800 bg-ink-950 px-2.5 py-1 text-[12px] text-ink-300 focus:border-signal-500 focus:outline-none"
          >
            <option value="">All Scrapers</option>
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
            Use the "Scrape Property Intelligence" button above to extract hotel specifications, room variants, and seasonal dates from web URLs.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const isPending = draft.status === 'PENDING_REVIEW';
            const isApproved = draft.status === 'APPROVED';
            const isRejected = draft.status === 'REJECTED';
            const isBusy = busyActionId === draft.id;

            return (
              <div
                key={draft.id}
                className="rounded-lg border border-ink-800 bg-ink-900 p-4 transition-colors hover:border-ink-700/80 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink-100">{draft.name}</span>
                      <Chip className="bg-ink-800 text-ink-300">{draft.propertyType}</Chip>
                      {draft.city && <Chip className="border-ink-700 text-ink-400">{draft.city}</Chip>}
                      <Chip className="border-sky-500/30 bg-sky-500/10 text-sky-400">
                        via {draft.sourceProvider}
                      </Chip>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                          <Clock className="size-3" strokeWidth={2} />
                          Pending Staging Review
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="size-3" strokeWidth={2} />
                          Approved & Active
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
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
                      {draft.checkInTime && draft.checkOutTime && (
                        <span className="text-ink-500">
                          Hours: In {draft.checkInTime} / Out {draft.checkOutTime}
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
                        <div className="flex items-center gap-1.5 text-signal-400 bg-signal-500/10 px-2.5 py-0.5 rounded border border-signal-500/20 text-[11.5px]">
                          <Calendar className="size-3" strokeWidth={2} />
                          Operating Season: {draft.seasonalFrom ? new Date(draft.seasonalFrom).toLocaleDateString() : 'Start'} – {draft.seasonalTo ? new Date(draft.seasonalTo).toLocaleDateString() : 'End'}
                        </div>
                      )}

                      {draft.reportedAmenities && draft.reportedAmenities.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-ink-400">
                          <span className="text-ink-500">Reported Amenities:</span>
                          {draft.reportedAmenities.slice(0, 5).map((a, idx) => (
                            <span key={idx} className="rounded bg-ink-800/80 px-1.5 py-0.5 text-ink-300">
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
                    {isPending && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleApprove(draft.id)}
                        >
                          <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                          Approve & Add to Suppliers
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleReject(draft.id)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
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
    </div>
  );
}
