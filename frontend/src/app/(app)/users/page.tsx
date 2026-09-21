'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, X } from 'lucide-react';
import { api, ApiError, tokenStore, type UserRow } from '@/lib/api';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Chip } from '@/components/ui/badge';
import { humanise } from '@/lib/constants';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Access — CRM login accounts. Distinct from /people (HR): an Employee is a
 * person on payroll, a User is a login. Some overlap (a sales exec has both);
 * many don't (a driver has an HR record but no login).
 *
 * Owner-only page: role changes and account creation live here, and both
 * can silently expand what data someone can read. Rate-limited by the
 * backend gate (Roles(OWNER, SUPER_ADMIN)) so a non-owner just sees a 403.
 */

const ROLES = [
  'SUPER_ADMIN',
  'OWNER',
  'SALES_MANAGER',
  'SALES_EXEC',
  'ACCOUNTS',
  'MARKETING',
  'OPERATIONS',
] as const;

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentId = tokenStore.user()?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.get<UserRow[]>('/users'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const visible = showInactive ? rows : rows.filter((r) => r.isActive);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
            Access
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            CRM login accounts and their roles.
            {' '}{visible.length} account{visible.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-ink-500">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-3.5 accent-signal-500"
            />
            Show inactive
          </label>
          <AddUserDialog onCreated={load} />
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      <Panel className="overflow-x-auto">
        {loading ? (
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-3.5">
                <div className="h-3 w-40 rounded shimmer" />
                <div className="ml-auto h-3 w-20 rounded shimmer" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <PanelBody className="py-14 text-center">
            <ShieldCheck
              aria-hidden strokeWidth={1.25}
              className="mx-auto size-6 text-ink-500"
            />
            <p className="mt-3 text-[13px] text-ink-300">
              {rows.length === 0 ? 'No accounts yet' : 'No active accounts'}
            </p>
            <p className="mt-1 text-[12px] text-ink-500">
              {rows.length === 0
                ? 'Use "Add account" to invite staff.'
                : 'Toggle "Show inactive" above to see deactivated accounts.'}
            </p>
          </PanelBody>
        ) : (
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u, i) => {
                const isSelf = u.id === currentId;
                return (
                  <tr
                    key={u.id}
                    className="group rise border-b border-ink-800/60 transition-colors duration-150 last:border-0 hover:bg-ink-850"
                    style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          aria-hidden
                          className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-signal-500 text-[11px] font-semibold text-ink-950"
                        >
                          {u.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink-100">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-[10.5px] uppercase tracking-[0.1em] text-signal-600">
                              you
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="tabular px-5 py-3 text-ink-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <div className="w-[160px]">
                        <Select
                          value={u.role}
                          disabled={busy || isSelf}
                          onChange={(e) =>
                            mutate(() =>
                              api.patch(`/users/${u.id}`, { role: e.target.value }),
                            )
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{humanise(r)}</option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.isActive ? (
                        <Chip className="border-healthy-500/40 text-healthy-500">
                          Active
                        </Chip>
                      ) : (
                        <Chip className="border-loss-500/40 text-loss-500">
                          Deactivated
                        </Chip>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isSelf ? (
                        <span className="text-[11px] text-ink-500">
                          You can&rsquo;t change your own status
                        </span>
                      ) : u.isActive ? (
                        <Button
                          variant="ghost" size="sm"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                `Deactivate ${u.name}? They will lose access immediately. Their historic leads/bookings stay on record.`,
                              )
                            ) {
                              mutate(() => api.patch(`/users/${u.id}`, { isActive: false }));
                            }
                          }}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="secondary" size="sm"
                          disabled={busy}
                          onClick={() =>
                            mutate(() => api.patch(`/users/${u.id}`, { isActive: true }))
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('SALES_EXEC');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(''); setEmail(''); setPassword(''); setRole('SALES_EXEC'); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      setOpen(false);
      reset();
      onCreated();
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
          Add account
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Add account"
        description="Share the initial password with the new user via a secure channel. They can change it after signing in."
      >
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="au-name">Name *</Label>
              <Input
                id="au-name" autoFocus required
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Zaid Bhat"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="au-email">Email *</Label>
              <Input
                id="au-email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="zaid@www.ladakhvacation.in"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="au-pw">Initial password *</Label>
              <Input
                id="au-pw" type="text" required
                minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="min 6 characters"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="au-role">Role</Label>
              <Select
                id="au-role" value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="SALES_EXEC">Sales exec</option>
                <option value="SALES_MANAGER">Sales manager</option>
                <option value="ACCOUNTS">Accounts</option>
                <option value="MARKETING">Marketing</option>
                <option value="OPERATIONS">Operations</option>
                <option value="OWNER">Owner</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </Select>
              <p className="text-[11px] text-ink-500">
                Sales exec by default. Only OWNER/SUPER_ADMIN see agency-wide leads and reports.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                <X className="size-4" strokeWidth={1.75} />
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={busy || !name.trim() || !email.trim() || password.length < 6}
            >
              {busy ? 'Saving…' : 'Create account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
