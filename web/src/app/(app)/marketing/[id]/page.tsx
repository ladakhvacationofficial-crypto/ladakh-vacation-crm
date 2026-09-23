'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Megaphone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  Play,
  XCircle,
  RefreshCw,
  Send,
  UserX,
  FileText,
} from 'lucide-react';
import { api, type CampaignRow, type CampaignRecipientRow } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { shortDate, money } from '@/lib/format';

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const data = await api.get<CampaignRow>(`/marketing/campaigns/${id}`);
      setCampaign(data);
    } catch (err) {
      console.error('Failed to load campaign', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const handleSendNow = async () => {
    if (!campaign) return;
    if (!confirm(`Are you sure you want to trigger immediate dispatch for "${campaign.name}"?`)) return;
    try {
      setActionBusy(true);
      await api.post(`/marketing/campaigns/${campaign.id}/send`);
      await fetchCampaign();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message || err}`);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!campaign) return;
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    try {
      setActionBusy(true);
      await api.post(`/marketing/campaigns/${campaign.id}/cancel`);
      await fetchCampaign();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message || err}`);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading && !campaign) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-24 text-center text-ink-500">
        <RefreshCw className="mx-auto size-6 animate-spin" />
        <p className="mt-2 text-[13px]">Loading campaign metrics...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="text-ink-300">Campaign not found</p>
        <Link href="/marketing" className="mt-3 inline-block">
          <Button size="sm">Back to Marketing</Button>
        </Link>
      </div>
    );
  }

  const metrics = campaign.metrics || {
    pending: 0,
    sent: campaign.totalSent || 0,
    delivered: campaign.totalDelivered || 0,
    read: campaign.totalRead || 0,
    failed: campaign.totalFailed || 0,
    bounced: 0,
    unsubscribed: 0,
  };

  const deliveryRate = metrics.sent > 0 ? Math.round((metrics.delivered / metrics.sent) * 100) : 0;
  const readRate = metrics.delivered > 0 ? Math.round((metrics.read / metrics.delivered) * 100) : 0;

  const filteredRecipients = (campaign.recipients || []).filter((r) => {
    if (!recipientSearch) return true;
    const q = recipientSearch.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="text-ink-400 hover:text-ink-100">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-ink-100">{campaign.name}</h1>
              {campaign.channel === 'WHATSAPP' ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <MessageSquare className="size-3 text-emerald-400" />
                  WhatsApp
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-800/60 bg-sky-950/40 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                  <Mail className="size-3 text-sky-400" />
                  Email
                </span>
              )}
              <StatusBadge status={campaign.status} />
            </div>
            <p className="mt-1 text-[12px] text-ink-400">
              Created {shortDate(campaign.createdAt)} by {campaign.createdBy?.name || 'Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchCampaign}
            disabled={loading}
            className="border-ink-800 text-ink-300 hover:bg-ink-900"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
            <Button
              size="sm"
              onClick={handleSendNow}
              disabled={actionBusy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 shadow-sm"
            >
              <Play className="size-3.5" />
              Send Now
            </Button>
          )}

          {campaign.status === 'SCHEDULED' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancel}
              disabled={actionBusy}
              className="border-loss-800/80 text-loss-400 hover:bg-loss-950/40"
            >
              <XCircle className="size-3.5" />
              Cancel Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Funnel Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Panel className="border-ink-800/80 bg-ink-950 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Target Audience</p>
          <p className="mt-2 text-2xl font-bold text-ink-100">{campaign.targetCount}</p>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Dispatched</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-400">{metrics.sent}</span>
            <span className="text-[11px] text-ink-400">
              ({campaign.targetCount > 0 ? Math.round((metrics.sent / campaign.targetCount) * 100) : 0}%)
            </span>
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Delivered</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-healthy-400">{metrics.delivered}</span>
            <span className="text-[11px] text-healthy-500 font-medium">({deliveryRate}%)</span>
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Read / Opened</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-400">{metrics.read}</span>
            <span className="text-[11px] text-sky-500 font-medium">({readRate}%)</span>
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Failed / Opt-Out</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-loss-400">{metrics.failed}</span>
            {metrics.unsubscribed > 0 && (
              <span className="text-[11px] text-loss-400">({metrics.unsubscribed} unsubs)</span>
            )}
          </div>
        </Panel>
      </div>

      {/* Campaign Details & Configuration */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="border-ink-800 bg-ink-950 p-5 lg:col-span-1">
          <PanelTitle className="text-sm font-semibold text-ink-100">Broadcast Configuration</PanelTitle>
          <div className="mt-4 space-y-3 text-[12.5px]">
            <div>
              <p className="text-[11px] text-ink-500">Template / Subject</p>
              <p className="font-mono text-ink-200 mt-0.5">
                {campaign.templateName || campaign.emailSubject || 'Default'}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-ink-500">Estimated Cost</p>
              <p className="font-semibold text-amber-400">
                {campaign.estimatedCost > 0 ? money(campaign.estimatedCost) : '₹0'}
              </p>
            </div>

            {campaign.startedAt && (
              <div>
                <p className="text-[11px] text-ink-500">Dispatched At</p>
                <p className="text-ink-300">{shortDate(campaign.startedAt)}</p>
              </div>
            )}

            {campaign.completedAt && (
              <div>
                <p className="text-[11px] text-ink-500">Completed At</p>
                <p className="text-ink-300">{shortDate(campaign.completedAt)}</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Recipients Table */}
        <Panel className="border-ink-800 bg-ink-950 lg:col-span-2">
          <PanelHeader className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-800 px-5 py-3.5">
            <PanelTitle className="text-sm font-semibold text-ink-100">
              Recipients ({filteredRecipients.length})
            </PanelTitle>
            <input
              type="text"
              placeholder="Search recipient..."
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1 text-[12px] text-ink-200 focus:outline-none focus:ring-1 focus:ring-signal-500"
            />
          </PanelHeader>

          <PanelBody className="p-0">
            {filteredRecipients.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-ink-500">
                No recipients listed for this campaign.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="border-b border-ink-800 bg-ink-900/40 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Recipient</th>
                      <th className="px-4 py-2.5">Contact</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800/60">
                    {filteredRecipients.map((r) => (
                      <tr key={r.id} className="hover:bg-ink-900/40 transition">
                        <td className="px-4 py-2.5 font-medium text-ink-200">
                          {r.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-ink-400 font-mono">
                          {r.phone || r.email || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <RecipientStatusBadge status={r.status} error={r.errorMessage} />
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-ink-500">
                          {r.sentAt ? shortDate(r.sentAt) : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DRAFT':
      return <Chip className="border-ink-700 bg-ink-800/60 text-ink-300">Draft</Chip>;
    case 'SCHEDULED':
      return <Chip className="border-amber-800/60 bg-amber-950/40 text-amber-300">Scheduled</Chip>;
    case 'SENDING':
      return <Chip className="border-sky-800/60 bg-sky-950/40 text-sky-300 animate-pulse">Sending...</Chip>;
    case 'SENT':
      return <Chip className="border-healthy-800/60 bg-healthy-950/40 text-healthy-300">Sent</Chip>;
    case 'CANCELLED':
      return <Chip className="border-ink-800 bg-ink-900/60 text-ink-500">Cancelled</Chip>;
    case 'FAILED':
      return <Chip className="border-loss-800/60 bg-loss-950/40 text-loss-300">Failed</Chip>;
    default:
      return <Chip>{status}</Chip>;
  }
}

function RecipientStatusBadge({ status, error }: { status: string; error?: string | null }) {
  switch (status) {
    case 'PENDING':
      return <span className="text-[11px] text-ink-500">Pending</span>;
    case 'SENT':
      return <span className="text-[11px] text-teal-400 font-medium">✓ Sent</span>;
    case 'DELIVERED':
      return <span className="text-[11px] text-healthy-400 font-medium">✓✓ Delivered</span>;
    case 'READ':
      return <span className="text-[11px] text-sky-400 font-bold">✓✓ Read</span>;
    case 'FAILED':
      return (
        <span className="text-[11px] text-loss-400 font-medium" title={error || ''}>
          ✕ Failed {error ? `(${error})` : ''}
        </span>
      );
    case 'UNSUBSCRIBED':
      return <span className="text-[11px] text-amber-400">Opted Out</span>;
    default:
      return <span className="text-[11px] text-ink-400">{status}</span>;
  }
}
