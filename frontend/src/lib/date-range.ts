/**
 * Convert a calendar-date range into absolute ISO timestamps anchored at
 * IST (+05:30) day boundaries, so backend filters return the days the
 * user actually meant.
 *
 * Without this, sending "2026-08-30" bare parses as UTC midnight, and any
 * lead created between 00:00 and 05:29 IST falls into the previous day.
 *
 * Ladakh Vacation is a Leh-based tour operator serving Indian customers — hardcoded IST
 * is intentional. If we ever open a non-IST office, take the offset from
 * the user's browser via Intl.DateTimeFormat().resolvedOptions().timeZone.
 */
const IST = '+05:30';

type CalendarRange = { from: string | null | undefined; to: string | null | undefined };

export function toApiRange(range: CalendarRange): { from?: string; to?: string } {
  const out: { from?: string; to?: string } = {};
  if (range.from) out.from = `${range.from}T00:00:00${IST}`;
  if (range.to) out.to = `${range.to}T23:59:59.999${IST}`;
  return out;
}

/**
 * Local-calendar YYYY-MM-DD. Never use `d.toISOString()` for this — it
 * converts to UTC first, which is wrong past 18:30 IST.
 */
export function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
