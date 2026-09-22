'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Zap,
  Snowflake,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

export interface LeadScoreResult {
  leadId: string;
  name: string;
  score: number; // 1-100
  grade: 'HOT' | 'WARM' | 'COOL' | 'COLD';
  winProbability: number; // 0.0 - 1.0
  positiveSignals: string[];
  riskSignals: string[];
  recommendedAction: string;
  scoredAt: string;
}

export function MlLeadScoreCard({
  leadId,
  initialScore,
  onScored,
}: {
  leadId: string;
  initialScore?: number;
  onScored?: (newScore: number) => void;
}) {
  const [data, setData] = useState<LeadScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<LeadScoreResult>(`/ml/leads/${leadId}/score`);
      setData(res);
      if (onScored) onScored(res.score);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not fetch ML score.');
    } finally {
      setLoading(false);
    }
  }, [leadId, onScored]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const score = data?.score ?? initialScore ?? 0;
  const grade = data?.grade ?? (score >= 75 ? 'HOT' : score >= 50 ? 'WARM' : score >= 30 ? 'COOL' : 'COLD');

  const gradeConfig = {
    HOT: {
      label: 'HOT LEAD',
      emoji: '🔥',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      ringColor: 'text-emerald-400',
      tagline: 'High conversion probability — call immediately',
    },
    WARM: {
      label: 'WARM LEAD',
      emoji: '⚡',
      badgeClass: 'bg-signal-500/15 text-signal-400 border-signal-500/30',
      ringColor: 'text-signal-400',
      tagline: 'Strong inquiry potential — follow up within 2h',
    },
    COOL: {
      label: 'COOL LEAD',
      emoji: '❄️',
      badgeClass: 'bg-ink-700/40 text-ink-300 border-ink-600/40',
      ringColor: 'text-ink-400',
      tagline: 'Needs qualification and budget confirmation',
    },
    COLD: {
      label: 'COLD / NURTURE',
      emoji: '🧊',
      badgeClass: 'bg-ink-850 text-ink-400 border-ink-800',
      ringColor: 'text-ink-600',
      tagline: 'Long-term prospect — add to seasonal campaign',
    },
  }[grade];

  return (
    <Panel className="border-signal-500/30 bg-gradient-to-b from-signal-500/5 via-ink-950 to-ink-950 shadow-sm overflow-hidden">
      <PanelHeader className="flex items-center justify-between border-b border-ink-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-signal-500/20 text-signal-400">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <PanelTitle className="text-[13px] font-semibold tracking-tight text-ink-100">
              Predictive ML Intelligence
            </PanelTitle>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${gradeConfig.badgeClass}`}
          >
            <span>{gradeConfig.emoji}</span>
            <span>{gradeConfig.label}</span>
          </span>
        </div>
      </PanelHeader>

      <PanelBody className="space-y-4 pt-3">
        {/* Metric gauge & win probability */}
        <div className="flex items-center gap-4 rounded-xl border border-ink-800/80 bg-ink-900/60 p-3.5">
          <div className="relative flex size-14 shrink-0 items-center justify-center">
            <svg width={56} height={56} className="-rotate-90">
              <circle
                cx={28}
                cy={28}
                r={23}
                strokeWidth={5}
                className="stroke-ink-800"
                fill="none"
              />
              <circle
                cx={28}
                cy={28}
                r={23}
                strokeWidth={5}
                strokeDasharray={`${(score / 100) * (2 * Math.PI * 23)} ${2 * Math.PI * 23}`}
                strokeLinecap="round"
                className={`transition-all duration-700 ${gradeConfig.ringColor}`}
                stroke="currentColor"
                fill="none"
              />
            </svg>
            <span className="absolute text-[15px] font-bold text-ink-100">
              {score}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Win Probability
              </p>
              <p className="text-sm font-bold text-ink-100">
                {data?.winProbability ? `${Math.round(data.winProbability * 100)}%` : `${score}%`}
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400 leading-tight">
              {gradeConfig.tagline}
            </p>
          </div>
        </div>

        {/* Positive Win Signals */}
        {data && data.positiveSignals && data.positiveSignals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-400">
              High-Impact Win Signals
            </p>
            <ul className="space-y-1 text-[11px] text-ink-300">
              {data.positiveSignals.map((sig, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-400" />
                  <span>{sig}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Flags */}
        {data && data.riskSignals && data.riskSignals.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-warn-400">
              Conversion Hurdles
            </p>
            <ul className="space-y-1 text-[11px] text-ink-300">
              {data.riskSignals.map((risk, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warn-400" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actionable Next Step */}
        {data?.recommendedAction && (
          <div className="rounded-lg border border-signal-500/25 bg-signal-500/10 p-2.5 text-[11px] text-ink-200">
            <p className="font-semibold text-signal-400 text-[10.5px] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="size-3" />
              Recommended Next Action
            </p>
            <p className="leading-relaxed">{data.recommendedAction}</p>
          </div>
        )}

        {error && (
          <p className="text-[11px] text-loss-400">{error}</p>
        )}

        <div className="flex justify-end pt-1 border-t border-ink-800/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchScore}
            disabled={loading}
            className="h-7 text-[11px] text-ink-400 hover:text-ink-200 gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            <span>{loading ? 'Analyzing…' : 'Recalculate with ML'}</span>
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
