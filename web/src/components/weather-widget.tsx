'use client';

import { useEffect, useState } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  type LucideIcon,
} from 'lucide-react';

/**
 * 7-day Leh forecast for the dashboard: every trip starts and ends there.
 * Other stops live on itinerary pages, where the chosen destination drives
 * the fetch.
 *
 * Uses Open-Meteo (no key). If the fetch fails we show dashes rather than
 * throwing — a broken widget must never crash the dashboard around it.
 */

const CITY = { name: 'Leh', region: 'Ladakh', lat: 34.1526, lon: 77.5771 };

interface DayReading {
  date: Date;
  maxC: number | null;
  minC: number | null;
  code: number | null;
}

/** WMO weather code → icon + short label. */
function iconFor(code: number | null): {
  Icon: LucideIcon;
  label: string;
  tone: string;
} {
  if (code === null) return { Icon: Cloud, label: '—', tone: 'text-ink-500' };
  if (code === 0)   return { Icon: Sun, label: 'Clear', tone: 'text-brand-500' };
  if (code <= 2)    return { Icon: CloudSun, label: 'Partly sunny', tone: 'text-brand-400' };
  if (code === 3)   return { Icon: Cloud, label: 'Overcast', tone: 'text-ink-500' };
  if (code <= 48)   return { Icon: CloudFog, label: 'Fog', tone: 'text-ink-500' };
  if (code <= 57)   return { Icon: CloudDrizzle, label: 'Drizzle', tone: 'text-signal-400' };
  if (code <= 67)   return { Icon: CloudRain, label: 'Rain', tone: 'text-signal-500' };
  if (code <= 77)   return { Icon: CloudSnow, label: 'Snow', tone: 'text-signal-300' };
  if (code <= 82)   return { Icon: CloudRain, label: 'Showers', tone: 'text-signal-500' };
  if (code <= 86)   return { Icon: CloudSnow, label: 'Snow', tone: 'text-signal-300' };
  if (code >= 95)   return { Icon: CloudLightning, label: 'Storm', tone: 'text-warn-500' };
  return { Icon: Cloud, label: '—', tone: 'text-ink-500' };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeatherStrip() {
  const [days, setDays] = useState<DayReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${CITY.lat}&longitude=${CITY.lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
          `&forecast_days=7&timezone=Asia%2FKolkata`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        const dates: string[] = j.daily?.time ?? [];
        const maxes: number[] = j.daily?.temperature_2m_max ?? [];
        const mins: number[] = j.daily?.temperature_2m_min ?? [];
        const codes: number[] = j.daily?.weather_code ?? [];
        const rows: DayReading[] = dates.map((iso, i) => ({
          date: new Date(iso),
          maxC: Math.round(maxes[i] ?? 0),
          minC: Math.round(mins[i] ?? 0),
          code: codes[i] ?? null,
        }));
        if (!cancelled) setDays(rows);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = days[0];
  const rest = days.slice(1);
  const { Icon: TodayIcon, label: todayLabel, tone: todayTone } = iconFor(today?.code ?? null);

  return (
    <div className="rise flex min-w-[320px] items-stretch gap-4 rounded-xl border border-ink-800/60 bg-ink-900 px-4 py-3 shadow-[0_1px_2px_rgba(28,30,40,0.04)]">
      {/* Today — the anchor */}
      <div className="flex min-w-[130px] items-center gap-3 border-r border-ink-800/70 pr-4">
        <TodayIcon
          aria-hidden
          strokeWidth={1.6}
          className={`size-8 float ${todayTone}`}
        />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.09em] text-ink-500">
            {CITY.name}
          </p>
          <p className="tabular text-[20px] font-semibold leading-none text-ink-100">
            {loading ? (
              <span className="inline-block h-4 w-10 rounded shimmer align-middle" />
            ) : today?.maxC === null || today === undefined ? (
              <span className="text-ink-500">—</span>
            ) : (
              <>
                {today.maxC}
                <span className="text-ink-500 font-normal text-[13px]">°</span>
                <span className="ml-1 text-[13px] font-normal text-ink-500">
                  / {today.minC}°
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-500">
            {failed ? 'offline' : todayLabel}
          </p>
        </div>
      </div>

      {/* Next 6 days */}
      <div className="flex flex-1 items-stretch gap-1.5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex min-w-[42px] flex-col items-center gap-1 px-1 py-0.5">
                <span className="h-2 w-6 rounded shimmer" />
                <span className="h-4 w-4 rounded-full shimmer" />
                <span className="h-2 w-8 rounded shimmer" />
              </div>
            ))
          : rest.map((d, i) => {
              const { Icon, tone } = iconFor(d.code);
              const label = DAY_LABELS[d.date.getDay()];
              return (
                <div
                  key={d.date.toISOString()}
                  className="flex min-w-[42px] flex-col items-center gap-0.5 px-1 py-0.5"
                  style={{ animationDelay: `${i * 60}ms` }}
                  title={`${d.date.toDateString()} · high ${d.maxC}° low ${d.minC}°`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                    {label}
                  </span>
                  <Icon aria-hidden strokeWidth={1.6} className={`size-4 ${tone}`} />
                  <span className="tabular text-[11px] text-ink-300">
                    {d.maxC}
                    <span className="text-ink-500">°</span>
                  </span>
                  <span className="tabular text-[10px] text-ink-500">
                    {d.minC}°
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}
