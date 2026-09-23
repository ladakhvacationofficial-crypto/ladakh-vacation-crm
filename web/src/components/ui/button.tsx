'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
    'disabled:pointer-events-none disabled:opacity-45 active:translate-y-px ' +
    '[&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary CTA — the Ladakh royal blue from the logo, with a warm
        // gold underglow that lifts slightly on hover.
        primary:
          'bg-signal-600 text-ink-950 hover:bg-signal-500 ' +
          'shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_6px_-2px_rgba(11,74,90,0.45)] ' +
          'hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_6px_18px_-6px_rgba(11,74,90,0.55),0_2px_10px_-4px_rgba(234,177,48,0.35)]',
        secondary:
          'bg-ink-900 text-ink-200 border border-ink-700 hover:bg-ink-850 hover:border-ink-600',
        ghost: 'text-ink-400 hover:text-ink-100 hover:bg-ink-850',
        danger: 'bg-loss-500 text-ink-950 hover:bg-loss-400',
        link: 'text-signal-500 underline-offset-4 hover:underline hover:text-signal-400',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
