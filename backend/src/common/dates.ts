/**
 * class-validator's @IsOptional() skips validation for `null` as well as
 * `undefined`, so `{"travelDate": null}` reaches the service as a real null.
 * `new Date(null)` is 1970-01-01, not an error — which means "clear this date"
 * silently writes an epoch date instead.
 *
 * Use this for every nullable date column that a PATCH can touch.
 */
export function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type LadakhSeason = 'PRIME' | 'SHOULDER' | 'WINTER';

/**
 * Classifies a date into Ladakh travel operational seasons:
 * - PRIME: May 15 to Sep 30 (All passes open, high season)
 * - SHOULDER: Apr 15 to May 14 & Oct 1 to Oct 31 (Passes freezing, camps closing)
 * - WINTER: Nov 1 to Apr 14 (Fly to Leh only, sub-zero, overland closed)
 */
export function determineSeason(date: Date): LadakhSeason {
  const m = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  if ((m === 5 && day >= 15) || (m >= 6 && m <= 8) || (m === 9 && day <= 30)) {
    return 'PRIME';
  }
  if ((m === 4 && day >= 15) || (m === 5 && day < 15) || m === 10) {
    return 'SHOULDER';
  }
  return 'WINTER';
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Intelligent travel date parser.
 * Handles exact ISO strings, month names ("September"), and relative phrases ("Next Month").
 * Resolves to the next upcoming occurrence so the lead carries a valid Date and season.
 */
export function parseTravelDate(value: string | Date | null | undefined): {
  date: Date | null;
  season?: LadakhSeason;
  isExtracted: boolean;
} {
  if (value === null || value === undefined || value === '') {
    return { date: null, isExtracted: false };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { date: null, isExtracted: false };
    return { date: value, season: determineSeason(value), isExtracted: false };
  }

  const trimmed = String(value).trim();
  const lower = trimmed.toLowerCase();

  // 1. Try standard ISO or delimited date string first (e.g. "2026-09-15" or "15/09/2026")
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime()) && (/[-/]\d{1,2}|^\d{4}-\d{2}-\d{2}/.test(trimmed))) {
    return { date: direct, season: determineSeason(direct), isExtracted: false };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // 2. Relative keywords
  if (lower.includes('next month')) {
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 15);
    return { date: nextMonthDate, season: determineSeason(nextMonthDate), isExtracted: true };
  }
  if (lower.includes('this month')) {
    const thisMonthDate = new Date(currentYear, currentMonth, 15);
    return { date: thisMonthDate, season: determineSeason(thisMonthDate), isExtracted: true };
  }

  // 3. Scan for month name
  for (const [key, monthIdx] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      const dayMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      let day = dayMatch ? parseInt(dayMatch[1], 10) : 15;
      if (day < 1 || day > 31) day = 15;

      let year = currentYear;
      if (monthIdx < currentMonth || (monthIdx === currentMonth && day < now.getDate())) {
        year = currentYear + 1;
      }

      const yearMatch = lower.match(/\b(202[5-9]|203[0-9])\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }

      const extracted = new Date(year, monthIdx, day);
      return { date: extracted, season: determineSeason(extracted), isExtracted: true };
    }
  }

  return { date: null, isExtracted: false };
}
