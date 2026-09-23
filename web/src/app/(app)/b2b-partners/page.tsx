'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';

export default function B2bPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState('10');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await api.get<any[]>('/b2b-partners');
      setPartners(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/b2b-partners', {
        agencyName,
        contactName,
        phone,
        email,
        commissionRate: parseFloat(commissionRate),
      });
      setShowModal(false);
      setAgencyName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setCommissionRate('10');
      fetchPartners();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create B2B partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-100">B2B Partners</h1>
          <p className="mt-1 text-sm text-ink-400">
            Manage your travel agents and B2B partners.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          <Plus className="size-4" />
          Add Partner
        </button>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-ink-400">Loading...</div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-medium text-ink-100">No B2B partners</h3>
            <p className="mt-1 text-sm text-ink-400">Get started by creating a new partner.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-ink-300">
            <thead className="border-b border-ink-800 bg-ink-950/50 text-ink-400">
              <tr>
                <th className="px-6 py-3 font-medium">Agency</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Phone / Email</th>
                <th className="px-6 py-3 font-medium">Commission %</th>
                <th className="px-6 py-3 font-medium text-right">Partner ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-ink-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink-100">{p.agencyName}</td>
                  <td className="px-6 py-4">{p.contactName}</td>
                  <td className="px-6 py-4">
                    <div>{p.phone}</div>
                    <div className="text-ink-500">{p.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4">{p.commissionRate}%</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-ink-500 select-all">{p.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink-100 mb-4">Add B2B Partner</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Agency Name</label>
                <input
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="E.g. Zenith Travels"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Contact Name</label>
                <input
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Phone</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="jane@zenith.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="10"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-ink-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-ink-300 hover:text-ink-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
