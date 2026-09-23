'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Building2,
  Settings,
  LogOut,
  TrendingUp,
  UserCog,
  Globe,
  Map,
  BarChart3,
  ShieldCheck,
  Wallet,
  AlarmClock,
  Menu,
  X,
  Search,
  Plug,
  Megaphone,
  Receipt,
} from 'lucide-react';
import { tokenStore, type SessionUser } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/command-palette';

/**
 * Per-role visibility for sidebar + route guard. Single source of truth.
 * Anything not listed defaults to owner-only for safety.
 *
 * Row-level scoping (e.g. sales exec only sees own leads) is enforced by the
 * backend — this map controls only whether the PAGE itself is reachable.
 */
const OWNER_ONLY: string[] = ['OWNER', 'SUPER_ADMIN'];
const ALL_STAFF = ['OWNER','SUPER_ADMIN','SALES_MANAGER','SALES_EXEC','ACCOUNTS','MARKETING','OPERATIONS'];

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
};

type NavGroup = { label: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_STAFF },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/leads',        label: 'Leads',        icon: Users,         roles: ALL_STAFF },
      { href: '/b2b-partners', label: 'B2B Partners', icon: Users,         roles: ALL_STAFF },
      { href: '/follow-ups',   label: 'Follow-ups',   icon: AlarmClock,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','SALES_EXEC','OPERATIONS'] },
      { href: '/itineraries',  label: 'Itineraries',  icon: Map,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','SALES_EXEC','ACCOUNTS','OPERATIONS'] },
      { href: '/bookings',     label: 'Bookings',     icon: CalendarCheck,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','SALES_EXEC','ACCOUNTS','OPERATIONS'] },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/marketing',        label: 'Marketing',     icon: Megaphone,
        roles: ['OWNER','SUPER_ADMIN','MARKETING'] },
      { href: '/marketing/social', label: 'Social Studio', icon: Globe,
        roles: ['OWNER','SUPER_ADMIN','MARKETING','SALES_MANAGER'] },
      { href: '/attribution',      label: 'Attribution',   icon: TrendingUp,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','MARKETING'] },
      { href: '/seo',              label: 'SEO',           icon: Globe,
        roles: ['OWNER','SUPER_ADMIN','MARKETING'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finance',  label: 'Finance',  icon: Wallet,
        roles: ['OWNER','SUPER_ADMIN','ACCOUNTS'] },
      { href: '/invoices', label: 'Invoices', icon: Receipt,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','ACCOUNTS'] },
      { href: '/reports',  label: 'Reports',  icon: BarChart3,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','ACCOUNTS','MARKETING','OPERATIONS'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/vendors',    label: 'Suppliers',  icon: Building2,
        roles: ['OWNER','SUPER_ADMIN','SALES_MANAGER','SALES_EXEC','ACCOUNTS','OPERATIONS'] },
      { href: '/people',     label: 'People',     icon: UserCog,
        roles: ['OWNER','SUPER_ADMIN','ACCOUNTS'] },
      { href: '/interviews', label: 'Interviews', icon: Users,
        roles: ['OWNER','SUPER_ADMIN','ACCOUNTS'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/users',        label: 'Access',       icon: ShieldCheck, roles: OWNER_ONLY },
      { href: '/integrations', label: 'Integrations', icon: Plug,        roles: OWNER_ONLY },
      { href: '/settings',     label: 'Settings',     icon: Settings,    roles: OWNER_ONLY },
    ],
  },
];

/** Flat list still needed by the route guard below. */
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const u = tokenStore.user();
    if (!tokenStore.get() || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  // Route guard — if the user typed a URL their role can't access, bounce
  // them to /dashboard (everyone can see the dashboard). The sidebar hides
  // these entries too, but URL bar + old bookmarks would otherwise sneak in.
  useEffect(() => {
    if (!user) return;
    const entry = NAV.find((n) => pathname.startsWith(n.href));
    if (entry && !entry.roles.includes(user.role) && pathname !== '/dashboard') {
      router.replace('/dashboard');
    }
  }, [user, pathname, router]);

  // Close the drawer whenever the route changes — otherwise it'd stay open
  // after tapping a nav link on mobile.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't rubber-band.
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [drawerOpen]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="text-[13px] text-ink-500">Loading…</span>
      </div>
    );
  }

  function signOut() {
    tokenStore.clear();
    router.replace('/login');
  }

  const sidebar = (
    <>
      <div className="border-b border-ink-800/60 px-5 py-4">
        <div className="flex items-baseline gap-1.5 font-semibold tracking-tight">
          <span className="text-[17px] text-brand-500 display">Ladakh</span>
          <span className="text-[13px] uppercase tracking-[0.14em] text-signal-600">
            Vacation
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter((n) => !user || n.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={group.label ?? `_g${gi}`} className={cn(gi > 0 && 'mt-4')}>
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === '/marketing'
                      ? pathname === '/marketing'
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]',
                        'transition-[background-color,color,transform] duration-150 ease-out',
                        active
                          ? 'bg-signal-600/8 text-signal-600 font-medium'
                          : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200 hover:translate-x-0.5',
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand-500"
                        />
                      )}
                      <Icon className="size-4" strokeWidth={1.75} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-ink-800/60 p-3">
        <p className="mb-2 hidden px-2 text-[10.5px] text-ink-500 md:block">
          Press{' '}
          <kbd className="tabular rounded border border-ink-700 bg-ink-950 px-1 py-0.5">⌘K</kbd>{' '}
          to search anything
        </p>
        <div className="flex items-center gap-2.5 px-2 pb-2">
          <div
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-signal-500 text-[11px] font-semibold text-ink-950"
          >
            {(user?.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-ink-200">{user?.name}</p>
            <p className="truncate text-[10.5px] uppercase tracking-[0.1em] text-ink-500">
              {user?.role.replace(/_/g, ' ').toLowerCase()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="crm-theme min-h-screen bg-ink-950 text-ink-300 md:grid md:grid-cols-[232px_1fr]">
      {/* Mobile top bar — only visible below md */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-800 bg-ink-900/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="grid size-9 place-items-center rounded-md text-ink-300 hover:bg-ink-850 hover:text-ink-100"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
        <div className="flex items-baseline gap-1 font-semibold tracking-tight">
          <span className="text-[15px] text-brand-500 display">Ladakh</span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-signal-600">
            Vacation
          </span>
        </div>
        <button
          aria-label="Search"
          onClick={() => {
            // Fake a Ctrl-K keypress so the palette opens with its existing
            // listener — one source of truth for the toggle.
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
            );
          }}
          className="grid size-9 place-items-center rounded-md text-ink-300 hover:bg-ink-850 hover:text-ink-100"
        >
          <Search className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      {/* Desktop sidebar — always mounted, hidden below md */}
      <aside className="hidden flex-col border-r border-ink-800 bg-ink-900 shadow-sm md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer — off-canvas, shows above the app */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85%] flex-col border-r border-ink-800/60 bg-ink-900 shadow-2xl">
            <div className="absolute right-2 top-2">
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-md text-ink-400 hover:bg-ink-850 hover:text-ink-100"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-w-0 overflow-x-hidden bg-ink-950">{children}</main>
      <CommandPalette />
    </div>
  );
}
