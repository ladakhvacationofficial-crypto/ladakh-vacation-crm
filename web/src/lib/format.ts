/**
 * Indian numbering throughout — lakh/crore grouping, not thousands.
 * ₹12,45,000 is readable to your team; ₹1,245,000 is not.
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 1,
});

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return inr.format(value);
}

/** 1250000 -> "12.5L" ; 24500000 -> "2.5Cr" — for dense cards only. */
export function moneyShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${inrCompact.format(value / 10000000)}Cr`;
  if (abs >= 100000) return `${inrCompact.format(value / 100000)}L`;
  if (abs >= 1000) return `${inrCompact.format(value / 1000)}K`;
  return String(value);
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(digits)}%`;
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function relativeDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(d);
}

/**
 * Margin health bands. These drive every colour decision in the product,
 * so they live in exactly one place.
 */
export type Health = 'healthy' | 'warn' | 'loss';

export function marginHealth(marginPercent: number, minMargin = 15): Health {
  if (marginPercent < 0) return 'loss';
  if (marginPercent < minMargin) return 'warn';
  return 'healthy';
}

export const healthText: Record<Health, string> = {
  healthy: 'text-healthy-400',
  warn: 'text-warn-400',
  loss: 'text-loss-400',
};

export const healthBg: Record<Health, string> = {
  healthy: 'bg-healthy-500',
  warn: 'bg-warn-500',
  loss: 'bg-loss-500',
};
