'use client';
import { useState, useEffect } from 'react';
import { api, tokenStore } from '@/lib/api';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Inbox } from 'lucide-react';
import { relativeDate } from '@/lib/format';

export function ApprovalsDialog({ onResolved }: { onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const user = tokenStore.user();
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (open && isOwner) {
      setLoading(true);
      api.get('/leads/approvals/pending')
        .then((res: any) => setRequests(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, isOwner]);

  async function review(id: string, approve: boolean) {
    try {
      await api.post(`/leads/approvals/${id}/review`, { approve });
      setRequests((prev) => prev.filter(r => r.id !== id));
      onResolved();
    } catch (err) {
      console.error(err);
    }
  }

  if (!isOwner) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Inbox className="mr-2 size-4" />
          Approvals
        </Button>
      </DialogTrigger>
      <DialogContent title="Pending Approvals" description="Review requests to close leads.">
        <div className="p-5 space-y-4">
          {loading ? (
            <p className="text-ink-500 text-sm">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-ink-500 text-sm">No pending requests.</p>
          ) : (
            requests.map(req => (
              <div key={req.id} className="border border-ink-800 rounded p-3 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{req.lead.name}</span>
                  <span className="text-ink-500 text-xs">{relativeDate(req.createdAt)}</span>
                </div>
                <p className="text-ink-400 mt-1">Requested by {req.requestedBy.name}</p>
                <div className="mt-2 bg-ink-900 p-2 rounded text-ink-300 italic">
                  "{req.reason}"
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => review(req.id, false)}>
                    <X className="size-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => review(req.id, true)}>
                    <Check className="size-4 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
