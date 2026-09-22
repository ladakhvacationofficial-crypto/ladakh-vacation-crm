'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-9 w-full rounded-md border border-ink-700 bg-ink-950/60 px-3 text-sm text-ink-100',
      'placeholder:text-ink-500',
      'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
      'hover:border-ink-600',
      'focus:border-signal-500 focus:bg-ink-950 focus:outline-none',
      'focus:shadow-[0_0_0_3px_rgba(53,146,150,0.15)]',
      'disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-[11px] font-medium uppercase tracking-[0.09em] text-ink-400',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';
