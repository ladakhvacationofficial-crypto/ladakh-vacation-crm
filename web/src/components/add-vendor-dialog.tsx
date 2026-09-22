'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { VENDOR_TYPES, humanise } from '@/lib/constants';

/**
 * New supplier. Contact + bank fields are collected here because they're
 * write-once (once entered, only the owner sees them); rates get added on
 * the detail page where a live table is easier.
 *
 * Hotel/camp/houseboat types unlock the property panel (check-in/out, room count,
 * amenities). Everything else keeps a lean form.
 */
const COMMON_AMENITIES = [
  'Wi-Fi',
  'Parking',
  'Restaurant',
  'Room service',
  'Airport transfer',
  'Spa',
  'Gym',
  'Pool',
  'Heating',
  'Air conditioning',
  'Pet friendly',
  'Wheelchair access',
  'Kitchenette',
  'Fireplace',
  'Balcony / lake view',
];

export function AddVendorDialog({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<string>('HOTEL');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [starRating, setStarRating] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');

  // Property specifics — only used when type is hotel-like.
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [roomCount, setRoomCount] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');

  const isProperty = type === 'HOTEL' || type === 'CAMP' || type === 'HOUSEBOAT';

  function reset() {
    setName(''); setType('HOTEL'); setCity(''); setArea('');
    setContactPerson(''); setPhone(''); setEmail('');
    setStarRating(''); setGstin(''); setNotes('');
    setCheckInTime('14:00'); setCheckOutTime('11:00');
    setRoomCount(''); setAmenities([]); setCustomAmenity('');
    setError(null);
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  function addCustomAmenity() {
    const v = customAmenity.trim();
    if (!v) return;
    if (!amenities.includes(v)) setAmenities((prev) => [...prev, v]);
    setCustomAmenity('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !type) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
      };
      if (city.trim()) body.city = city.trim();
      if (area.trim()) body.area = area.trim();
      if (contactPerson.trim()) body.contactPerson = contactPerson.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (email.trim()) body.email = email.trim();
      if (starRating) body.starRating = Number(starRating);
      if (gstin.trim()) body.gstin = gstin.trim();
      if (notes.trim()) body.notes = notes.trim();

      if (isProperty) {
        if (checkInTime) body.checkInTime = checkInTime;
        if (checkOutTime) body.checkOutTime = checkOutTime;
        if (roomCount) body.roomCount = Number(roomCount);
        if (amenities.length) body.amenities = amenities;
      }

      const res = await api.post<{ id: string }>('/vendors', body);
      setOpen(false);
      reset();
      onCreated(res.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" strokeWidth={1.75} />
          Add supplier
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Add supplier"
        description="Add rates on the detail page once the vendor is saved. Bank details, GST and notes can be filled in later too."
      >
        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="v-name">Name *</Label>
              <Input
                id="v-name" autoFocus required
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Hotel Grand Mumtaz"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="v-type">Type *</Label>
              <Select
                id="v-type" value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {VENDOR_TYPES.map((t) => (
                  <option key={t} value={t}>{humanise(t)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="v-star">Star rating</Label>
              <Input
                id="v-star" type="number" min={1} max={7}
                value={starRating} onChange={(e) => setStarRating(e.target.value)}
                placeholder="3, 4, 5…"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="v-city">City</Label>
              <Input
                id="v-city" value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Leh"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v-area">Area</Label>
              <Input
                id="v-area" value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Dal Gate, Boulevard…"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="v-cp">Contact person</Label>
              <Input
                id="v-cp" value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Mr Farooq"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v-phone">Phone</Label>
              <Input
                id="v-phone" type="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="v-email">Email</Label>
              <Input
                id="v-email" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="v-gst">GSTIN</Label>
              <Input
                id="v-gst" value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {isProperty && (
            <div className="mt-5 border-t border-ink-800 pt-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.09em] text-ink-500">
                Property specifics
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="v-checkin">Check-in</Label>
                  <Input
                    id="v-checkin" type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="v-checkout">Check-out</Label>
                  <Input
                    id="v-checkout" type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="v-rooms">Total rooms</Label>
                  <Input
                    id="v-rooms" type="number" min={1}
                    value={roomCount}
                    onChange={(e) => setRoomCount(e.target.value)}
                    placeholder="42"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_AMENITIES.map((a) => {
                    const on = amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={
                          on
                            ? 'rounded-full border border-signal-500 bg-signal-500/12 px-2.5 py-1 text-[11.5px] text-signal-600 transition-colors'
                            : 'rounded-full border border-ink-700 bg-ink-900 px-2.5 py-1 text-[11.5px] text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200'
                        }
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                {amenities.filter((a) => !COMMON_AMENITIES.includes(a)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {amenities
                      .filter((a) => !COMMON_AMENITIES.includes(a))
                      .map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-400/60 bg-brand-400/10 px-2.5 py-1 text-[11.5px] text-brand-600"
                        >
                          {a}
                          <button
                            type="button"
                            aria-label={`Remove ${a}`}
                            onClick={() => toggleAmenity(a)}
                            className="text-brand-500/80 hover:text-brand-600"
                          >
                            <X className="size-3" strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Custom amenity"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAmenity();
                      }
                    }}
                    className="h-8 text-[12.5px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addCustomAmenity}
                    disabled={!customAmenity.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="v-notes">Notes</Label>
              <Textarea
                id="v-notes" rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Union zone quirks, payment terms, anything internal"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={busy || !name.trim() || !type}>
              {busy ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
