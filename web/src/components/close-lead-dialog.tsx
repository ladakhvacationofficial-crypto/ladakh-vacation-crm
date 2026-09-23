'use client';

import { useState } from 'react';
import { api, ApiError, tokenStore } from '@/lib/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { UserX } from 'lucide-react';

const PRESET_REASONS = [
  'Booked with a competitor',
  'Budget mismatch / price too high',
  'Postponed or cancelled trip plans',
  'Changed travel destination',
  'No response after multiple follow-ups',
  'Test enquiry or invalid contact details',
  'Other reason',
];

export function CloseLeadDialog({
  leadId,
  leadName,
  onClosed,
  children,
}: {
  leadId: string;
  leadName: string;
  onClosed: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(PRESET_REASONS[0]);
  const [notes, setNotes] = useState('');

  const user = tokenStore.user();
  const isManager = user?.role === 'SALES_MANAGER';

  function reset() {
    setCategory(PRESET_REASONS[0]);
    setNotes('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalReason = notes.trim()
      ? `${category}: ${notes.trim()}`
      : category;

    setBusy(true);
    setError(null);
    try {
      await api.post(`/leads/${leadId}/${isManager ? 'close-request' : 'close'}`, { reason: finalReason });
      setOpen(false);
      reset();
      onClosed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark lead as lost.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label={`Mark ${leadName} as Lost`}
            title={`Mark ${leadName} as Lost`}
            className="inline-flex size-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-loss-500/12 hover:text-loss-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <UserX className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        title={isManager ? `Request to Mark "${leadName}" as Lost` : `Mark "${leadName}" as Lost`}
        description={
          isManager
            ? "Submit a request to the owner to close this enquiry as lost while keeping reporting data."
            : "Update this enquiry to LOST. Your selection will feed conversion analytics and pipeline reports."
        }
      >
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="lost-category">Primary Reason *</Label>
            <Select
              id="lost-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lost-notes">Additional Context / Details</Label>
            <Textarea
              id="lost-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Quoted ₹48,000 for 5N; customer booked with local agency at ₹42,000."
              rows={3}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={busy}
            >
              {busy
                ? (isManager ? 'Submitting…' : 'Marking as lost…')
                : (isManager ? 'Submit close request' : 'Mark as Lost')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
