'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PlaneLanding,
  PlaneTakeoff,
  Users,
  Mountain,
  Phone,
  MessageCircle,
  MapPin,
  Building,
} from 'lucide-react';
import { api, ApiError, type DailyMovementResponse } from '@/lib/api';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { shortDate } from '@/lib/format';

export default function MovementChartPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [data, setData] = useState<DailyMovementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'departures' | 'transit' | 'valleys'>('all');

  const loadMovement = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<DailyMovementResponse>(`/bookings/movement?date=${date}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load movement data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovement(selectedDate);
  }, [loadMovement, selectedDate]);

  function shiftDay(days: number) {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().slice(0, 10));
  }

  function setToday() {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Header & Navigation */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings"
              className="text-[13px] text-ink-400 hover:text-ink-200 transition-colors"
            >
              ← All Bookings
            </Link>
            <span className="text-ink-600">/</span>
            <h1 className="display text-[26px] font-semibold tracking-tight text-ink-100">
              Operations Movement Chart
            </h1>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-400">
            Daily on-ground guest distribution, airport pickups, and mountain pass transits across Ladakh.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 bg-ink-900 border border-ink-800 rounded-lg p-1.5 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => shiftDay(-1)}
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 px-2 text-ink-200 text-[13px] font-medium">
            <CalendarIcon className="size-4 text-signal-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-ink-100 font-medium focus:outline-none cursor-pointer"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => shiftDay(1)}
            title="Next Day"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs ml-1"
            onClick={setToday}
          >
            Today
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6">
          <div className="rounded-xl border border-ink-800/80 bg-ink-900/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-ink-400 text-xs font-medium">
              <Users className="size-4 text-signal-400" />
              Guests In Ladakh
            </div>
            <div className="mt-2 text-2xl font-bold text-ink-100 tabular">
              {data.summary.totalGuestsInDestination}
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Across {data.summary.activeBookingsCount} active bookings
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <PlaneLanding className="size-4" />
              Today's Arrivals
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-300 tabular">
              {data.summary.arrivalsToday}
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-0.5">
              Airport IXL arrivals
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
              <PlaneTakeoff className="size-4" />
              Today's Departures
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-300 tabular">
              {data.summary.departuresToday}
            </div>
            <p className="text-[11px] text-blue-500/80 mt-0.5">
              Flying home today
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <Mountain className="size-4" />
              Pass Crossings
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-300 tabular">
              {data.summary.highPassCrossingsToday}
            </div>
            <p className="text-[11px] text-amber-500/80 mt-0.5">
              Khardung La / Chang La
            </p>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {error ? (
        <Panel className="border-loss-500/30 bg-loss-500/5 p-8 text-center text-loss-400 text-sm">
          {error}
        </Panel>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-ink-900/50 animate-pulse border border-ink-800" />
          <div className="h-40 rounded-xl bg-ink-900/50 animate-pulse border border-ink-800" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Section 1: In-Transit Movements (High Pass Crossings) */}
          {data.inTransit.length > 0 && (
            <Panel className="border-amber-500/30 bg-amber-500/[0.02]">
              <PanelHeader className="border-b border-amber-500/20">
                <PanelTitle className="flex items-center gap-2 text-amber-300">
                  <Mountain className="size-4 text-amber-400" />
                  Active Mountain Sector Transfers Today ({data.inTransit.length})
                </PanelTitle>
              </PanelHeader>
              <div className="divide-y divide-ink-800/60">
                {data.inTransit.map((t, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bookings/${t.bookingId}`}
                          className="font-medium text-ink-100 hover:text-signal-300 transition-colors"
                        >
                          {t.guestName}
                        </Link>
                        <Chip>{t.bookingNumber}</Chip>
                        <span className="text-xs text-ink-400">· {t.pax} Pax</span>
                      </div>
                      <p className="text-xs text-amber-400/90 font-medium mt-1">
                        🏔️ {t.sector}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                      >
                        <MessageCircle className="size-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${t.phone}`}
                        className="inline-flex items-center gap-1 rounded bg-ink-800 px-2 py-1 text-xs font-medium text-ink-300 hover:bg-ink-700"
                      >
                        <Phone className="size-3.5" />
                        Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Section 2: Valley Stay Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Leh Hub */}
            <Panel className="border-ink-800/80">
              <PanelHeader className="border-b border-ink-800 bg-ink-900/40">
                <PanelTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-200">
                    <MapPin className="size-3.5 text-signal-400" />
                    Leh Hub ({data.valleyDistribution.leh.length})
                  </span>
                  <span className="text-xs text-ink-400 font-normal">
                    {data.valleyDistribution.leh.reduce((s, g) => s + g.pax, 0)} Pax
                  </span>
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="p-0 divide-y divide-ink-800/60 max-h-[420px] overflow-y-auto">
                {data.valleyDistribution.leh.length === 0 ? (
                  <p className="p-4 text-xs text-ink-500 text-center">No guests in Leh tonight</p>
                ) : (
                  data.valleyDistribution.leh.map((g) => (
                    <div key={g.bookingId} className="p-3 hover:bg-ink-800/30 transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <Link
                          href={`/bookings/${g.bookingId}`}
                          className="text-xs font-semibold text-ink-200 hover:text-signal-300 truncate"
                        >
                          {g.guestName}
                        </Link>
                        <span className="text-[10px] text-ink-400 tabular">Day {g.dayOfTrip}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                        <Building className="size-3 text-ink-500" />
                        <span className="truncate">{g.currentHotel}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ink-800/40 text-[10px] text-ink-500">
                        <span>{g.pax} Pax ({g.phone})</span>
                        <a
                          href={`https://wa.me/${g.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </PanelBody>
            </Panel>

            {/* Nubra Valley */}
            <Panel className="border-ink-800/80">
              <PanelHeader className="border-b border-ink-800 bg-ink-900/40">
                <PanelTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-200">
                    <MapPin className="size-3.5 text-amber-400" />
                    Nubra Valley ({data.valleyDistribution.nubra.length})
                  </span>
                  <span className="text-xs text-ink-400 font-normal">
                    {data.valleyDistribution.nubra.reduce((s, g) => s + g.pax, 0)} Pax
                  </span>
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="p-0 divide-y divide-ink-800/60 max-h-[420px] overflow-y-auto">
                {data.valleyDistribution.nubra.length === 0 ? (
                  <p className="p-4 text-xs text-ink-500 text-center">No guests in Nubra tonight</p>
                ) : (
                  data.valleyDistribution.nubra.map((g) => (
                    <div key={g.bookingId} className="p-3 hover:bg-ink-800/30 transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <Link
                          href={`/bookings/${g.bookingId}`}
                          className="text-xs font-semibold text-ink-200 hover:text-amber-300 truncate"
                        >
                          {g.guestName}
                        </Link>
                        <span className="text-[10px] text-ink-400 tabular">Day {g.dayOfTrip}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                        <Building className="size-3 text-ink-500" />
                        <span className="truncate">{g.currentHotel}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ink-800/40 text-[10px] text-ink-500">
                        <span>{g.pax} Pax ({g.phone})</span>
                        <a
                          href={`https://wa.me/${g.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </PanelBody>
            </Panel>

            {/* Pangong Lake */}
            <Panel className="border-ink-800/80">
              <PanelHeader className="border-b border-ink-800 bg-ink-900/40">
                <PanelTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-200">
                    <MapPin className="size-3.5 text-blue-400" />
                    Pangong Lake ({data.valleyDistribution.pangong.length})
                  </span>
                  <span className="text-xs text-ink-400 font-normal">
                    {data.valleyDistribution.pangong.reduce((s, g) => s + g.pax, 0)} Pax
                  </span>
                </PanelTitle>
              </PanelHeader>
              <PanelBody className="p-0 divide-y divide-ink-800/60 max-h-[420px] overflow-y-auto">
                {data.valleyDistribution.pangong.length === 0 ? (
                  <p className="p-4 text-xs text-ink-500 text-center">No guests at Pangong tonight</p>
                ) : (
                  data.valleyDistribution.pangong.map((g) => (
                    <div key={g.bookingId} className="p-3 hover:bg-ink-800/30 transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <Link
                          href={`/bookings/${g.bookingId}`}
                          className="text-xs font-semibold text-ink-200 hover:text-blue-300 truncate"
                        >
                          {g.guestName}
                        </Link>
                        <span className="text-[10px] text-ink-400 tabular">Day {g.dayOfTrip}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                        <Building className="size-3 text-ink-500" />
                        <span className="truncate">{g.currentHotel}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ink-800/40 text-[10px] text-ink-500">
                        <span>{g.pax} Pax ({g.phone})</span>
                        <a
                          href={`https://wa.me/${g.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </PanelBody>
            </Panel>
          </div>

          {/* Section 3: Airport Arrivals and Departures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arrivals */}
            <Panel>
              <PanelHeader className="border-b border-ink-800">
                <PanelTitle className="flex items-center gap-2 text-emerald-400 text-sm">
                  <PlaneLanding className="size-4" />
                  Today's Arrivals at Leh Airport (IXL)
                </PanelTitle>
              </PanelHeader>
              <div className="divide-y divide-ink-800/60 max-h-[300px] overflow-y-auto">
                {data.arrivals.length === 0 ? (
                  <p className="p-4 text-xs text-ink-500 text-center">No arrivals scheduled for today</p>
                ) : (
                  data.arrivals.map((a) => (
                    <div key={a.bookingId} className="p-3 flex items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/bookings/${a.bookingId}`}
                          className="text-xs font-semibold text-ink-100 hover:text-signal-300"
                        >
                          {a.guestName}
                        </Link>
                        <div className="text-[11px] text-ink-400 mt-0.5">
                          {a.pax} Pax · Hotel: {a.currentHotel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-ink-200">{a.phone}</div>
                        <a
                          href={`https://wa.me/${a.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline"
                        >
                          Send Welcome
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            {/* Departures */}
            <Panel>
              <PanelHeader className="border-b border-ink-800">
                <PanelTitle className="flex items-center gap-2 text-blue-400 text-sm">
                  <PlaneTakeoff className="size-4" />
                  Today's Airport Drops / Departures
                </PanelTitle>
              </PanelHeader>
              <div className="divide-y divide-ink-800/60 max-h-[300px] overflow-y-auto">
                {data.departures.length === 0 ? (
                  <p className="p-4 text-xs text-ink-500 text-center">No departures scheduled for today</p>
                ) : (
                  data.departures.map((d) => (
                    <div key={d.bookingId} className="p-3 flex items-center justify-between gap-2">
                      <div>
                        <Link
                          href={`/bookings/${d.bookingId}`}
                          className="text-xs font-semibold text-ink-100 hover:text-signal-300"
                        >
                          {d.guestName}
                        </Link>
                        <div className="text-[11px] text-ink-400 mt-0.5">
                          {d.pax} Pax · Completed {d.totalNights}N Tour
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-ink-200">{d.phone}</div>
                        <a
                          href={`https://wa.me/${d.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline"
                        >
                          Send Feedback
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
