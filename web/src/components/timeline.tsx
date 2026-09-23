'use client';

import {
  Phone,
  MessageCircle,
  Mail,
  Users,
  StickyNote,
  GitCommitHorizontal,
  RefreshCw,
  UserCheck,
  Cpu,
} from 'lucide-react';
import type { ActivityRow } from '@/lib/api';
import { relativeDate } from '@/lib/format';
import { humanise } from '@/lib/constants';

const ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  MEETING: Users,
  NOTE: StickyNote,
  STATUS_CHANGE: GitCommitHorizontal,
  RE_ENQUIRY: RefreshCw,
  ASSIGNMENT: UserCheck,
  SYSTEM: Cpu,
};

/**
 * A vertical rail. System entries are dimmed so a human's note about what the
 * client actually said outranks "Status NEW -> CONTACTED" visually.
 */
export function Timeline({ items }: { items: ActivityRow[] }) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-ink-500">
        Nothing logged yet. Record the first call or note above.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      <span
        aria-hidden
        className="absolute left-[11px] top-2 bottom-2 w-px bg-ink-800"
      />
      {items.map((item, i) => {
        const Icon = ICONS[item.type] ?? StickyNote;
        const machine = ['SYSTEM', 'STATUS_CHANGE', 'ASSIGNMENT'].includes(
          item.type,
        );
        return (
          <li
            key={item.id}
            className="rise relative flex gap-3 py-3"
            style={{ animationDelay: `${Math.min(i, 10) * 22}ms` }}
          >
            <span
              className={
                'relative z-10 mt-0.5 grid size-[23px] shrink-0 place-items-center rounded-full border ' +
                (machine
                  ? 'border-ink-800 bg-ink-900 text-ink-600'
                  : 'border-ink-700 bg-ink-850 text-ink-300')
              }
            >
              <Icon className="size-3" strokeWidth={1.75} />
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={
                  'text-[13px] leading-relaxed break-words [overflow-wrap:anywhere] ' +
                  (machine ? 'text-ink-500' : 'text-ink-100')
                }
              >
                {item.content}
              </p>
              <p className="mt-1 text-[11px] text-ink-600">
                {humanise(item.type)}
                {item.user?.name ? ` · ${item.user.name}` : ''} ·{' '}
                {relativeDate(item.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
