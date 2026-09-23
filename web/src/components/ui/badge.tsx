import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Pipeline stages are NOT colour-coded. Colour in this product means money,
 * and a lead being at "Negotiation" is not a financial fact. Stages are
 * distinguished by weight and a leading rule instead.
 */
export function Stage({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const label = value.replace(/_/g, ' ').toLowerCase();
  const strong = ['CONFIRMED', 'NEGOTIATION', 'QUOTATION_SENT'].includes(value);
  const dim = ['LOST', 'CANCELLED'].includes(value);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] tracking-wide capitalize',
        strong ? 'text-ink-100' : dim ? 'text-ink-500' : 'text-ink-300',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-3 w-px',
          strong ? 'bg-ink-200' : dim ? 'bg-ink-600' : 'bg-ink-500',
        )}
      />
      {label}
    </span>
  );
}

export function Chip({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5',
        'text-[10px] uppercase tracking-[0.08em] text-ink-400',
        className,
      )}
      {...props}
    />
  );
}
