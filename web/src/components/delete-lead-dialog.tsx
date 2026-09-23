'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function DeleteLeadDialog({
  leadId,
  leadName,
  onDeleted,
  children,
}: {
  leadId: string;
  leadName: string;
  onDeleted: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await api.del(`/leads/${leadId}`);
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the lead.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label={`Delete ${leadName}`}
            title={`Delete ${leadName}`}
            className="inline-flex size-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-loss-500/12 hover:text-loss-500 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        title={`Delete lead "${leadName}"?`}
        description="This will permanently delete this lead and all its timeline records. This action cannot be undone. If this is a real customer who chose not to book, use 'Mark as Lost' instead to preserve reporting analytics."
      >
        <div className="p-5">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
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
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={handleDelete}
            >
              {busy ? 'Deleting…' : 'Permanently delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
