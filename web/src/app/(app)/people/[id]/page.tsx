'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileDown,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Users2,
  ShieldAlert,
  Plus,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  ApiError,
  openBinary,
  type EmployeeDetail,
  type EmployeePerformance,
  type SalarySlipRow,
} from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { DeactivateButton } from '@/components/ui/deactivate-button';
import { Input, Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';
import { money, percent, shortDate } from '@/lib/format';
import { humanise } from '@/lib/constants';

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [emp, setEmp] = useState<EmployeeDetail | null>(null);
  const [perf, setPerf] = useState<EmployeePerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([
        api.get<EmployeeDetail>(`/employees/${id}`),
        api.get<EmployeePerformance>(`/employees/${id}/performance`).catch(() => null),
      ]);
      setEmp(e);
      setPerf(p);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this employee.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That change did not save.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="h-4 w-48 rounded shimmer" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/people')}>
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          People
        </Button>
        <Panel className="mt-4 border-loss-500/40 bg-loss-500/5">
          <PanelBody>
            <p className="text-[13px] text-ink-100">{error ?? 'Not found.'}</p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Button
        variant="ghost" size="sm"
        className="mb-4 -ml-3"
        onClick={() => router.push('/people')}
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        People
      </Button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-signal-500 text-[20px] font-semibold text-ink-950"
          >
            {emp.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
                {emp.fullName}
              </h1>
              <Chip className="tabular">{emp.code}</Chip>
              <Chip>{humanise(emp.employmentType)}</Chip>
              <Chip
                className={
                  emp.status === 'ACTIVE'
                    ? 'border-healthy-500/40 text-healthy-500'
                    : emp.status === 'EXITED'
                      ? 'border-loss-500/40 text-loss-500'
                      : 'border-warn-500/40 text-warn-500'
                }
              >
                {humanise(emp.status)}
              </Chip>
            </div>
            <p className="mt-0.5 text-[13.5px] text-ink-400">
              {emp.designation}
              {emp.department && ` · ${emp.department}`}
              {'  ·  Joined '}{shortDate(emp.joinedOn)}
            </p>
          </div>
        </div>
        <DeactivateButton
          disabled={busy || emp.status === 'EXITED'}
          label="Mark exited"
          confirmMessage={`Mark ${emp.fullName} as exited? Salary history and interviews stay on record.`}
          onConfirm={async () => {
            try {
              await api.del(`/employees/${id}`);
              router.push('/people');
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Could not exit this employee.');
            }
          }}
        />
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-1.5">
                <Users2 className="size-3.5" strokeWidth={1.75} />
                Profile
              </PanelTitle>
            </PanelHeader>
            <PanelBody className="grid gap-4 sm:grid-cols-2">
              <Fact label="Phone" value={emp.phone} icon={Phone} />
              {emp.email && <Fact label="Email" value={emp.email} icon={Mail} />}
              {emp.altPhone && <Fact label="Alt phone" value={emp.altPhone} icon={Phone} />}
              {emp.fatherName && <Fact label="Father" value={emp.fatherName} />}
              {emp.dob && <Fact label="DOB" value={shortDate(emp.dob)} />}
              {emp.bloodGroup && <Fact label="Blood group" value={emp.bloodGroup} />}
              {emp.aadhaar && <Fact label="Aadhaar" value={emp.aadhaar} />}
              {emp.pan && <Fact label="PAN" value={emp.pan} />}
              {(emp.addressLine || emp.city) && (
                <div className="sm:col-span-2">
                  <Fact
                    label="Address"
                    value={[emp.addressLine, emp.city, emp.state, emp.pincode]
                      .filter(Boolean)
                      .join(', ')}
                    icon={MapPin}
                  />
                </div>
              )}
            </PanelBody>
          </Panel>

          {(emp.emergencyContactName || emp.emergencyContactPhone) && (
            <Panel>
              <PanelHeader>
                <PanelTitle className="flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" strokeWidth={1.75} />
                  Emergency contact
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="grid gap-4 sm:grid-cols-3">
                <Fact label="Name" value={emp.emergencyContactName ?? '—'} />
                <Fact label="Phone" value={emp.emergencyContactPhone ?? '—'} />
                <Fact
                  label="Relation"
                  value={emp.emergencyContactRelation ?? '—'}
                />
              </PanelBody>
            </Panel>
          )}

          <SalarySlipsPanel
            emp={emp}
            busy={busy}
            onGenerate={(month) =>
              mutate(() =>
                api.post(`/employees/${emp.id}/salary-slips`, {
                  periodMonth: month,
                }),
              )
            }
          />
        </div>

        <div className="space-y-4">
          <SalaryStructurePanel emp={emp} />
          <PerformancePanel perf={perf} />
          {emp.notes && (
            <Panel>
              <PanelHeader>
                <PanelTitle>Notes</PanelTitle>
              </PanelHeader>
              <PanelBody className="whitespace-pre-wrap text-[13px] text-ink-300">
                {emp.notes}
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Fact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-ink-200">
        {Icon && <Icon className="size-3.5 text-ink-500" strokeWidth={1.75} />}
        {value}
      </p>
    </div>
  );
}

function SalaryStructurePanel({ emp }: { emp: EmployeeDetail }) {
  const rows: [string, number | null][] = [
    ['Basic',      emp.basicMonthly],
    ['HRA',        emp.hraMonthly],
    ['Allowances', emp.allowMonthly],
    ['PF',         emp.pfMonthly],
    ['ESI',        emp.esiMonthly],
    ['Tax',        emp.taxMonthly],
    ['Other ded.', emp.otherDedMonthly],
  ];
  const anySet = rows.some(([, v]) => v !== null && v > 0) || emp.ctcMonthly;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-1.5">
          <Wallet className="size-3.5" strokeWidth={1.75} />
          Salary structure
        </PanelTitle>
        {emp.ctcMonthly !== null && (
          <span className="tabular text-[13px] font-medium text-ink-100">
            {money(emp.ctcMonthly)}
            <span className="ml-1 text-[10.5px] text-ink-500">/ mo</span>
          </span>
        )}
      </PanelHeader>
      {!anySet ? (
        <PanelBody className="py-6 text-center text-[12px] text-ink-500">
          No salary components entered yet.
        </PanelBody>
      ) : (
        <PanelBody>
          <ul className="space-y-2 text-[13px]">
            {rows.map(([label, v]) =>
              v === null ? null : (
                <li key={label} className="flex items-baseline justify-between">
                  <span className="text-ink-400">{label}</span>
                  <span className="tabular text-ink-100">{money(v)}</span>
                </li>
              ),
            )}
          </ul>
          {emp.bankName && (
            <p className="mt-3 border-t border-ink-800 pt-3 text-[11.5px] text-ink-500">
              {emp.bankName}
              {emp.accountNumber && ` · A/C ${emp.accountNumber}`}
              {emp.ifsc && ` · ${emp.ifsc}`}
            </p>
          )}
        </PanelBody>
      )}
    </Panel>
  );
}

function PerformancePanel({ perf }: { perf: EmployeePerformance | null }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5" strokeWidth={1.75} />
          Performance
        </PanelTitle>
      </PanelHeader>
      {!perf || !perf.linked ? (
        <PanelBody className="py-4 text-[12px] text-ink-500">
          {perf?.message ??
            'Link a CRM login to this employee to see leads, quotes and revenue.'}
        </PanelBody>
      ) : (
        <PanelBody className="space-y-2 text-[13px]">
          <PerfRow label="Leads assigned" value={String(perf.leadsAssigned ?? 0)} />
          <PerfRow
            label="Conversion"
            value={
              perf.leadsAssigned! > 0
                ? `${perf.leadsConverted} / ${perf.leadsAssigned} · ${percent(perf.conversionPercent!)}`
                : '—'
            }
          />
          <PerfRow label="Quotes created" value={String(perf.quotesCreated ?? 0)} />
          <PerfRow label="Bookings" value={String(perf.bookingsCreated ?? 0)} />
          <PerfRow label="Revenue" value={money(perf.revenue ?? 0)} />
          <PerfRow
            label="Gross profit"
            value={money(perf.grossProfit ?? 0)}
          />
          {perf.averageDealSize! > 0 && (
            <PerfRow
              label="Avg deal"
              value={money(perf.averageDealSize!)}
            />
          )}
        </PanelBody>
      )}
    </Panel>
  );
}

function PerfRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="tabular font-medium text-ink-100">{value}</span>
    </div>
  );
}

function SalarySlipsPanel({
  emp,
  busy,
  onGenerate,
}: {
  emp: EmployeeDetail;
  busy: boolean;
  onGenerate: (month: string) => void;
}) {
  // Default month = last full month, since that's the one operators usually
  // want to generate ("run last month's payroll").
  const now = new Date();
  const defaultMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-1.5">
          <Wallet className="size-3.5" strokeWidth={1.75} />
          Salary slips
        </PanelTitle>
        <span className="tabular text-[11px] text-ink-500">
          {emp.salarySlips.length} record{emp.salarySlips.length === 1 ? '' : 's'}
        </span>
      </PanelHeader>

      {emp.salarySlips.length === 0 ? (
        <PanelBody className="py-8 text-center">
          <p className="text-[13px] text-ink-300">No slips generated yet</p>
          <p className="mt-1 text-[12px] text-ink-500">
            Pick a month below and generate the first slip.
          </p>
        </PanelBody>
      ) : (
        <ul className="divide-y divide-ink-800/60">
          {emp.salarySlips.map((s) => (
            <SlipRow key={s.id} slip={s} />
          ))}
        </ul>
      )}

      <div className="border-t border-ink-800 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[160px] space-y-1">
            <Label htmlFor="slip-month">Period</Label>
            <Input
              id="slip-month" type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={busy || !month}
            onClick={() => onGenerate(`${month}-01`)}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            Generate slip
          </Button>
          <p className="text-[11px] text-ink-500">
            Uses this person&rsquo;s salary structure. Overrides are supported
            via the API for bonuses and arrears.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function SlipRow({ slip: s }: { slip: SalarySlipRow }) {
  const label = new Date(s.periodMonth).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink-100">{label}</p>
        <p className="tabular mt-0.5 text-[11px] text-ink-500">
          gross {money(s.grossPay)} · ded {money(s.totalDed)}
          {s.paidOn && ` · paid ${shortDate(s.paidOn)}`}
        </p>
      </div>
      <span className="tabular text-[15px] font-semibold text-ink-100">
        {money(s.netPay)}
      </span>
      <Button
        variant="ghost" size="sm"
        onClick={() =>
          openBinary(
            `/salary-slips/${s.id}/pdf`,
            `SalarySlip-${s.periodMonth.slice(0, 7)}.pdf`,
          )
        }
      >
        <FileDown className="size-4" strokeWidth={1.75} />
      </Button>
    </li>
  );
}
