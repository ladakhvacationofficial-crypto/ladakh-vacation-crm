'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, ApiError, tokenStore, type UserRow } from '@/lib/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { INBOUND_MEDIUMS, MARKETING_CHANNELS } from '@/lib/constants';

/**
 * Manual lead capture — the "customer just called / messaged" flow.
 *
 * Only NAME and PHONE are required. Separates the Inbound Medium
 * (Phone, WhatsApp, Form, Email) from the Marketing Channel
 * (Google Ads, Meta Ads, Organic, Referral).
 */
const CAN_ASSIGN_ROLES = new Set(['OWNER', 'SUPER_ADMIN']);

export function AddLeadDialog({ onCreated }: { onCreated: (leadId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserRow[]>([]);
  const canAssign = useMemo(() => CAN_ASSIGN_ROLES.has(tokenStore.user()?.role ?? ''), []);

  useEffect(() => {
    if (!canAssign || !open) return;
    api.get<UserRow[]>('/users').then((u) => setStaff(u.filter((x) => x.isActive))).catch(() => setStaff([]));
  }, [canAssign, open]);

  // Split fields per common data-entry order (contact -> trip -> notes) rather
  // than schema order — an operator on a call reads their form top-to-bottom.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [inboundMedium, setInboundMedium] = useState<string>('PHONE');
  const [marketingChannel, setMarketingChannel] = useState<string>('GOOGLE_ADS');
  const [campaign, setCampaign] = useState('');
  const [destination, setDestination] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [address, setAddress] = useState('');
  const [b2bPartnerId, setB2bPartnerId] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [travelDate, setTravelDate] = useState('');
  const [nights, setNights] = useState('');
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  function reset() {
    setName('');
    setPhone('');
    setEmail('');
    setInboundMedium('PHONE');
    setMarketingChannel('GOOGLE_ADS');
    setCampaign('');
    setDestination('');
    setTravelDate('');
    setNights('');
    setAdults('');
    setChildren('');
    setBudget('');
    setMessage('');
    setAssignedToId('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        source: inboundMedium,
        utmSource: marketingChannel,
      };
      if (campaign.trim()) body.campaign = campaign.trim();
      if (email.trim()) body.email = email.trim();
      if (destination.trim()) body.destination = destination.trim();
      if (travelDate) body.travelDate = travelDate;
      if (nights) body.nights = Number(nights);
      if (adults) body.adults = Number(adults);
      if (children) body.children = Number(children);
      if (budget) body.budget = Number(budget);
      if (message.trim()) body.message = message.trim();
      if (canAssign && assignedToId) body.assignedToId = assignedToId;

      const res = await api.post<{ leadId: string; duplicate: boolean }>(
        '/leads',
        body,
      );
      setOpen(false);
      reset();
      if (res.duplicate) {
        alert('Notice: A lead with this phone number already exists in the system. Opening their existing client profile.');
      }
      onCreated(res.leadId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the lead.');
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
        <Button size="sm">
          <Plus className="size-4" strokeWidth={1.75} />
          Add lead
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Add lead"
        description="For phone-ins, walk-ins, or a WhatsApp that came directly to you. Defaults to you; owner/manager can assign to any sales exec."
      >
        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="al-name">Name *</Label>
              <Input
                id="al-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aditya Sharma"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-phone">Phone *</Label>
              <Input
                id="al-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-email">Email</Label>
              <Input
                id="al-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-medium">Inbound Medium *</Label>
              <Select
                id="al-medium"
                value={inboundMedium}
                onChange={(e) => setInboundMedium(e.target.value)}
              >
                {INBOUND_MEDIUMS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-channel">Marketing Channel</Label>
              <Select
                id="al-channel"
                value={marketingChannel}
                onChange={(e) => setMarketingChannel(e.target.value)}
              >
                {MARKETING_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-dest">Destination</Label>
              <Input
                id="al-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Kashmir, Ladakh, Sonmarg…"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-date">Travel date</Label>
              <Input
                id="al-date"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-nights">Nights</Label>
              <Input
                id="al-nights"
                type="number"
                min={0}
                value={nights}
                onChange={(e) => setNights(e.target.value)}
                placeholder="5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="al-adults">Adults</Label>
                <Input
                  id="al-adults"
                  type="number"
                  min={0}
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="al-kids">Children</Label>
                <Input
                  id="al-kids"
                  type="number"
                  min={0}
                  value={children}
                  onChange={(e) => setChildren(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="al-budget">Budget (₹)</Label>
              <Input
                id="al-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="80000"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="al-msg">Notes</Label>
              <Textarea
                id="al-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did they ask about? Any special requests?"
                rows={3}
              />
            </div>

            {canAssign && (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="al-assign">Assign to</Label>
                <Select
                  id="al-assign"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">Me (default)</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-400"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={busy || !name.trim() || !phone.trim()}
            >
              {busy ? 'Saving…' : 'Save lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
