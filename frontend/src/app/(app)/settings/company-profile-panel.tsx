'use client';

import { useEffect, useState } from 'react';
import { Save, Building2, Landmark, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export interface CompanyProfileData {
  id?: string;
  legalName: string;
  brandName: string;
  gstin?: string | null;
  pan?: string | null;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolder?: string | null;
  upiId?: string | null;
}

export function CompanyProfilePanel() {
  const [profile, setProfile] = useState<CompanyProfileData>({
    legalName: 'Ladakh Vacation Private Limited',
    brandName: 'Ladakh Vacation',
    gstin: '38AABCL1234F1Z5',
    pan: 'AABCL1234F',
    address: 'Main Bazaar Road, Near SBI Bank',
    city: 'Leh',
    state: 'Ladakh (UT)',
    stateCode: '38',
    pincode: '194101',
    phone: '+91 94191 78901',
    email: 'reservations@ladakhvacation.in',
    website: 'https://ladakhvacation.com',
    bankName: 'State Bank of India',
    accountNumber: '',
    ifscCode: 'SBIN0001365',
    accountHolder: 'Ladakh Vacation Pvt Ltd',
    upiId: 'ladakhvacation@sbi',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CompanyProfileData>('/settings/company-profile')
      .then((data) => {
        if (data) setProfile((prev) => ({ ...prev, ...data }));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof CompanyProfileData>(key: K, value: CompanyProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.patch('/settings/company-profile', profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-lg bg-ink-800/30 shimmer" />
        <div className="h-44 rounded-lg bg-ink-800/30 shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-xs text-loss-400">
          {error}
        </p>
      )}

      {/* Official Business Identity */}
      <Panel>
        <PanelHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-signal-400" />
            <PanelTitle>Legal Entity & Tax Information</PanelTitle>
          </div>
          <p className="text-xs text-ink-400">
            These official details appear on client quotes, pro-forma receipts, and GST invoices.
          </p>
        </PanelHeader>
        <PanelBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="legalName">Registered Company Name</Label>
              <Input
                id="legalName"
                value={profile.legalName}
                onChange={(e) => update('legalName', e.target.value)}
                placeholder="Ladakh Vacation Private Limited"
              />
            </div>
            <div>
              <Label htmlFor="brandName">Trading / Brand Name</Label>
              <Input
                id="brandName"
                value={profile.brandName}
                onChange={(e) => update('brandName', e.target.value)}
                placeholder="Ladakh Vacation"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={profile.gstin ?? ''}
                onChange={(e) => update('gstin', e.target.value)}
                placeholder="38AABCL1234F1Z5"
              />
            </div>
            <div>
              <Label htmlFor="pan">PAN Number</Label>
              <Input
                id="pan"
                value={profile.pan ?? ''}
                onChange={(e) => update('pan', e.target.value)}
                placeholder="AABCL1234F"
              />
            </div>
            <div>
              <Label htmlFor="stateCode">Place of Supply State Code</Label>
              <Input
                id="stateCode"
                value={profile.stateCode}
                onChange={(e) => update('stateCode', e.target.value)}
                placeholder="38 (Ladakh)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="address">Registered Office Address</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Main Bazaar Road, Near SBI Bank"
              />
            </div>
            <div>
              <Label htmlFor="pincode">PIN Code</Label>
              <Input
                id="pincode"
                value={profile.pincode}
                onChange={(e) => update('pincode', e.target.value)}
                placeholder="194101"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profile.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Leh"
              />
            </div>
            <div>
              <Label htmlFor="state">State / UT</Label>
              <Input
                id="state"
                value={profile.state}
                onChange={(e) => update('state', e.target.value)}
                placeholder="Ladakh (UT)"
              />
            </div>
            <div>
              <Label htmlFor="phone">Official Contact Phone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 94191 78901"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Official Billing Email</Label>
              <Input
                id="email"
                value={profile.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="reservations@ladakhvacation.in"
              />
            </div>
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://ladakhvacation.com"
              />
            </div>
          </div>
        </PanelBody>
      </Panel>

      {/* Bank Account & Settlement Details */}
      <Panel>
        <PanelHeader>
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-signal-400" />
            <PanelTitle>Bank Accounts & Payment Settlement</PanelTitle>
          </div>
          <p className="text-xs text-ink-400">
            Bank details printed on pro-forma and tax invoices for direct client wire transfers.
          </p>
        </PanelHeader>
        <PanelBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={profile.bankName ?? ''}
                onChange={(e) => update('bankName', e.target.value)}
                placeholder="State Bank of India / HDFC Bank"
              />
            </div>
            <div>
              <Label htmlFor="accountHolder">Beneficiary / Account Holder Name</Label>
              <Input
                id="accountHolder"
                value={profile.accountHolder ?? ''}
                onChange={(e) => update('accountHolder', e.target.value)}
                placeholder="Ladakh Vacation Private Limited"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={profile.accountNumber ?? ''}
                onChange={(e) => update('accountNumber', e.target.value)}
                placeholder="Current Account Number"
              />
            </div>
            <div>
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input
                id="ifscCode"
                value={profile.ifscCode ?? ''}
                onChange={(e) => update('ifscCode', e.target.value)}
                placeholder="SBIN0001365"
              />
            </div>
            <div>
              <Label htmlFor="upiId">UPI ID / VPA</Label>
              <Input
                id="upiId"
                value={profile.upiId ?? ''}
                onChange={(e) => update('upiId', e.target.value)}
                placeholder="ladakhvacation@sbi"
              />
            </div>
          </div>
        </PanelBody>
      </Panel>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-healthy-400">
            <CheckCircle2 className="size-4" />
            Company profile saved
          </span>
        )}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
