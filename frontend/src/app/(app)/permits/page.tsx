'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileCheck,
  ShieldAlert,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import {
  api,
  ApiError,
  type PermitApplicationRow,
  type PermitTravellerRow,
  type BookingRow,
  type Paged,
} from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip, Stage } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { shortDate, money } from '@/lib/format';
import { humanise } from '@/lib/constants';

const LADAKH_SECTORS = [
  'Nubra Valley (Khardung La / Diskit / Hunder / Turtuk)',
  'Pangong Tso (Chang La / Spangmik / Merak)',
  'Tso Moriri & Korzok',
  'Hanle (Dark Sky Reserve / Umling La)',
  'Chushul & Tsaga La',
  'Dha - Hanu (Aryan Valley)',
];

export default function PermitsPage() {
  const [applications, setApplications] = useState<PermitApplicationRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<PermitApplicationRow | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, bRes] = await Promise.all([
        api.get<PermitApplicationRow[]>('/permits'),
        api.get<Paged<BookingRow>>('/bookings?limit=50'),
      ]);
      setApplications(pRes);
      setBookings(bRes.data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load permit applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick stats
  const totalApps = applications.length;
  const pendingDcOffice = applications.filter(
    (a) => a.status === 'APPLIED_DC_OFFICE' || a.status === 'DOCS_VERIFIED',
  ).length;
  const issuedPermits = applications.filter((a) => a.status === 'ISSUED').length;
  const totalFeesCollected = applications.reduce((sum, a) => sum + (a.totalFee || 0), 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              Ladakh Permits (ILP & PAP)
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-400">
            DC Office Leh statutory permits: Nubra, Pangong, Tso Moriri, Hanle & Protected Area Permits
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" strokeWidth={1.75} />
          New Permit Application
        </Button>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Applications
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-ink-100">{totalApps}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">Domestic & Foreign</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Pending DC Office
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-warn-400">
            {pendingDcOffice}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Verification in progress</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Issued & Valid
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-healthy-400">
            {issuedPermits}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Stamped & collected</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Statutory Fees
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-signal-400">
            {money(totalFeesCollected)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Govt. remittances</p>
        </Panel>
      </div>

      {/* Applications Table */}
      {loading ? (
        <Panel className="p-8 text-center text-[13px] text-ink-400">Loading permit applications...</Panel>
      ) : applications.length === 0 ? (
        <Panel className="p-12 text-center text-ink-400">
          <FileCheck className="mx-auto size-8 text-ink-600 mb-2" />
          <p className="text-[14px] text-ink-200 font-medium">No permit applications logged</p>
          <p className="text-[12px] text-ink-500 mt-1">
            Click &ldquo;New Permit Application&rdquo; to prepare permits for guests visiting Nubra, Pangong, or Hanle.
          </p>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Permit Ref / Booking</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Travellers</th>
                <th className="px-5 py-2.5 font-medium">Validity</th>
                <th className="px-5 py-2.5 font-medium">Sectors</th>
                <th className="px-5 py-2.5 text-right font-medium">Statutory Fee</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink-100">
                      {app.permitNumber ?? app.dcOfficeRef ?? 'APP-PENDING'}
                    </p>
                    <p className="tabular text-[11px] text-ink-500">
                      Booking: {app.booking?.bookingNumber ?? 'Direct'} ·{' '}
                      {app.booking?.lead?.name ?? 'Traveller'}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        app.permitType === 'ILP_DOMESTIC'
                          ? 'bg-signal-500/10 text-signal-400 border border-signal-500/20'
                          : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      }`}
                    >
                      {app.permitType === 'ILP_DOMESTIC' ? '🇮🇳 Domestic ILP' : '🌐 Foreign PAP'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-ink-500" />
                      <span className="font-medium text-ink-100">
                        {app.travellers?.length ?? 0} pax
                      </span>
                    </div>
                    {app.travellers?.[0] && (
                      <p className="text-[11px] text-ink-500 truncate max-w-[140px]">
                        Lead: {app.travellers[0].fullName}
                      </p>
                    )}
                  </td>
                  <td className="tabular px-5 py-3 text-[12px] text-ink-400">
                    {shortDate(app.validFrom)} <span className="text-ink-600">→</span>{' '}
                    {shortDate(app.validTo)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(app.sectors ?? []).slice(0, 2).map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-ink-850 px-1.5 py-0.5 text-[10px] text-ink-300"
                        >
                          {s.split(' ')[0]}
                        </span>
                      ))}
                      {(app.sectors?.length ?? 0) > 2 && (
                        <span className="text-[10px] text-ink-500">
                          +{(app.sectors?.length ?? 0) - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="tabular px-5 py-3 text-right">
                    <span className="font-semibold text-ink-100">{money(app.totalFee)}</span>
                    <div className="text-[10.5px] text-ink-500">
                      Env ₹{app.environmentalFee} · Wild ₹{app.wildlifeFee}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Select
                      value={app.status}
                      onChange={async (e) => {
                        await api.patch(`/permits/${app.id}`, { status: e.target.value });
                        loadData();
                      }}
                      className="h-7 text-xs w-[145px]"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING_DOCS">Pending Docs</option>
                      <option value="DOCS_VERIFIED">Docs Verified</option>
                      <option value="APPLIED_DC_OFFICE">Applied DC Office</option>
                      <option value="ISSUED">Issued / Stamped</option>
                      <option value="REJECTED">Rejected</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* New Permit Application Dialog */}
      <NewPermitDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bookings={bookings}
        onSuccess={() => {
          setCreateOpen(false);
          loadData();
        }}
      />
    </div>
  );
}

function NewPermitDialog({
  open,
  onClose,
  bookings,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bookings: BookingRow[];
  onSuccess: () => void;
}) {
  const [bookingId, setBookingId] = useState('');
  const [permitType, setPermitType] = useState<'ILP_DOMESTIC' | 'PAP_FOREIGN'>('ILP_DOMESTIC');
  const [sectors, setSectors] = useState<string[]>([
    'Nubra Valley (Khardung La / Diskit / Hunder / Turtuk)',
    'Pangong Tso (Chang La / Spangmik / Merak)',
  ]);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [travellers, setTravellers] = useState<Array<{ fullName: string; age: number; gender: string; idType: string; idNumber: string }>>([
    { fullName: '', age: 30, gender: 'Male', idType: 'Aadhaar Card', idNumber: '' },
  ]);
  const [busy, setBusy] = useState(false);

  // Sync dates when booking chosen
  useEffect(() => {
    if (bookingId) {
      const b = bookings.find((x) => x.id === bookingId);
      if (b?.travelStartDate) setValidFrom(b.travelStartDate.split('T')[0]);
      if (b?.travelEndDate) setValidTo(b.travelEndDate.split('T')[0]);
      if (b?.lead?.name && travellers[0]?.fullName === '') {
        setTravellers([{ fullName: b.lead.name, age: 32, gender: 'Male', idType: 'Aadhaar Card', idNumber: '' }]);
      }
    }
  }, [bookingId, bookings]);

  // Fee preview
  const paxCount = travellers.length;
  const daysCount =
    validFrom && validTo
      ? Math.max(1, Math.round((new Date(validTo).getTime() - new Date(validFrom).getTime()) / (1000 * 60 * 60 * 24)))
      : 5;
  const envFee = 400 * paxCount;
  const redCrossFee = 100 * paxCount;
  const wildlifeFee = 20 * daysCount * paxCount;
  const totalFee = envFee + redCrossFee + wildlifeFee;

  function toggleSector(s: string) {
    if (sectors.includes(s)) {
      setSectors(sectors.filter((x) => x !== s));
    } else {
      setSectors([...sectors, s]);
    }
  }

  function addTraveller() {
    setTravellers([...travellers, { fullName: '', age: 28, gender: 'Male', idType: 'Aadhaar Card', idNumber: '' }]);
  }

  function updateTraveller(index: number, field: string, value: any) {
    const updated = [...travellers];
    updated[index] = { ...updated[index], [field]: value };
    setTravellers(updated);
  }

  function removeTraveller(index: number) {
    if (travellers.length === 1) return;
    setTravellers(travellers.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!bookingId || !validFrom || !validTo || sectors.length === 0) {
      alert('Please fill booking, travel validity dates, and at least one sector.');
      return;
    }
    const emptyName = travellers.some((t) => !t.fullName.trim() || !t.idNumber.trim());
    if (emptyName) {
      alert('Please provide full name and ID number for all travellers in the roster.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/permits', {
        bookingId,
        permitType,
        sectors,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        travellers: travellers.map((t) => ({
          fullName: t.fullName.trim(),
          age: Number(t.age) || 30,
          gender: t.gender,
          nationality: permitType === 'ILP_DOMESTIC' ? 'Indian' : 'Foreign',
          idType: t.idType,
          idNumber: t.idNumber.trim(),
        })),
      });
      onSuccess();
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to create permit application');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="New Ladakh Permit Application" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5">

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Booking Reference</Label>
              <Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                <option value="">Select confirmed booking...</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — {b.lead?.name ?? 'Client'}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Permit Category</Label>
              <Select
                value={permitType}
                onChange={(e) => setPermitType(e.target.value as any)}
              >
                <option value="ILP_DOMESTIC">Domestic ILP (Indian Nationals)</option>
                <option value="PAP_FOREIGN">Protected Area Permit (Foreign Nationals)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Permit Valid From</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Permit Valid To</Label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          </div>

          {/* Sectors */}
          <div className="space-y-1.5">
            <Label>Regulated High-Altitude Sectors</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px]">
              {LADAKH_SECTORS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 rounded border border-ink-800/80 p-2 hover:bg-ink-850/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={sectors.includes(s)}
                    onChange={() => toggleSector(s)}
                    className="rounded border-ink-700"
                  />
                  <span className="text-ink-200">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Traveller Roster */}
          <div className="space-y-2 pt-2 border-t border-ink-800">
            <div className="flex items-center justify-between">
              <Label>Travellers Roster ({travellers.length} pax)</Label>
              <Button variant="secondary" size="sm" onClick={addTraveller}>
                <Plus className="size-3.5" />
                Add Person
              </Button>
            </div>

            <div className="space-y-2">
              {travellers.map((t, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded border border-ink-800/60 p-2.5 bg-ink-850/30"
                >
                  <span className="text-[11px] font-semibold text-ink-500 w-5">#{idx + 1}</span>
                  <Input
                    placeholder="Full name (as on ID)"
                    value={t.fullName}
                    onChange={(e) => updateTraveller(idx, 'fullName', e.target.value)}
                    className="flex-1 min-w-[150px] h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Age"
                    value={t.age}
                    onChange={(e) => updateTraveller(idx, 'age', e.target.value)}
                    className="w-14 h-8 text-xs"
                  />
                  <Select
                    value={t.gender}
                    onChange={(e) => updateTraveller(idx, 'gender', e.target.value)}
                    className="w-20 h-8 text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                  <Select
                    value={t.idType}
                    onChange={(e) => updateTraveller(idx, 'idType', e.target.value)}
                    className="w-28 h-8 text-xs"
                  >
                    <option value="Aadhaar Card">Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving Lic</option>
                  </Select>
                  <Input
                    placeholder="ID Number"
                    value={t.idNumber}
                    onChange={(e) => updateTraveller(idx, 'idNumber', e.target.value)}
                    className="w-28 h-8 text-xs"
                  />
                  <button
                    onClick={() => removeTraveller(idx)}
                    disabled={travellers.length === 1}
                    className="rounded p-1 text-ink-500 hover:text-loss-400 disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Fee Breakdown Banner */}
          <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-3 text-[12.5px]">
            <p className="font-semibold text-brand-400">DC Office Leh Statutory Fee Calculation:</p>
            <div className="mt-1 flex flex-wrap gap-4 text-ink-300">
              <span>Environmental: ₹400 × {paxCount} = <b>₹{envFee}</b></span>
              <span>Red Cross: ₹100 × {paxCount} = <b>₹{redCrossFee}</b></span>
              <span>Wildlife: ₹20 × {daysCount}d × {paxCount} = <b>₹{wildlifeFee}</b></span>
              <span className="text-ink-100 font-bold ml-auto">
                Total Remittance: {money(totalFee)}
              </span>
            </div>
          </div>
        </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? 'Registering with DC Office...' : 'Generate Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
