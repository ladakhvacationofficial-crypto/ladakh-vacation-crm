'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, GitCompare, RotateCcw, Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { api, ApiError, type ItineraryRevisionRow } from '@/lib/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { shortDate, relativeDate, money } from '@/lib/format';

export function RevisionsDialog({
  itineraryId,
  open,
  onClose,
  onRestored,
}: {
  itineraryId: string;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [revisions, setRevisions] = useState<ItineraryRevisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Snapshot creation state
  const [createMode, setCreateMode] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);

  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [fromRevId, setFromRevId] = useState<string>('');
  const [toRevId, setToRevId] = useState<string>('');
  const [comparison, setComparison] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);

  const loadRevisions = useCallback(async () => {
    if (!open) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ItineraryRevisionRow[]>(`/itineraries/${itineraryId}/revisions`);
      setRevisions(res);
      if (res.length >= 2) {
        setFromRevId(res[res.length - 1].id);
        setToRevId(res[0].id);
      }
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Failed to load revisions.');
    } finally {
      setLoading(false);
    }
  }, [itineraryId, open]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  async function handleCreateRevision() {
    if (!changeSummary.trim()) {
      alert('Please enter a brief note describing what changed in this version.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/itineraries/${itineraryId}/revisions`, {
        changeSummary: changeSummary.trim(),
      });
      setChangeSummary('');
      setCreateMode(false);
      loadRevisions();
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to save revision snapshot');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(rev: ItineraryRevisionRow) {
    if (
      !confirm(
        `Restore Itinerary to Version ${rev.revisionNumber}? Current days, items, and pricing tiers will be replaced with this snapshot.`,
      )
    ) {
      return;
    }
    try {
      await api.post(`/itineraries/${itineraryId}/revisions/${rev.id}/restore`, {});
      onRestored();
      onClose();
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to restore revision');
    }
  }

  async function runCompare() {
    if (!fromRevId || !toRevId) return;
    setComparing(true);
    try {
      const res = await api.get(
        `/itineraries/${itineraryId}/revisions/compare?from=${fromRevId}&to=${toRevId}`,
      );
      setComparison(res);
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to compare revisions');
    } finally {
      setComparing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Quote Revisions & Historical Snapshots" className="max-w-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-ink-400">Preserved quote milestones and version diffs</span>
            <div className="flex gap-2">
              {revisions.length >= 2 && (
                <Button
                  variant={compareMode ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (!compareMode) runCompare();
                  }}
                >
                  <GitCompare className="size-3.5" />
                  {compareMode ? 'List View' : 'Compare Diff'}
                </Button>
              )}
              {!createMode && (
                <Button variant="secondary" size="sm" onClick={() => setCreateMode(true)}>
                  <Plus className="size-3.5" />
                  Snapshot Current
                </Button>
              )}
            </div>
          </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Snapshot creator */}
        {createMode && (
          <Panel className="p-4 bg-ink-850/50 border border-brand-500/30">
            <p className="text-[13px] font-semibold text-ink-100">
              Save Snapshot as Revision #{revisions.length + 1}
            </p>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Freezes the entire day-by-day plan, hotel rates, inclusions, and client quotation.
            </p>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="What changed? e.g. Upgraded to 4-star Nubra camp, added Turtuk day trip..."
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="text-[13px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setCreateMode(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateRevision} disabled={saving}>
                  {saving ? 'Freezing snapshot...' : 'Save Revision'}
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {/* Compare Mode */}
        {compareMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-ink-800 bg-ink-900">
              <div className="space-y-1">
                <Label>From Revision</Label>
                <select
                  value={fromRevId}
                  onChange={(e) => setFromRevId(e.target.value)}
                  className="w-full h-8 rounded border border-ink-700 bg-ink-950 px-2 text-xs text-ink-200"
                >
                  {revisions.map((r) => (
                    <option key={r.id} value={r.id}>
                      v{r.revisionNumber} ({shortDate(r.createdAt)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>To Revision</Label>
                <select
                  value={toRevId}
                  onChange={(e) => setToRevId(e.target.value)}
                  className="w-full h-8 rounded border border-ink-700 bg-ink-950 px-2 text-xs text-ink-200"
                >
                  {revisions.map((r) => (
                    <option key={r.id} value={r.id}>
                      v{r.revisionNumber} ({shortDate(r.createdAt)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={runCompare} disabled={comparing}>
              {comparing ? 'Comparing...' : 'Recalculate Diff'}
            </Button>

            {comparison && (
              <div className="rounded-lg border border-ink-800 p-4 space-y-3 bg-ink-900">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-ink-850">
                    <p className="text-ink-500">Days Difference</p>
                    <p className="font-semibold text-ink-100 text-sm">
                      {comparison.diff?.daysDiff > 0 ? `+${comparison.diff.daysDiff}` : comparison.diff?.daysDiff} days
                    </p>
                  </div>
                  <div className="p-2 rounded bg-ink-850">
                    <p className="text-ink-500">Pax Difference</p>
                    <p className="font-semibold text-ink-100 text-sm">
                      {comparison.diff?.paxDiff > 0 ? `+${comparison.diff.paxDiff}` : comparison.diff?.paxDiff} pax
                    </p>
                  </div>
                  <div className="p-2 rounded bg-ink-850">
                    <p className="text-ink-500">Quoted Price Diff</p>
                    <p
                      className={`font-semibold text-sm ${
                        (comparison.diff?.priceDiff || 0) >= 0 ? 'text-healthy-400' : 'text-warn-400'
                      }`}
                    >
                      {money(comparison.diff?.priceDiff || 0)}
                    </p>
                  </div>
                </div>

                <div className="text-[12px] text-ink-300">
                  <p>
                    <b>v{comparison.from?.revisionNumber} notes:</b> {comparison.from?.changeSummary ?? 'Initial draft'}
                  </p>
                  <p className="mt-1">
                    <b>v{comparison.to?.revisionNumber} notes:</b> {comparison.to?.changeSummary ?? 'Initial draft'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revisions List */}
        {!compareMode && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center py-8 text-xs text-ink-400">Loading version history...</p>
            ) : revisions.length === 0 ? (
              <div className="text-center py-8 text-ink-400">
                <History className="mx-auto size-7 text-ink-600 mb-2" />
                <p className="text-[13px] text-ink-200">No revisions captured yet</p>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Click &ldquo;Snapshot Current&rdquo; above to freeze this quote before sending to client.
                </p>
              </div>
            ) : (
              revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-ink-800 bg-ink-900/60 hover:bg-ink-850/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-100">Version {rev.revisionNumber}</span>
                      <Chip className="text-[10px]">{shortDate(rev.createdAt)}</Chip>
                      {rev.createdBy && (
                        <span className="text-[11px] text-ink-500">by {rev.createdBy.name}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-300 mt-1">
                      {rev.changeSummary ?? 'Customer proposal milestone snapshot'}
                    </p>
                    <div className="flex gap-3 text-[11px] text-ink-500 mt-1 tabular">
                      <span>{rev.totalPax} pax</span>
                      <span>·</span>
                      <span>{(rev.snapshot as any)?.days?.length ?? '—'} days</span>
                      {rev.totalSell ? (
                        <>
                          <span>·</span>
                          <span className="text-brand-400 font-semibold">{money(rev.totalSell)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(rev)}
                      title="Restore Itinerary to this version"
                    >
                      <RotateCcw className="size-3.5" />
                      Restore
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex items-center justify-end gap-2 border-t border-ink-800 bg-ink-900 px-5 pb-5 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
