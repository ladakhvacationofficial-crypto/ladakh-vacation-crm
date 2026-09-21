'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Flame,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { money } from '@/lib/format';

interface MonthlyForecastPoint {
  monthName: string;
  monthIndex: number;
  year: number;
  projectedInquiries: number;
  projectedBookings: number;
  expectedGrossRevenue: number;
  demandIndex: number;
  peakSeasonTag?: string;
  marginAdvice: {
    recommendedMarginPercent: number;
    pricingStrategy: 'PREMIUM_SURGE' | 'OPTIMAL_STANDARD' | 'VOLUME_PROMOTIONAL';
    headline: string;
    actionableAdvice: string;
  };
}

interface DestinationForecastBreakdown {
  destination: string;
  next30DaysDemand: number;
  next60DaysDemand: number;
  next90DaysDemand: number;
  trend: 'SURGING' | 'STABLE' | 'DECLINING';
  keyDriver: string;
}

interface TourismForecastResponse {
  generatedAt: string;
  horizonDays: number;
  monthlyProjections: MonthlyForecastPoint[];
  destinationBreakdown: DestinationForecastBreakdown[];
  operationalAlerts: string[];
}

interface TravelerCluster {
  id: string;
  name: string;
  badgeEmoji: string;
  description: string;
  size: number;
  percentageOfTotal: number;
  avgBudget: number;
  avgPax: number;
  avgNights: number;
  conversionRate: number;
  recommendedPitch: string;
  sampleWhatsAppPitch: string;
}

interface ClusterAnalysisResult {
  generatedAt: string;
  totalLeadsAnalyzed: number;
  clusters: TravelerCluster[];
  actionableInsights: string[];
}

