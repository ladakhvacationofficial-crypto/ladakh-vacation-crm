import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The one container in the product. Hover lift is 1px — enough to register as
 * interactive, small enough not to make a dense table feel like it's breathing.
 */
export function Panel({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-ink-800 bg-ink-900',
        'shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.04)]',
        interactive && 'lift hover:shadow-[0_6px_16px_-4px_rgba(15,23,42,0.08)]',
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-ink-800 px-5 py-3.5',
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-[11.5px] font-semibold tracking-[0.11em] uppercase text-ink-500',
        className,
      )}
      {...props}
    />
  );
}

export function PanelBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
