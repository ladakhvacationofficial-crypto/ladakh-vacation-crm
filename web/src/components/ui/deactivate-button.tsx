'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Destructive header action for detail pages. Deliberately styled subtle —
 * a filled danger button next to primary actions would push people toward
 * the wrong click. Ghost tone until hover.
 */
export function DeactivateButton({
  onConfirm,
  confirmMessage,
  label,
  disabled,
  className,
}: {
  onConfirm: () => void | Promise<void>;
  confirmMessage: string;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      title={label}
      onClick={async () => {
        if (!window.confirm(confirmMessage)) return;
        try {
          setBusy(true);
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md border border-ink-700 bg-transparent px-3 text-xs font-medium text-ink-400',
        'transition-colors hover:border-loss-500/60 hover:bg-loss-500/8 hover:text-loss-500',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
    >
      <Trash2 className="size-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}
