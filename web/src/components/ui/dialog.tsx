'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-[2px]',
          'data-[state=open]:animate-[fadeIn_160ms_ease-out]',
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          // Full-screen on mobile so form fields don't get cramped; centered
          // sheet on tablet+ desktop. We use w-full h-full on mobile instead
          // of right-0 bottom-0 to cleanly avoid any need for 'auto' resets
          // that can strand the dialog off-screen in Tailwind v4.
          'fixed z-50 overflow-hidden bg-ink-900',
          'top-0 left-0 w-full h-full',
          'sm:top-[50%] sm:left-[50%] sm:h-auto sm:w-[min(92vw,720px)]',
          'sm:-translate-x-[50%] sm:-translate-y-[50%]',
          'sm:max-h-[85vh] sm:rounded-[10px] sm:border sm:border-ink-700',
          'shadow-[0_24px_64px_-16px_rgba(0,0,0,0.9)]',
          'data-[state=open]:animate-[popIn_180ms_cubic-bezier(0.16,1,0.3,1)]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between border-b border-ink-800 px-5 py-3.5">
          <div>
            <DialogPrimitive.Title className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-200">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-[12px] text-ink-500">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200">
            <X className="size-4" strokeWidth={1.75} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
