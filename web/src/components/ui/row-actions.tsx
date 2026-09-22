'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact destructive action for the trailing cell of a list row.
 * Wraps the browser confirm(): consistent with how booking payments/costs
 * already handle deletion elsewhere in the app.
 *
 * Not a full menu — the row itself is the "open" action (name is a link)
 * and edit lives on the detail page. The only thing missing from lists
 * was a way to remove/deactivate, which is what this fills.
 */
export function RowActions({
  onDelete,
  confirmMessage,
  label = 'Remove',
  className,
  disabled,
}: {
  onDelete: () => void | Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(confirmMessage)) return;
        try {
          setBusy(true);
          await onDelete();
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md text-ink-500',
        'transition-colors hover:bg-loss-500/12 hover:text-loss-500',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
    >
      <Trash2 className="size-3.5" strokeWidth={1.75} />
    </button>
  );
}
