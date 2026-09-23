import { Prisma } from '@prisma/client';

/**
 * Race-safe sequential number generator ("LV-B-2026-0001" style).
 *
 * The read-then-write pattern (find highest, add one, insert) races when two
 * requests fire simultaneously — both read N, both write N+1, one commit
 * fails with a unique-violation. That fires on New Year's Day when the year
 * prefix flips and the counter resets to 1 for multiple concurrent quotes.
 *
 * This helper retries on Prisma's P2002 up to `maxRetries` times, so a
 * collision loses at most a few milliseconds. Beyond that, the caller sees
 * the exception (which itself signals contention worth investigating).
 *
 * Using a Postgres sequence would be even cleaner, but sequences don't
 * partition by prefix (we want "LV-ITI-2026-*" to be independent from
 * "LV-B-2026-*"). A retry loop is the simpler, correct-enough answer.
 */
export async function withNumberRetry<T>(
  fn: () => Promise<T>,
  // Real workload here is quotes/bookings/employees at low volume — 5-15 a
  // day for a DMC. 10 retries handles even a 20-way concurrent burst; if a
  // team ever needs more, a Postgres advisory lock or a partitioned sequence
  // would be the right upgrade (both bigger changes).
  maxRetries = 10,
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      const collision =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002' &&
        // Only retry on unique violations that touch a *_number or *_code
        // column — the two sequential-id patterns in this codebase. Any
        // other P2002 (email dup, natural-key violation) is a real constraint
        // failure we shouldn't hide with retries.
        Array.isArray((e.meta as any)?.target) &&
        ((e.meta as any).target as string[]).some((t) => {
          const s = t.toLowerCase();
          return s.endsWith('number') || s.endsWith('code') || s === 'code';
        });
      if (!collision || i === maxRetries) throw e;
      // Tiny back-off — the collision means another request just wrote N+1,
      // so a re-read almost always succeeds immediately.
      await new Promise((r) => setTimeout(r, 10 + Math.floor(Math.random() * 20)));
    }
  }
  // Unreachable — the loop either returns or throws above.
  throw new Error('withNumberRetry exhausted');
}
