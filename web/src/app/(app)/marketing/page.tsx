'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  MessageSquare,
  Mail,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  Play,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { api, type CampaignRow } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { shortDate, money } from '@/lib/format';

export default function MarketingDashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'EMAIL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await api.get<CampaignRow[]>('/marketing/campaigns');
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSendNow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to trigger immediate dispatch for "${name}"?`)) return;
    try {
      setActionBusyId(id);
      await api.post(`/marketing/campaigns/${id}/send`);
      await fetchCampaigns();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message || err}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    try {
      setActionBusyId(id);
      await api.post(`/marketing/campaigns/${id}/cancel`);
      await fetchCampaigns();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message || err}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      return true;
    });
  }, [campaigns, channelFilter, statusFilter]);

  // Aggregate high-level KPIs
  const stats = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter((c) => c.status === 'SENT').length;
    const totalTarget = campaigns.reduce((acc, c) => acc + (c.targetCount || 0), 0);
    const totalSent = campaigns.reduce((acc, c) => acc + (c.totalSent || 0), 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + (c.totalDelivered || 0), 0);
    const totalRead = campaigns.reduce((acc, c) => acc + (c.totalRead || 0), 0);
    const totalSpend = campaigns.reduce((acc, c) => acc + (c.estimatedCost || 0), 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    return {
      totalCampaigns,
      sentCampaigns,
      totalTarget,
      totalSent,
      totalDelivered,
      totalRead,
      totalSpend,
      deliveryRate,
      readRate,
    };
  }, [campaigns]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="size-6 text-signal-500" strokeWidth={2} />
            <h1 className="text-xl font-bold tracking-tight text-ink-100">
              Marketing & Broadcasts
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-ink-400">
            Targeted WhatsApp & Email campaigns with audience segmentation, frequency guards, and delivery tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchCampaigns}
            disabled={loading}
            className="border-ink-800 text-ink-300 hover:bg-ink-900"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/marketing/new">
            <Button size="sm" className="bg-signal-600 hover:bg-signal-500 text-white font-medium gap-1.5 shadow-sm">
              <Plus className="size-4" strokeWidth={2} />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Panel className="border-ink-800/80 bg-ink-950/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Total Campaigns
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-100">{stats.totalCampaigns}</span>
            <span className="text-[12px] text-ink-400">({stats.sentCampaigns} dispatched)</span>
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Audience Reach
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-400">{stats.totalSent}</span>
            <span className="text-[12px] text-ink-400">recipients</span>
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Delivery & Open Rate
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-healthy-400">{stats.deliveryRate}%</span>
              <span className="ml-1 text-[11px] text-ink-500">delivered</span>
            </div>
            {stats.readRate > 0 && (
              <div className="text-[12px] text-ink-400">
                <span className="font-semibold text-sky-400">{stats.readRate}%</span> read
              </div>
            )}
          </div>
        </Panel>

        <Panel className="border-ink-800/80 bg-ink-950/60 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
            Estimated Spend
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{money(stats.totalSpend)}</span>
            <span className="text-[11px] text-ink-500">WhatsApp fees</span>
          </div>
        </Panel>
      </div>

      {/* Campaigns Table Panel */}
      <Panel className="border-ink-800 bg-ink-950">
        <PanelHeader className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <PanelTitle className="text-base font-semibold text-ink-100">
              All Campaigns
            </PanelTitle>
            <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-ink-300">
              {filtered.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-ink-800 bg-ink-900/60 p-0.5 text-[12px]">
              <button
                onClick={() => setChannelFilter('ALL')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === 'ALL'
                    ? 'bg-ink-800 text-ink-100 shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                All Channels
              </button>
              <button
                onClick={() => setChannelFilter('WHATSAPP')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === 'WHATSAPP'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <MessageSquare className="size-3 text-emerald-400" />
                WhatsApp
              </button>
              <button
                onClick={() => setChannelFilter('EMAIL')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === 'EMAIL'
                    ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60 shadow-sm'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <Mail className="size-3 text-sky-400" />
                Email
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-1 text-[12px] font-medium text-ink-200 focus:outline-none focus:ring-1 focus:ring-signal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="SENDING">Sending</option>
              <option value="SENT">Sent</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </PanelHeader>

        <PanelBody className="p-0">
          {loading ? (
            <div className="py-16 text-center text-[13px] text-ink-500">
              Loading campaigns...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone className="mx-auto size-8 text-ink-600" />
              <p className="mt-2 text-[14px] font-medium text-ink-300">No campaigns found</p>
              <p className="mt-1 text-[12px] text-ink-500">
                Launch your first broadcast campaign to re-engage prospective travelers.
              </p>
              <Link href="/marketing/new" className="mt-4 inline-block">
                <Button size="sm" className="bg-signal-600 text-white gap-1.5">
                  <Plus className="size-3.5" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-ink-800 bg-ink-900/40 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="px-5 py-3.5">Campaign</th>
                    <th className="px-4 py-3.5">Channel</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Audience</th>
                    <th className="px-4 py-3.5">Delivery Progress</th>
                    <th className="px-4 py-3.5">Est. Cost</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/60">
                  {filtered.map((c) => {
                    const isBusy = actionBusyId === c.id;
                    const sent = c.totalSent || 0;
                    const delivered = c.totalDelivered || 0;
                    const read = c.totalRead || 0;

                    return (
                      <tr key={c.id} className="hover:bg-ink-900/40 transition">
                        <td className="px-5 py-4">
                          <Link
                            href={`/marketing/${c.id}`}
                            className="font-medium text-ink-100 hover:text-signal-400 transition"
                          >
                            {c.name}
                          </Link>
                          {c.scheduledAt && c.status === 'SCHEDULED' && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-400/90">
                              <Clock className="size-3" />
                              Scheduled for {shortDate(c.scheduledAt)}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {c.channel === 'WHATSAPP' ? (
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
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={c.status} />
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-semibold text-ink-200">{c.targetCount}</span>
                          <span className="ml-1 text-[11px] text-ink-500">recipients</span>
                        </td>

                        <td className="px-4 py-4 min-w-[160px]">
                          {c.status === 'SENT' || c.status === 'SENDING' ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-ink-400">
                                <span>{sent} sent</span>
                                <span>{delivered} deliv.</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                                <div
                                  className="h-full bg-signal-500 rounded-full"
                                  style={{
                                    width: c.targetCount > 0 ? `${Math.min(100, (sent / c.targetCount) * 100)}%` : '0%',
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[12px] text-ink-500">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-ink-300 font-medium">
                          {c.estimatedCost > 0 ? money(c.estimatedCost) : '₹0'}
                        </td>

                        <td className="px-4 py-4 text-[12px] text-ink-400">
                          {shortDate(c.createdAt)}
                          {c.createdBy && (
                            <p className="text-[11px] text-ink-500 truncate max-w-[120px]">
                              by {c.createdBy.name}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSendNow(c.id, c.name)}
                                disabled={isBusy}
                                className="h-7 border-emerald-800/80 bg-emerald-950/40 text-[11px] text-emerald-300 hover:bg-emerald-900/60"
                              >
                                <Play className="size-3" />
                                Send Now
                              </Button>
                            )}

                            {c.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(c.id)}
                                disabled={isBusy}
                                className="h-7 text-[11px] text-loss-400 hover:bg-loss-950/40"
                              >
                                <XCircle className="size-3" />
                                Cancel
                              </Button>
                            )}

                            <Link href={`/marketing/${c.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                              >
                                View
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>
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
