'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Car,
  UserCheck,
  Calendar,
  AlertCircle,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  X,
  Phone,
  Fuel,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  api,
  ApiError,
  type VehicleRow,
  type DriverRow,
  type FleetAssignmentRow,
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

type Tab = 'assignments' | 'vehicles' | 'drivers';

export default function FleetPage() {
  const [tab, setTab] = useState<Tab>('assignments');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [assignments, setAssignments] = useState<FleetAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [assignOpen, setAssignOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);

  // Bookings for assignment selector
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [vRes, dRes, aRes, bRes] = await Promise.all([
        api.get<VehicleRow[]>('/fleet/vehicles'),
        api.get<DriverRow[]>('/fleet/drivers'),
        api.get<FleetAssignmentRow[]>('/fleet/assignments'),
        api.get<Paged<BookingRow>>('/bookings?limit=50'),
      ]);
      setVehicles(vRes);
      setDrivers(dRes);
      setAssignments(aRes);
      setBookings(bRes.data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load fleet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Quick stats
  const activeVehicles = vehicles.filter((v) => v.isActive).length;
  const verifiedDrivers = drivers.filter((d) => d.policeVerified).length;
  const activeAssignments = assignments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS',
  ).length;

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚐</span>
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              Fleet & Cabs
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Ladakh transport dispatch: Innovas, Scorpios & Tempo Travellers with verified local drivers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setVehicleOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} />
            Add Vehicle
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDriverOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} />
            Add Driver
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAssignOpen(true)}>
            <Calendar className="size-4" strokeWidth={1.75} />
            Assign Fleet
          </Button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Headline */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Vehicles on file
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-ink-100">
            {activeVehicles} <span className="text-xs font-normal text-ink-500">/ {vehicles.length}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Fleet readiness</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Verified Drivers
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-signal-400">
            {verifiedDrivers} <span className="text-xs font-normal text-ink-500">/ {drivers.length}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Police & Local badged</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Active Trips
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-healthy-400">
            {activeAssignments}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Scheduled / En route</p>
        </Panel>

        <Panel className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
            Total Completed
          </p>
          <p className="tabular mt-1 text-[22px] font-semibold text-ink-100">
            {assignments.filter((a) => a.status === 'COMPLETED').length}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">Duty slips logged</p>
        </Panel>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b border-ink-800">
        <button
          onClick={() => setTab('assignments')}
          className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
            tab === 'assignments'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          Duty Slips & Assignments ({assignments.length})
        </button>
        <button
          onClick={() => setTab('vehicles')}
          className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
            tab === 'vehicles'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setTab('drivers')}
          className={`border-b-2 px-4 py-2 text-[13px] font-medium transition-colors ${
            tab === 'drivers'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-ink-400 hover:text-ink-200'
          }`}
        >
          Drivers ({drivers.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Panel className="p-8 text-center text-[13px] text-ink-400">Loading fleet data...</Panel>
      ) : tab === 'assignments' ? (
        <AssignmentsTable
          assignments={assignments}
          onStatusChange={async (id, status) => {
            await api.patch(`/fleet/assignments/${id}`, { status });
            loadAll();
          }}
          onDelete={async (id) => {
            if (confirm('Cancel and delete this vehicle/driver assignment?')) {
              await api.del(`/fleet/assignments/${id}`);
              loadAll();
            }
          }}
        />
      ) : tab === 'vehicles' ? (
        <VehiclesTable vehicles={vehicles} onReload={loadAll} />
      ) : (
        <DriversTable drivers={drivers} onReload={loadAll} />
      )}

      {/* Modals */}
      <AssignFleetDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        bookings={bookings}
        onSuccess={() => {
          setAssignOpen(false);
          loadAll();
        }}
      />

      <AddVehicleDialog
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        onSuccess={() => {
          setVehicleOpen(false);
          loadAll();
        }}
      />

      <AddDriverDialog
        open={driverOpen}
        onClose={() => setDriverOpen(false)}
        onSuccess={() => {
          setDriverOpen(false);
          loadAll();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

function AssignmentsTable({
  assignments,
  onStatusChange,
  onDelete,
}: {
  assignments: FleetAssignmentRow[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  if (assignments.length === 0) {
    return (
      <Panel className="p-12 text-center text-ink-400">
        <Car className="mx-auto size-8 text-ink-600 mb-2" />
        <p className="text-[14px] text-ink-200 font-medium">No transport assignments yet</p>
        <p className="text-[12px] text-ink-500 mt-1">
          Click &ldquo;Assign Fleet&rdquo; above to link a vehicle and driver to a confirmed booking.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
            <th className="px-5 py-2.5 font-medium">Duty Slip / Trip</th>
            <th className="px-5 py-2.5 font-medium">Vehicle</th>
            <th className="px-5 py-2.5 font-medium">Driver</th>
            <th className="px-5 py-2.5 font-medium">Circuit</th>
            <th className="px-5 py-2.5 font-medium">Dates</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr
              key={a.id}
              className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60 transition-colors"
            >
              <td className="px-5 py-3">
                <span className="font-semibold text-ink-100">{a.dutySlipNumber ?? 'DS-PENDING'}</span>
                <div className="tabular mt-0.5 text-[11px] text-ink-500">
                  Ref: {a.booking?.bookingNumber ?? a.bookingId.slice(0, 8)}
                </div>
              </td>
              <td className="px-5 py-3">
                {a.vehicle ? (
                  <div>
                    <span className="font-medium text-ink-100">{a.vehicle.plateNumber}</span>
                    <p className="text-[11px] text-ink-500">{humanise(a.vehicle.vehicleType)}</p>
                  </div>
                ) : (
                  <span className="text-ink-500">Unallocated</span>
                )}
              </td>
              <td className="px-5 py-3">
                {a.driver ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-medium text-ink-100">
                      <span>{a.driver.name}</span>
                      {a.driver.isLocalLadakhi && (
                        <span className="rounded bg-brand-500/15 px-1 py-0.2 text-[9.5px] font-semibold text-brand-500">
                          Local
                        </span>
                      )}
                    </div>
                    <p className="tabular text-[11px] text-ink-500">{a.driver.phone}</p>
                  </div>
                ) : (
                  <span className="text-ink-500">Unallocated</span>
                )}
              </td>
              <td className="px-5 py-3 text-ink-300">
                <div className="flex items-center gap-1 text-[12px]">
                  <MapPin className="size-3 text-signal-400 shrink-0" />
                  <span className="truncate max-w-[200px]" title={a.circuit}>
                    {a.circuit}
                  </span>
                </div>
              </td>
              <td className="tabular px-5 py-3 text-[12px] text-ink-400">
                {shortDate(a.startDate)} <span className="text-ink-600">→</span> {shortDate(a.endDate)}
              </td>
              <td className="px-5 py-3">
                <Select
                  value={a.status}
                  onChange={(e) => onStatusChange(a.id, e.target.value)}
                  className="h-7 text-xs w-[130px]"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onDelete(a.id)}
                  aria-label="Delete assignment"
                  className="rounded p-1.5 text-ink-500 hover:bg-ink-800 hover:text-loss-400 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function VehiclesTable({
  vehicles,
  onReload,
}: {
  vehicles: VehicleRow[];
  onReload: () => void;
}) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
            <th className="px-5 py-2.5 font-medium">Reg Number</th>
            <th className="px-5 py-2.5 font-medium">Model / Type</th>
            <th className="px-5 py-2.5 font-medium">Ownership</th>
            <th className="px-5 py-2.5 font-medium">Seats</th>
            <th className="px-5 py-2.5 font-medium">Fitness / Permits</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr
              key={v.id}
              className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60 transition-colors"
            >
              <td className="px-5 py-3 font-semibold text-ink-100">
                {v.plateNumber}
                {v.notes && <p className="text-[11px] font-normal text-ink-500">{v.notes}</p>}
              </td>
              <td className="px-5 py-3 text-ink-300">
                <p className="font-medium text-ink-100">{v.makeModel ?? humanise(v.vehicleType)}</p>
                <p className="text-[11px] text-ink-500">{humanise(v.vehicleType)}</p>
              </td>
              <td className="px-5 py-3">
                <Chip>{humanise(v.ownership)}</Chip>
              </td>
              <td className="tabular px-5 py-3 text-ink-300">
                {v.capacity} pax {v.seatingConfig ? `(${v.seatingConfig})` : ''}
              </td>
              <td className="tabular px-5 py-3 text-[12px] text-ink-400">
                {v.fitnessExpiry ? (
                  <span>Exp: {shortDate(v.fitnessExpiry)}</span>
                ) : (
                  <span className="text-ink-600">On file</span>
                )}
              </td>
              <td className="px-5 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    v.isActive ? 'bg-healthy-500/10 text-healthy-400' : 'bg-ink-800 text-ink-500'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      v.isActive ? 'bg-healthy-500' : 'bg-ink-600'
                    }`}
                  />
                  {v.isActive ? 'Active' : 'Offline'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function DriversTable({
  drivers,
  onReload,
}: {
  drivers: DriverRow[];
  onReload: () => void;
}) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
            <th className="px-5 py-2.5 font-medium">Driver Name</th>
            <th className="px-5 py-2.5 font-medium">Contact</th>
            <th className="px-5 py-2.5 font-medium">License / Badge</th>
            <th className="px-5 py-2.5 font-medium">Verification</th>
            <th className="px-5 py-2.5 font-medium">Blood Group</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr
              key={d.id}
              className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/60 transition-colors"
            >
              <td className="px-5 py-3">
                <span className="font-semibold text-ink-100">{d.name}</span>
                {d.isLocalLadakhi && (
                  <span className="ml-2 rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-500">
                    Local Ladakhi
                  </span>
                )}
              </td>
              <td className="px-5 py-3">
                <p className="tabular text-ink-200">{d.phone}</p>
                {d.altPhone && <p className="tabular text-[11px] text-ink-500">{d.altPhone}</p>}
              </td>
              <td className="tabular px-5 py-3 text-ink-300">
                {d.licenseNumber}
                {d.badgeNumber && <div className="text-[11px] text-ink-500">Badge: {d.badgeNumber}</div>}
              </td>
              <td className="px-5 py-3">
                {d.policeVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-healthy-400">
                    <ShieldCheck className="size-3.5" />
                    Police Verified
                  </span>
                ) : (
                  <span className="text-[11px] text-warn-400">Pending verification</span>
                )}
              </td>
              <td className="tabular px-5 py-3 text-ink-400">{d.bloodGroup ?? '—'}</td>
              <td className="px-5 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    d.isActive ? 'bg-healthy-500/10 text-healthy-400' : 'bg-ink-800 text-ink-500'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      d.isActive ? 'bg-healthy-500' : 'bg-ink-600'
                    }`}
                  />
                  {d.isActive ? 'Available' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Modals                                                                     */
/* -------------------------------------------------------------------------- */

function AssignFleetDialog({
  open,
  onClose,
  vehicles,
  drivers,
  bookings,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  bookings: BookingRow[];
  onSuccess: () => void;
}) {
  const [bookingId, setBookingId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [circuit, setCircuit] = useState('Leh - Sham Valley - Nubra - Pangong - Leh');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Leh Kushok Bakula Rimpochee Airport (IXL)');
  const [dropLocation, setDropLocation] = useState('Leh Kushok Bakula Rimpochee Airport (IXL)');
  const [driverBatta, setDriverBatta] = useState('500');
  const [fuelAllowance, setFuelAllowance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Sync dates when booking is selected
  useEffect(() => {
    if (bookingId) {
      const b = bookings.find((x) => x.id === bookingId);
      if (b?.travelStartDate) {
        setStartDate(b.travelStartDate.split('T')[0]);
      }
      if (b?.travelEndDate) {
        setEndDate(b.travelEndDate.split('T')[0]);
      }
    }
  }, [bookingId, bookings]);

  async function submit() {
    if (!bookingId || !circuit || !startDate || !endDate) {
      alert('Please fill booking, circuit, and travel dates.');
      return;
    }
    setBusy(true);
    setConflictError(null);
    try {
      await api.post('/fleet/assignments', {
        bookingId,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        circuit,
        pickupLocation,
        dropLocation,
        driverBatta: Number(driverBatta) || 0,
        fuelAllowance: Number(fuelAllowance) || 0,
      });
      onSuccess();
    } catch (e: any) {
      setConflictError(e instanceof ApiError ? e.message : 'Scheduling conflict or validation error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Assign Vehicle & Driver" className="max-w-xl">
        <div className="p-5">

        {conflictError && (
          <div className="flex items-start gap-2 rounded-lg border border-loss-500/40 bg-loss-500/10 p-3 text-[13px] text-loss-400">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Scheduling Conflict Detected</p>
              <p>{conflictError}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Booking</Label>
            <Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">Select a confirmed booking...</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber} — {b.packageName ?? 'Tour'} ({b.lead?.name ?? 'Client'})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Assign Vehicle later...</option>
                {vehicles
                  .filter((v) => v.isActive)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({humanise(v.vehicleType)})
                    </option>
                  ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Driver</Label>
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Assign Driver later...</option>
                {drivers
                  .filter((d) => d.isActive)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone}) {d.isLocalLadakhi ? '· Local' : ''}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Circuit / Route</Label>
            <Input
              value={circuit}
              onChange={(e) => setCircuit(e.target.value)}
              placeholder="e.g. Leh - Sham Valley - Nubra - Pangong - Leh"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Pickup Location</Label>
              <Input
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Drop Location</Label>
              <Input
                value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Daily Driver Batta (₹)</Label>
              <Input
                type="number"
                value={driverBatta}
                onChange={(e) => setDriverBatta(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Fuel Advance (₹)</Label>
              <Input
                type="number"
                value={fuelAllowance}
                onChange={(e) => setFuelAllowance(e.target.value)}
              />
            </div>
          </div>
        </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? 'Verifying schedule...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddVehicleDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reg, setReg] = useState('');
  const [type, setType] = useState('INNOVA_CRYSTA');
  const [ownership, setOwnership] = useState('COMPANY_OWNED');
  const [capacity, setCapacity] = useState('6');
  const [makeModel, setMakeModel] = useState('Toyota Innova Crysta');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reg) {
      alert('Registration number is required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/fleet/vehicles', {
        plateNumber: reg.toUpperCase().trim(),
        vehicleType: type as any,
        ownership: ownership as any,
        capacity: Number(capacity) || 6,
        makeModel,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to create vehicle');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Add New Vehicle" className="max-w-md">
        <div className="p-5">

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Registration Number</Label>
            <Input
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="e.g. LA 02 A 1234"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Vehicle Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="INNOVA_CRYSTA">Innova Crysta</option>
                <option value="INNOVA">Standard Innova</option>
                <option value="FORTUNER">Toyota Fortuner</option>
                <option value="SCORPIO">Mahindra Scorpio</option>
                <option value="TEMPO_TRAVELLER">Tempo Traveller</option>
                <option value="XYLO">Mahindra Xylo</option>
                <option value="URBANIA">Force Urbania</option>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Ownership</Label>
              <Select value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                <option value="COMPANY_OWNED">Company Owned</option>
                <option value="ATTACHED_VENDOR">Attached Vendor</option>
                <option value="MARKET_HIRE">Market Hire</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Model Details</Label>
              <Input
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                placeholder="Toyota Innova Crysta"
              />
            </div>
            <div className="space-y-1">
              <Label>Passenger Capacity</Label>
              <Input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Carrier on roof, snow chains on board..."
            />
          </div>
        </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving...' : 'Add Vehicle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddDriverDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [isLocal, setIsLocal] = useState(true);
  const [verified, setVerified] = useState(true);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name || !phone || !license) {
      alert('Name, phone, and license number are required.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/fleet/drivers', {
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: license.trim(),
        isLocalLadakhi: isLocal,
        policeVerified: verified,
        bloodGroup: bloodGroup || undefined,
      });
      onSuccess();
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to create driver');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Add New Driver" className="max-w-md">
        <div className="p-5">

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Driver Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rigzin Dorjey"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mobile Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94191..."
              />
            </div>
            <div className="space-y-1">
              <Label>Blood Group</Label>
              <Input
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="O+"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Driving License Number</Label>
            <Input
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="JK-10-..."
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-[13px] text-ink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocal}
                onChange={(e) => setIsLocal(e.target.checked)}
                className="rounded border-ink-700"
              />
              <span>Local Ladakhi resident (experienced on Khardung La & Chang La)</span>
            </label>

            <label className="flex items-center gap-2 text-[13px] text-ink-200 cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="rounded border-ink-700"
              />
              <span>Police Verification certificate on file</span>
            </label>
          </div>
        </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving...' : 'Add Driver'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
