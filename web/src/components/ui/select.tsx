'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Native select, styled. Deliberately not a Radix listbox: operators filter
 * this screen dozens of times a day and the native control is faster with a
 * keyboard, works on mobile, and never traps focus.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded-md border border-ink-700 bg-ink-950/60',
        'pl-3 pr-8 text-sm text-ink-100',
        'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
        'hover:border-ink-600',
        'focus:border-signal-500 focus:bg-ink-950 focus:outline-none',
        'focus:shadow-[0_0_0_3px_rgba(53,146,150,0.15)]',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      strokeWidth={1.75}
      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
    />
  </div>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-md border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100',
      'placeholder:text-ink-500 resize-y min-h-[76px]',
      'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
      'hover:border-ink-600',
      'focus:border-signal-500 focus:bg-ink-950 focus:outline-none',
      'focus:shadow-[0_0_0_3px_rgba(53,146,150,0.15)]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
