'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Plane } from 'lucide-react';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid or missing reset token.' });
    }
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setMessage({ type: 'success', text: 'Password reset successfully. You can now log in.' });
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Could not process request.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!token}
          minLength={6}
        />
      </div>

      {message && (
        <p
          role="alert"
          className={`rounded-md border px-3 py-2 text-[13px] ${
            message.type === 'error'
              ? 'border-loss-500/40 bg-loss-500/10 text-loss-400'
              : 'border-win-500/40 bg-win-500/10 text-win-400'
          }`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy || !token}>
        {busy ? 'Resetting...' : 'Reset password'}
      </Button>

      <div className="text-center text-sm">
        <Link href="/login" className="text-primary-400 hover:text-primary-300">
          Back to login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400">
            <Plane className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold text-ink-100">Reset Password</h1>
          <p className="mt-1.5 text-[13px] text-ink-400">
            Enter your new password below.
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-ink-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
