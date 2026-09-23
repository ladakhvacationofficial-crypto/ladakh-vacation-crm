'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  RotateCw,
  Trophy,
  Scale,
  UserX,
  Check,
  Save,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Chip } from '@/components/ui/badge';

export interface RoutingSettingsData {
  id: string;
  isEnabled: boolean;
  strategy: 'ROUND_ROBIN' | 'PERFORMANCE_WEIGHTED' | 'LOAD_BALANCED' | 'MANUAL';
  highScoreThreshold: number;
  lastAssignedUserId: string | null;
  excludedUserIds: string[];
}

export interface StaffPerformanceStat {
  userId: string;
  name: string;
  email: string;
  role: string;
  isEligible: boolean;
  activeOpenLeads: number;
  recentLeadsAssigned: number;
  recentBookingsWon: number;
  conversionRate: number;
}

export function RoutingSettingsPanel() {
  const [settings, setSettings] = useState<RoutingSettingsData | null>(null);
  const [stats, setStats] = useState<StaffPerformanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ settings: RoutingSettingsData; stats: StaffPerformanceStat[] }>(
        '/settings/routing',
      );
      setSettings(res.settings);
      setStats(res.stats);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load routing settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleUserEligibility = (userId: string) => {
    if (!settings) return;
    const current = new Set(settings.excludedUserIds || []);
    if (current.has(userId)) {
      current.delete(userId);
    } else {
      current.add(userId);
    }
    setSettings({ ...settings, excludedUserIds: Array.from(current) });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      await api.patch('/settings/routing', {
        isEnabled: settings.isEnabled,
        strategy: settings.strategy,
        highScoreThreshold: settings.highScoreThreshold,
        excludedUserIds: settings.excludedUserIds,
      });
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-12 text-center text-[13px] text-ink-500">
        Loading routing configurations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500">
          {error}
        </p>
      )}

      {/* Main Settings Card */}
      <Panel className="border-ink-800 bg-ink-950">
        <PanelHeader className="flex items-center justify-between border-b border-ink-800 px-6 py-4">
          <div>
            <PanelTitle className="flex items-center gap-2 text-base font-semibold text-ink-100">
              <Users className="size-4 text-signal-500" />
              Lead Auto-Assignment & Smart Routing
            </PanelTitle>
            <p className="mt-0.5 text-[12px] text-ink-400">
              Controls how new inquiries from Meta Ads, Webhooks, WhatsApp, and Website forms are distributed among sales staff.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saved && <span className="text-[12px] text-healthy-400 font-medium">Settings saved!</span>}
            <Button
              disabled={saving}
              onClick={handleSave}
              className="bg-signal-600 hover:bg-signal-500 text-white gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Save className="size-3.5" />
              {saving ? 'Saving...' : 'Save Routing Rules'}
            </Button>
          </div>
        </PanelHeader>

        <PanelBody className="space-y-6 px-6 py-6">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900/40 p-4">
            <div>
              <p className="font-semibold text-ink-100 text-[13.5px]">Automated Lead Distribution</p>
              <p className="text-[12px] text-ink-400">
                When enabled, new leads are immediately assigned to an active sales executive upon capture.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-ink-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-ink-600 after:bg-white after:transition-all after:content-[''] peer-checked:bg-signal-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>

          {/* Strategy Selector */}
          <div>
            <Label className="text-[13px] text-ink-300">Routing Strategy</Label>
            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Round Robin */}
              <div
                onClick={() => setSettings({ ...settings, strategy: 'ROUND_ROBIN' })}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  settings.strategy === 'ROUND_ROBIN'
                    ? 'border-signal-500 bg-signal-950/40 ring-1 ring-signal-500'
                    : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-signal-400 font-semibold text-[13px]">
                    <RotateCw className="size-4" />
                    Round-Robin
                  </div>
                  {settings.strategy === 'ROUND_ROBIN' && <Check className="size-4 text-signal-400" />}
                </div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  Equal sequential distribution among all active sales staff.
                </p>
              </div>

              {/* Performance Weighted */}
              <div
                onClick={() => setSettings({ ...settings, strategy: 'PERFORMANCE_WEIGHTED' })}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  settings.strategy === 'PERFORMANCE_WEIGHTED'
                    ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500'
                    : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-[13px]">
                    <Trophy className="size-4" />
                    Conversion-Weighted
                  </div>
                  {settings.strategy === 'PERFORMANCE_WEIGHTED' && <Check className="size-4 text-amber-400" />}
                </div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  Routes high-intent leads to your highest-converting sales reps.
                </p>
              </div>

              {/* Load Balanced */}
              <div
                onClick={() => setSettings({ ...settings, strategy: 'LOAD_BALANCED' })}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  settings.strategy === 'LOAD_BALANCED'
                    ? 'border-teal-500 bg-teal-950/40 ring-1 ring-teal-500'
                    : 'border-ink-800 bg-ink-900/30 hover:border-ink-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold text-[13px]">
                    <Scale className="size-4" />
                    Load-Balanced
                  </div>
                  {settings.strategy === 'LOAD_BALANCED' && <Check className="size-4 text-teal-400" />}
                </div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  Assigns to the sales rep with the lowest number of active open leads.
                </p>
              </div>
            </div>
          </div>

          {/* High Intent Threshold (Conditional) */}
          {settings.strategy === 'PERFORMANCE_WEIGHTED' && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] text-amber-300 font-semibold flex items-center gap-1.5">
                  <Trophy className="size-4 text-amber-400" />
                  High-Intent Lead Score Threshold
                </Label>
                <span className="text-[13px] font-bold text-amber-400">
                  Score ≥ {settings.highScoreThreshold} pts
                </span>
              </div>
              <p className="text-[11.5px] text-ink-400">
                Leads scoring at or above this threshold will automatically bypass regular rotation and route to the executive with the highest 30-day conversion rate.
              </p>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={settings.highScoreThreshold}
                onChange={(e) => setSettings({ ...settings, highScoreThreshold: parseInt(e.target.value) })}
                className="mt-2 w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-500">
                <span>Medium Intent (30)</span>
                <span>Standard High Intent (60)</span>
                <span>Elite VIP Only (90)</span>
              </div>
            </div>
          )}

          {/* Staff Performance & Eligibility Scoreboard */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[13px] text-ink-200 font-semibold">
                  Sales Staff Eligibility & Performance Scoreboard
                </Label>
                <p className="text-[11.5px] text-ink-500">
                  Uncheck any staff member who is on leave or should not receive automated lead assignments.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-ink-800 bg-ink-900/40">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-ink-800 bg-ink-900/60 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="px-4 py-3">Eligible</th>
                    <th className="px-4 py-3">Sales Executive</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Open Active Leads</th>
                    <th className="px-4 py-3">30-Day Assigned</th>
                    <th className="px-4 py-3">30-Day Won</th>
                    <th className="px-4 py-3 text-right">30-Day Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/60">
                  {stats.map((s, idx) => {
                    const isExcluded = (settings.excludedUserIds || []).includes(s.userId);
                    const isTopPerformer = idx === 0 && s.conversionRate > 0;

                    return (
                      <tr
                        key={s.userId}
                        className={`hover:bg-ink-900/40 transition ${
                          isExcluded ? 'opacity-50 bg-ink-950/60' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleUserEligibility(s.userId)}
                            className="size-4 rounded border-ink-700 bg-ink-900 text-signal-600 focus:ring-signal-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-ink-100 flex items-center gap-2">
                          {s.name}
                          {isTopPerformer && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              <Trophy className="size-3 text-amber-400" />
                              Top Agent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-ink-400 font-mono">
                          {s.role}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink-200">{s.activeOpenLeads}</span>
                          <span className="text-[11px] text-ink-500 ml-1">leads</span>
                        </td>
                        <td className="px-4 py-3 text-ink-300">{s.recentLeadsAssigned}</td>
                        <td className="px-4 py-3 text-healthy-400 font-medium">{s.recentBookingsWon}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold tabular ${
                              s.conversionRate >= 20
                                ? 'text-healthy-400'
                                : s.conversionRate >= 10
                                ? 'text-amber-400'
                                : 'text-ink-400'
                            }`}
                          >
                            {s.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}