export default function MlIntelligencePage() {
  const [forecast, setForecast] = useState<TourismForecastResponse | null>(null);
  const [clusters, setClusters] = useState<ClusterAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, c] = await Promise.all([
        api.get<TourismForecastResponse>('/ml/forecast'),
        api.get<ClusterAnalysisResult>('/ml/clusters'),
      ]);
      setForecast(f);
      setClusters(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load ML analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBatchScore() {
    setBatchBusy(true);
    setBatchFeedback(null);
    try {
      const res = await api.post<{ scoredCount: number; averageScore: number }>('/ml/leads/batch-score?limit=150', {});
      setBatchFeedback(`✓ Re-scored ${res.scoredCount} active leads. Pipeline average score: ${res.averageScore}/100.`);
      setTimeout(() => setBatchFeedback(null), 5000);
    } catch (e) {
      setBatchFeedback(e instanceof ApiError ? e.message : 'Batch scoring failed.');
    } finally {
      setBatchBusy(false);
    }
  }

  function handleCopyPitch(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPitchId(id);
    setTimeout(() => setCopiedPitchId(null), 2500);
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-400 mb-1">
            <Link href="/leads" className="hover:text-ink-200 flex items-center gap-1">
              <ArrowLeft className="size-3" />
              Leads
            </Link>
            <span>/</span>
            <span className="text-signal-400">ML Tourism Intelligence</span>
          </div>
          <h1 className="display text-2xl sm:text-3xl font-bold tracking-tight text-ink-100 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-signal-500/20 text-signal-400">
              <Sparkles className="size-5" />
            </span>
            <span>Machine Learning & Tourism Intelligence</span>
          </h1>
          <p className="mt-1 text-sm text-ink-400 max-w-2xl">
            Real-time demand forecasting, triple exponential smoothing, dynamic margin optimization, and K-Means traveller segmentation for Ladakh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleBatchScore}
            disabled={batchBusy}
            className="gap-1.5 bg-signal-500 hover:bg-signal-400 text-ink-950 font-semibold shadow-sm"
          >
            {batchBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Zap className="size-3.5" />
            )}
            <span>Re-Score Pipeline Leads</span>
          </Button>
        </div>
      </div>

      {batchFeedback && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-300 font-medium flex items-center justify-between">
          <span>{batchFeedback}</span>
          <button onClick={() => setBatchFeedback(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-loss-500/30 bg-loss-950/40 p-4 text-xs text-loss-300">
          {error}
        </div>
      )}

      {/* Operational Alerts Bar */}
      {forecast && forecast.operationalAlerts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {forecast.operationalAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-ink-800 bg-ink-900/80 p-3.5 text-xs leading-relaxed text-ink-200 shadow-sm flex items-start gap-2.5"
            >
              <div className="size-2 rounded-full bg-signal-400 mt-1.5 shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 1: 90-Day Seasonal Demand Forecasting ───────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-signal-400" />
            <h2 className="text-base font-semibold text-ink-100">
              90-Day Demand & Dynamic Margin Forecast
            </h2>
          </div>
          <span className="text-xs text-ink-500">Holt-Winters Triple Exponential Smoothing</span>
        </div>

        {forecast && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecast.monthlyProjections.map((m, idx) => {
              const isSurge = m.marginAdvice.pricingStrategy === 'PREMIUM_SURGE';
              const isStandard = m.marginAdvice.pricingStrategy === 'OPTIMAL_STANDARD';

              const strategyBadge = isSurge
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : isStandard
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-ink-800 text-ink-300 border-ink-700';

              return (
                <Panel key={idx} className="border-ink-800 bg-ink-900/70 relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isSurge ? 'bg-amber-500' : isStandard ? 'bg-emerald-500' : 'bg-ink-700'
                    }`}
                  />
                  <PanelBody className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                          {m.year} Projection
                        </span>
                        <h3 className="text-xl font-bold text-ink-100">{m.monthName}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${strategyBadge}`}>
                        {m.marginAdvice.pricingStrategy.replace('_', ' ')}
                      </span>
                    </div>

                    {m.peakSeasonTag && (
                      <p className="text-xs text-signal-400 font-medium">
                        ✨ {m.peakSeasonTag}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-800/80 text-xs">
                      <div>
                        <p className="text-ink-500 text-[11px]">Est. Inquiries</p>
                        <p className="text-base font-semibold text-ink-100">{m.projectedInquiries}</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[11px]">Est. Bookings</p>
                        <p className="text-base font-semibold text-emerald-400">{m.projectedBookings}</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[11px]">Expected Pipeline</p>
                        <p className="text-sm font-semibold text-ink-200">₹{(m.expectedGrossRevenue / 100000).toFixed(1)}L</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[11px]">Demand Index</p>
                        <p className="text-sm font-semibold text-signal-400">{m.demandIndex}x normal</p>
                      </div>
                    </div>

                    {/* Margin advice card */}
                    <div className="rounded-lg border border-ink-800 bg-ink-950 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] uppercase tracking-wider text-ink-400 font-semibold">Recommended Margin</span>
                        <span className="text-sm font-bold text-amber-400">{m.marginAdvice.recommendedMarginPercent}%</span>
                      </div>
                      <p className="text-ink-300 text-[11px] leading-relaxed">
                        {m.marginAdvice.actionableAdvice}
                      </p>
                    </div>
                  </PanelBody>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Destination Specific Projections ─────────────────── */}
      {forecast && (
        <Panel className="border-ink-800 bg-ink-900/60">
          <PanelHeader className="border-b border-ink-800 p-4">
            <PanelTitle className="text-sm font-semibold text-ink-100 flex items-center gap-2">
              <Compass className="size-4 text-signal-400" />
              <span>Destination Demand Projections (Next 90 Days)</span>
            </PanelTitle>
          </PanelHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-800 text-[10.5px] uppercase tracking-wider text-ink-500 bg-ink-950/60">
                  <th className="px-5 py-3 font-semibold">Destination</th>
                  <th className="px-4 py-3 font-semibold text-center">Trend</th>
                  <th className="px-4 py-3 font-semibold text-right">30 Days</th>
                  <th className="px-4 py-3 font-semibold text-right">60 Days</th>
                  <th className="px-4 py-3 font-semibold text-right">90 Days</th>
                  <th className="px-5 py-3 font-semibold">Primary Season Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {forecast.destinationBreakdown.map((dest, i) => (
                  <tr key={i} className="hover:bg-ink-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-ink-100">
                      {dest.destination}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          dest.trend === 'SURGING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-ink-800 text-ink-400'
                        }`}
                      >
                        {dest.trend === 'SURGING' ? '🔥 Surging' : 'Stable'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-ink-200">
                      ~{dest.next30DaysDemand} trips
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-ink-200">
                      ~{dest.next60DaysDemand} trips
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-ink-200">
                      ~{dest.next90DaysDemand} trips
                    </td>
                    <td className="px-5 py-3.5 text-ink-400 text-[11px]">
                      {dest.keyDriver}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── SECTION 3: K-Means Traveler Cohort Segmentation ─────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-signal-400" />
            <h2 className="text-base font-semibold text-ink-100">
              Traveler Cohort Segmentation (K-Means Clustering)
            </h2>
          </div>
          <span className="text-xs text-ink-500">
            {clusters?.totalLeadsAnalyzed ?? 0} Inquiries Analyzed
          </span>
        </div>

        {clusters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.clusters.map((c) => {
              const isCopied = copiedPitchId === c.id;

              return (
                <Panel key={c.id} className="border-ink-800 bg-ink-900/80 hover:border-ink-700 transition-all">
                  <PanelBody className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{c.badgeEmoji}</span>
                        <div>
                          <h3 className="text-sm font-bold text-ink-100">{c.name}</h3>
                          <p className="text-[11px] text-ink-400 mt-0.5">{c.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-ink-800 text-ink-300">
                        {c.percentageOfTotal}% of pipeline
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 py-2 border-y border-ink-800/80 text-center text-xs">
                      <div>
                        <p className="text-ink-500 text-[10px] uppercase">Avg Budget</p>
                        <p className="font-semibold text-ink-100 mt-0.5">₹{c.avgBudget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[10px] uppercase">Avg Pax</p>
                        <p className="font-semibold text-ink-100 mt-0.5">{c.avgPax} travelers</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[10px] uppercase">Avg Nights</p>
                        <p className="font-semibold text-ink-100 mt-0.5">{c.avgNights} nights</p>
                      </div>
                      <div>
                        <p className="text-ink-500 text-[10px] uppercase">Close Rate</p>
                        <p className="font-semibold text-emerald-400 mt-0.5">{Math.round(c.conversionRate * 100)}%</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-signal-400">
                          Recommended Pitch Strategy:
                        </span>
                        <p className="text-ink-300 text-[11px] leading-relaxed mt-0.5">
                          {c.recommendedPitch}
                        </p>
                      </div>

                      {/* WhatsApp pitch snippet */}
                      <div className="rounded-lg border border-ink-800 bg-ink-950 p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-ink-500">
                          <span>READY-TO-SEND WHATSAPP TEMPLATE</span>
                          <button
                            onClick={() => handleCopyPitch(c.id, c.sampleWhatsAppPitch)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                            <span>{isCopied ? 'Copied!' : 'Copy Template'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-ink-200 font-mono italic leading-relaxed">
                          &quot;{c.sampleWhatsAppPitch}&quot;
                        </p>
                      </div>
                    </div>
                  </PanelBody>
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
