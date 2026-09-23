'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Users, CalendarCheck, Building2, Map } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

/**
 * ⌘K / Ctrl-K global search. Queries leads, bookings, itineraries and
 * suppliers in parallel and shows a jump-list. Chosen navigation closes the
 * palette; arrow keys move focus; Enter opens the highlighted result.
 *
 * Kept minimal — no fuzzy scoring on the client, no fancy grouping. Each
 * category's endpoint returns up to 8, we render them in one flat list
 * grouped by section header.
 */

type Section = 'Leads' | 'Bookings' | 'Itineraries' | 'Suppliers';

interface Hit {
  section: Section;
  href: string;
  title: string;
  subtitle?: string;
}

const SECTION_ICON: Record<Section, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Leads: Users,
  Bookings: CalendarCheck,
  Itineraries: Map,
  Suppliers: Building2,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 20);
      setActive(0);
    } else {
      setQ('');
      setHits([]);
    }
  }, [open]);

  // Debounced search
  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = `?q=${encodeURIComponent(term.trim())}`;
    try {
      const [leads, bookings, itineraries, vendors] = await Promise.all([
        api.get<Array<{ id: string; name: string; phone: string; status: string }>>(
          `/leads/search${params}`,
        ).catch(() => []),
        api.get<Array<{ id: string; bookingNumber: string; packageName: string | null; status: string; lead: { name: string } }>>(
          `/bookings/search${params}`,
        ).catch(() => []),
        api.get<Array<{ id: string; code: string; title: string; lead: { name: string } | null }>>(
          `/itineraries/search${params}`,
        ).catch(() => []),
        api.get<Array<{ id: string; name: string; type: string; city: string | null }>>(
          `/vendors/search${params}`,
        ).catch(() => []),
      ]);
      const merged: Hit[] = [
        ...leads.map((l) => ({
          section: 'Leads' as const,
          href: `/leads/${l.id}`,
          title: l.name,
          subtitle: `${l.phone} · ${l.status.replace(/_/g, ' ').toLowerCase()}`,
        })),
        ...bookings.map((b) => ({
          section: 'Bookings' as const,
          href: `/bookings/${b.id}`,
          title: b.packageName ?? 'Untitled package',
          subtitle: `${b.bookingNumber} · ${b.lead.name}`,
        })),
        ...itineraries.map((i) => ({
          section: 'Itineraries' as const,
          href: `/itineraries/${i.id}`,
          title: i.title,
          subtitle: `${i.code}${i.lead ? ` · ${i.lead.name}` : ''}`,
        })),
        ...vendors.map((v) => ({
          section: 'Suppliers' as const,
          href: `/vendors/${v.id}`,
          title: v.name,
          subtitle: `${v.type.toLowerCase()}${v.city ? ` · ${v.city}` : ''}`,
        })),
      ];
      setHits(merged);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 180);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  function pick(hit: Hit) {
    router.push(hit.href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(hits[active]);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-ink-950/70 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      onKeyDown={onKeyDown}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-ink-800 bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
          <Search className="size-4 text-ink-500" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, bookings, itineraries, suppliers…"
            className="flex-1 bg-transparent text-[13.5px] text-ink-100 outline-none placeholder:text-ink-500"
          />
          {loading && <Loader2 className="size-4 animate-spin text-ink-500" />}
          <kbd className="rounded border border-ink-700 bg-ink-950 px-1.5 py-0.5 text-[10.5px] text-ink-500">
            Esc
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {q.length < 2 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-ink-500">
              Type at least 2 characters.
            </p>
          ) : hits.length === 0 && !loading ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-ink-500">
              No matches.
            </p>
          ) : (
            <ul>
              {hits.map((h, i) => {
                const Icon = SECTION_ICON[h.section];
                const on = i === active;
                return (
                  <li key={`${h.section}-${h.href}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(h)}
                      className={
                        on
                          ? 'flex w-full items-center gap-3 border-l-2 border-signal-500 bg-signal-500/8 px-4 py-2 text-left'
                          : 'flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2 text-left hover:bg-ink-850'
                      }
                    >
                      <Icon className="size-4 text-ink-400" strokeWidth={1.75} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink-100">
                          {h.title}
                        </p>
                        {h.subtitle && (
                          <p className="tabular truncate text-[11px] text-ink-500">
                            {h.subtitle}
                          </p>
                        )}
                      </div>
                      <span className="rounded border border-ink-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-500">
                        {h.section}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink-800 px-4 py-2 text-[10.5px] text-ink-500">
          <span>
            <kbd className="rounded border border-ink-700 bg-ink-950 px-1 py-0.5">↑</kbd>
            <kbd className="ml-1 rounded border border-ink-700 bg-ink-950 px-1 py-0.5">↓</kbd>
            <span className="ml-1">navigate</span>
            <kbd className="ml-3 rounded border border-ink-700 bg-ink-950 px-1 py-0.5">Enter</kbd>
            <span className="ml-1">open</span>
          </span>
          <span>
            <kbd className="rounded border border-ink-700 bg-ink-950 px-1 py-0.5">⌘K</kbd>
            <span className="ml-1">toggle</span>
          </span>
        </div>
      </div>
    </div>
  );
}
