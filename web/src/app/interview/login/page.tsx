'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mountain, Phone, ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function CandidateLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your mobile phone number.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await api.post<{
        interviewId: string;
        candidateName: string;
        role: string;
      }>('/interviews/candidate/login', { phone: phone.trim() });

      if (res?.interviewId) {
        router.push(`/interview/session/${res.interviewId}`);
      } else {
        setError('No interview found. Please check your number.');
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not find your interview session. Please check your mobile number or contact HR.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 py-12 text-ink-100 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[480px] w-[480px] rounded-full bg-gold-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Crest */}
        <div className="text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400 shadow-xl shadow-gold-500/5">
            <Mountain className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            Ladakh Vacation
          </h1>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gold-400">
            <Sparkles className="size-3.5" />
            AI Interview Portal
          </div>
          <p className="mt-3 text-sm text-ink-400">
            Welcome! Enter your registered mobile number to access your friendly AI interview session.
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-8 rounded-2xl border border-ink-800/80 bg-ink-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="phone" className="text-xs font-medium text-ink-300">
                Registered Mobile Number
              </Label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
                  <Phone className="size-4" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  disabled={busy}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. 9876543210"
                  className="pl-9 text-base bg-ink-950/60 border-ink-700/60 text-ink-100 placeholder:text-ink-600 focus:border-gold-500 focus:ring-gold-500/20"
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-500">
                Enter the phone number you provided during your job application.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-loss-500/30 bg-loss-500/10 p-3 text-xs text-loss-400"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy || !phone.trim()}
              className="w-full bg-gold-500 text-ink-950 hover:bg-gold-400 font-semibold shadow-lg shadow-gold-500/20 h-11"
            >
              {busy ? (
                'Connecting to AI Portal...'
              ) : (
                <>
                  Start AI Interview Session
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Instructions in very easy English */}
          <div className="mt-6 border-t border-ink-800/80 pt-5">
            <div className="text-[12px] font-medium text-ink-300">What to expect:</div>
            <ul className="mt-2 space-y-1.5 text-[11.5px] text-ink-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-gold-400" />
                <span>5 simple, conversational questions in easy English.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-gold-400" />
                <span>You can speak using your microphone 🎙️ or type your answer ⌨️.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-gold-400" />
                <span>Take your time — there is no rush or trick questions!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security & HR Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-500">
          <ShieldCheck className="size-4 text-ink-400" />
          <span>Ladakh Vacation Travel Pvt Ltd · Leh, Ladakh</span>
        </div>
      </div>
    </div>
  );
}
