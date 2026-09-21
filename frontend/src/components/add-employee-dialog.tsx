'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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

/**
 * Hire dialog. Only the fields you MUST have to onboard someone. The rest
 * (bank, salary, docs, emergency contact) live on the employee's detail page
 * and can be filled in on day two without blocking day one.
 */
export function AddEmployeeDialog({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [joinedOn, setJoinedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [ctcMonthly, setCtcMonthly] = useState('');
  const [notes, setNotes] = useState('');

  function reset() {
    setFullName('');
    setPhone('');
    setEmail('');
    setDesignation('');
    setDepartment('');
    setEmploymentType('FULL_TIME');
    setJoinedOn(new Date().toISOString().slice(0, 10));
    setCtcMonthly('');
    setNotes('');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !designation.trim() || !joinedOn) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        joinedOn,
        employmentType,
      };
      if (email.trim()) body.email = email.trim();
      if (department.trim()) body.department = department.trim();
      if (ctcMonthly) body.ctcMonthly = Number(ctcMonthly);
      if (notes.trim()) body.notes = notes.trim();

      const res = await api.post<{ id: string }>('/employees', body);
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
          Add person
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Add person"
        description="Onboard a new employee. Only the essentials — bank, salary components and documents can be filled in on the detail page."
      >
        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ae-name">Full name *</Label>
              <Input
                id="ae-name" autoFocus required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aisha Bano"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ae-phone">Phone *</Label>
              <Input
                id="ae-phone" type="tel" required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ae-email">Email</Label>
              <Input
                id="ae-email" type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ae-desig">Designation *</Label>
              <Input
                id="ae-desig" required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Sales Executive"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ae-dept">Department</Label>
              <Input
                id="ae-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Sales / Ops / Accounts"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ae-type">Employment type</Label>
              <Select
                id="ae-type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
                <option value="CONSULTANT">Consultant</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ae-joined">Joined on *</Label>
              <Input
                id="ae-joined" type="date" required
                value={joinedOn}
                onChange={(e) => setJoinedOn(e.target.value)}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ae-ctc">Monthly CTC (₹)</Label>
              <Input
                id="ae-ctc" type="number" min={0}
                value={ctcMonthly}
                onChange={(e) => setCtcMonthly(e.target.value)}
                placeholder="30000"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ae-notes">Notes</Label>
              <Textarea
                id="ae-notes" rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything HR should know at onboarding"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500"
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
              disabled={busy || !fullName.trim() || !phone.trim() || !designation.trim() || !joinedOn}
            >
              {busy ? 'Saving…' : 'Save & continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
