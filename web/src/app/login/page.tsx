'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mountain, Compass, Sparkles } from 'lucide-react';
import { api, tokenStore, ApiError, type SessionUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input, Label } from '@/components/ui/input';

/**
 * Login is the only page a not-yet-authenticated visitor sees. It carries
 * the brand — warm parchment on the right, a deep Ladakh-navy thesis panel
 * on the left, with the mountain silhouette echoing the logo.
 *
 * The graphic is drawn inline (SVG) rather than raster imported. Keeps the
 * bundle tiny and re-tints instantly with any brand tweak.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ access_token: string; user: SessionUser }>(
        '/auth/login',
        { email, password },
      );
      tokenStore.set(res.access_token, res.user);
      router.replace('/dashboard');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 401
            ? 'That email and password do not match an account.'
            : e.message
          : 'Something went wrong.',
      );
      setBusy(false);
    }
  }

  return (
    <main className="crm-theme grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left: the thesis. Deep Ladakh navy with a sunrise glow behind the peaks. */}
      <section className="relative hidden overflow-hidden bg-signal-600 lg:block">
        {/* Slow-drifting warm sun — behind everything. */}
        <div
          aria-hidden
          className="aurora absolute -top-20 -right-24 h-[520px] w-[520px] rounded-full blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(244,200,90,0.55), transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="aurora absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full blur-[100px]"
          style={{
            background:
              'radial-gradient(circle, rgba(79,165,184,0.35), transparent 60%)',
            animationDelay: '6s',
          }}
        />

        {/* Faint grid, masked to a soft ellipse so it doesn't compete with text. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage:
              'radial-gradient(ellipse 70% 60% at 40% 45%, black 30%, transparent 100%)',
          }}
        />

        {/* Mountain silhouette — echoes the logo, quietly. */}
        <svg
          aria-hidden
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-56 w-full text-ink-950/30"
        >
          <path
            fill="currentColor"
            d="M0,200 L0,140 L80,90 L140,120 L200,60 L260,110 L320,50 L380,100 L440,70 L500,120 L600,80 L600,200 Z"
          />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 600 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-40 w-full text-ink-950/50"
        >
          <path
            fill="currentColor"
            d="M0,200 L0,160 L60,130 L130,155 L200,120 L280,150 L360,110 L430,145 L510,120 L600,150 L600,200 Z"
          />
        </svg>

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* Wordmark — same treatment as the sidebar */}
          <div className="flex items-baseline gap-1.5">
            <span className="display text-[22px] font-semibold text-brand-400">
              Ladakh
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-950/85">
              Vacation
            </span>
          </div>

          <div className="max-w-md">
            <p className="rise display text-[2.9rem] leading-[1.05] font-semibold tracking-tight text-ink-950">
              Every file shows what you
              <span className="text-brand-400 italic"> actually </span>
              made on it.
            </p>
            <p
              className="rise mt-6 text-[15px] leading-relaxed text-ink-950/80"
              style={{ animationDelay: '90ms' }}
            >
              Quoted margin and real margin, side by side, on every booking.
              Supplier costs and client payments in one place.
            </p>
          </div>

          <dl
            className="rise grid grid-cols-3 gap-6 border-t border-ink-950/20 pt-6"
            style={{ animationDelay: '180ms' }}
          >
            {[
              { Icon: Compass, term: 'Attribution', desc: 'Keyword to booking' },
              { Icon: Sparkles, term: 'Margin', desc: 'Quoted vs actual' },
              { Icon: Mountain, term: 'Suppliers', desc: 'Owned by the company' },
            ].map(({ Icon, term, desc }) => (
              <div key={term}>
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.11em] text-ink-950">
                  <Icon className="size-3.5" strokeWidth={2} />
                  {term}
                </dt>
                <dd className="mt-1 text-[11.5px] leading-snug text-ink-950/70">
                  {desc}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Right: the sign-in card — sits on parchment. */}
      <section className="relative flex items-center justify-center overflow-hidden bg-ink-950 px-6 py-12">
        {/* Warm gold blob top-right so the empty side has a heartbeat too. */}
        <div
          aria-hidden
          className="aurora pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full blur-[90px]"
          style={{
            background:
              'radial-gradient(circle, rgba(244,200,90,0.28), transparent 60%)',
          }}
        />

        <div className="relative w-full max-w-[360px]">
          {/* Compact wordmark for narrow viewports where the left panel is hidden. */}
          <div className="mb-8 flex items-baseline gap-1.5 lg:hidden">
            <span className="display text-[20px] font-semibold text-brand-600">
              Ladakh
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-signal-600">
              Vacation
            </span>
          </div>

          <h1 className="display text-[28px] font-semibold leading-tight tracking-tight text-ink-100">
            Welcome back.
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-400">
            Sign in with the account your administrator created.
          </p>

          <div className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="you@ladakhvacation.in"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300">Forgot password?</Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rise rounded-md border border-loss-500/40 bg-loss-500/10 px-3 py-2 text-[13px] text-loss-500"
              >
                {error}
              </p>
            )}

            <Button
              onClick={signIn}
              disabled={busy || !email || !password}
              className="w-full"
              size="lg"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="pt-2 text-center text-[11.5px] text-ink-500">
              Trouble signing in? Ask your admin to reset the password.
            </p>

            <p className="pt-4 text-center text-[11.5px] text-ink-500">
              <a
                href="https://ladakhvacation.in"
                className="hover:text-brand-500 transition-colors"
              >
                ← Back to ladakhvacation.in
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
