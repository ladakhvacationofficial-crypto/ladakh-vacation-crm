'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Users, Loader2 } from 'lucide-react';

interface B2bPartner {
  id: string;
  agencyName: string;
  contactName: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  commissionRate: number;
  assignedTo?: { name: string; email?: string } | null;
  _count?: { leads: number };
}

export default function B2bPartnersPage() {
  const [partners, setPartners] = useState<B2bPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [commissionRate, setCommissionRate] = useState('10');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await api.get<B2bPartner[]>('/b2b-partners');
      setPartners(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setAgencyName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setCity('');
    setStateName('');
    setCommissionRate('10');
    setShowModal(true);
  };

  const handleOpenEdit = (p: B2bPartner) => {
    setEditingId(p.id);
    setAgencyName(p.agencyName);
    setContactName(p.contactName);
    setPhone(p.phone);
    setEmail(p.email || '');
    setCity(p.city || '');
    setStateName(p.state || '');
    setCommissionRate(String(p.commissionRate));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        agencyName: agencyName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        state: stateName.trim() || undefined,
        commissionRate: parseFloat(commissionRate) || 0,
      };

      if (editingId) {
        await api.patch(`/b2b-partners/${editingId}`, payload);
      } else {
        await api.post('/b2b-partners', payload);
      }

      setShowModal(false);
      fetchPartners();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save B2B partner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: B2bPartner) => {
    if (!window.confirm(`Are you sure you want to remove ${p.agencyName}?`)) {
      return;
    }
    setDeletingId(p.id);
    try {
      await api.del(`/b2b-partners/${p.id}`);
      fetchPartners();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete partner. Check if active leads exist.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) =>
      p.agencyName?.toLowerCase().includes(q) ||
      p.contactName?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  }, [partners, search]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-100">B2B Partners</h1>
          <p className="mt-1 text-sm text-ink-400">
            Manage travel agency partnerships, standard commissions, and agency-routed bookings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agency, phone, city..."
              className="h-9 w-60 rounded-md border border-ink-700 bg-ink-950 pl-9 pr-3 text-xs text-ink-100 placeholder:text-ink-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            <Plus className="size-4" />
            Add Partner
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-ink-400 flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading partners...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="size-8 text-ink-500 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-ink-100">
              {search ? 'No matching partners found' : 'No B2B partners yet'}
            </h3>
            <p className="mt-1 text-sm text-ink-400">
              {search ? 'Try adjusting your search criteria.' : 'Get started by creating a new travel agency partner.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-300">
              <thead className="border-b border-ink-800 bg-ink-950/50 text-ink-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Agency / Location</th>
                  <th className="px-6 py-3 font-medium">Primary Contact</th>
                  <th className="px-6 py-3 font-medium">Contact Details</th>
                  <th className="px-6 py-3 font-medium">Commission %</th>
                  <th className="px-6 py-3 font-medium">Active Leads</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink-100">{p.agencyName}</div>
                      {(p.city || p.state) && (
                        <div className="text-xs text-ink-400">
                          {[p.city, p.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink-200">{p.contactName}</td>
                    <td className="px-6 py-4">
                      <div className="text-ink-200">{p.phone}</div>
                      <div className="text-xs text-ink-500">{p.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold-400/10 text-gold-300 border border-gold-400/20">
                        {p.commissionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-300">
                        <Users className="size-3.5 text-ink-500" />
                        {p._count?.leads ?? 0} leads
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
                          title="Edit Partner"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          title="Delete Partner"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink-100 mb-4">
              {editingId ? 'Edit B2B Partner' : 'Add B2B Partner'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Agency Name</label>
                <input
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="E.g. Himalayan Journeys Ltd"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Contact Person</label>
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
                  placeholder="partner@agency.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-300">City (Optional)</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="New Delhi"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-300">State (Optional)</label>
                  <input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="Delhi"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-300">Standard Commission Rate (%)</label>
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
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? 'Saving...' : editingId ? 'Update Partner' : 'Save Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
