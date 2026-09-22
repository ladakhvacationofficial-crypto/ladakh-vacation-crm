'use client';

import { cn } from '@/lib/utils';
import { marginHealth, money, percent } from '@/lib/format';

/**
 * THE SIGNATURE ELEMENT.
 *
 * A single horizontal bar showing what a file is actually made of: the
 * portion that goes straight back out to suppliers, and the portion you keep.
 * The kept portion is the only part that carries colour, and that colour is
 * the margin verdict — healthy, thin, or losing.
 *
 * It replaces the usual "big number + gradient" card, because the proportion
 * IS the insight. ₹75,700 revenue tells you nothing on its own.
 */
export function MarginRibbon({
  sell,
  cost,
  minMargin = 15,
  showLabels = true,
  className,
}: {
  sell: number;
  cost: number;
  minMargin?: number;
  showLabels?: boolean;
  className?: string;
}) {
  const profit = sell - cost;
  const marginPct = sell > 0 ? (profit / sell) * 100 : 0;
  const health = marginHealth(marginPct, minMargin);

  // A loss-making file still renders a full bar; the cost simply overflows it.
  const costShare = sell > 0 ? Math.min(100, (cost / sell) * 100) : 100;
  const keptShare = Math.max(0, 100 - costShare);

  const keptColor =
    health === 'healthy'
      ? 'bg-healthy-500'
      : health === 'warn'
        ? 'bg-warn-500'
        : 'bg-loss-500';

  const textColor =
    health === 'healthy'
      ? 'text-healthy-400'
      : health === 'warn'
        ? 'text-warn-400'
        : 'text-loss-400';

  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.09em] text-ink-400">
            {profit >= 0 ? 'You keep' : 'Shortfall'}
          </span>
          <span className={cn('tabular text-sm font-medium', textColor)}>
            {money(profit)}
            <span className="ml-2 text-ink-500">{percent(marginPct)}</span>
          </span>
        </div>
      )}

      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
        role="img"
        aria-label={`Margin ${percent(marginPct)}. Cost ${money(cost)} of ${money(sell)}.`}
      >
        {/* supplier share — always neutral, it was never yours */}
        <div
          className="sweep absolute inset-y-0 left-0 bg-ink-600"
          style={{ width: `${costShare}%` }}
        />
        {/* your share — the only coloured pixels */}
        <div
          className={cn('sweep absolute inset-y-0', keptColor)}
          style={{ left: `${costShare}%`, width: `${keptShare}%` }}
        />
      </div>

      {showLabels && (
        <div className="mt-1.5 flex justify-between text-[10px] tabular text-ink-500">
          <span>cost {money(cost)}</span>
          <span>sell {money(sell)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Lead score, 0-100. Deliberately monochrome: a score is a prediction, not
 * money. Only the fill length carries meaning.
 */
export function ScoreMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-ink-300 transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="tabular text-[11px] text-ink-400">{clamped}</span>
    </div>
  );
}
