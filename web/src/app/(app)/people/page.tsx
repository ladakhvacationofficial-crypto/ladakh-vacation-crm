'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Users2, Briefcase } from 'lucide-react';
import { api, ApiError, type EmployeeRow } from '@/lib/api';
import { Panel } from '@/components/ui/panel';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';
import { AddEmployeeDialog } from '@/components/add-employee-dialog';
import { humanise } from '@/lib/constants';
import { shortDate } from '@/lib/format';

const STATUSES = ['ACTIVE', 'ON_LEAVE', 'NOTICE', 'EXITED'] as const;

export default function PeoplePage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (status) q.set('status', status);
    try {
      setRows(await api.get<EmployeeRow[]>(`/employees?${q}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load employees.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 240 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const filtered = Boolean(search || status !== 'ACTIVE');

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            People
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {rows.length} {status === 'ACTIVE' ? 'active' : humanise(status).toLowerCase()}{' '}
            employee{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/interviews">
              <Briefcase className="size-4" strokeWidth={1.75} />
              Interviews
            </Link>
          </Button>
          <AddEmployeeDialog onCreated={(id) => router.push(`/people/${id}`)} />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search
            aria-hidden strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, code, phone, designation"
            className="pl-8"
            aria-label="Search employees"
          />
        </div>
        <div className="w-[168px]">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanise(s)}
              </option>
            ))}
          </Select>
        </div>
        {filtered && (
          <Button
            variant="ghost" size="sm"
            onClick={() => { setSearch(''); setStatus('ACTIVE'); }}
          >
            <X className="size-4" strokeWidth={1.75} />
            Clear
          </Button>
        )}
      </div>

      <Panel className="overflow-x-auto">
        {error ? (
          <p className="px-5 py-10 text-center text-[13px] text-loss-500">{error}</p>
        ) : loading ? (
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 rounded shimmer" />
                <div className="ml-auto h-3 w-20 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users2
              aria-hidden strokeWidth={1.25}
              className="mx-auto size-6 text-ink-500"
            />
            <p className="mt-3 text-[13px] text-ink-300">
              {filtered ? 'No employees match those filters' : 'No employees yet'}
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              Use “Add person” to onboard someone.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Designation</th>
                <th className="px-5 py-2.5 font-medium">Department</th>
                <th className="px-5 py-2.5 font-medium">Reports to</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 text-right font-medium">Joined</th>
                <th className="w-10 px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr
                  key={e.id}
                  className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                  style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/people/${e.id}`}
                      className="font-medium text-ink-100 transition-colors group-hover:text-signal-600"
                    >
                      {e.fullName}
                    </Link>
                    <div className="tabular mt-0.5 text-[11px] text-ink-500">
                      {e.code} · {e.phone}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-300">{e.designation}</td>
                  <td className="px-5 py-3 text-ink-400">{e.department ?? '—'}</td>
                  <td className="px-5 py-3 text-ink-400">
                    {e.reportsTo?.fullName ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Chip>{humanise(e.employmentType)}</Chip>
                  </td>
                  <td className="tabular px-5 py-3 text-right text-[12px] text-ink-500">
                    {shortDate(e.joinedOn)}
                  </td>
                  <td className="px-2 py-3">
                    <RowActions
                      label={`Mark ${e.fullName} as exited`}
                      confirmMessage={`Mark ${e.fullName} as exited? Their salary history and interviews stay on record.`}
                      onDelete={async () => {
                        try {
                          await api.del(`/employees/${e.id}`);
                          load();
                        } catch (err) {
                          alert(err instanceof ApiError ? err.message : 'Could not exit that employee.');
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
