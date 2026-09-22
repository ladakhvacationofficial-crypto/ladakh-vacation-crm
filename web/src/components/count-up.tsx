'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 → value on mount. Used on hero KPIs where the
 * eye lands first — the sweep sells the "live desk" feeling.
 *
 * Deliberately does NOT animate on subsequent value changes: mid-session
 * jitter would be visual noise, not a signal.
 */
export function CountUp({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const startedAt = useRef<number | null>(null);
  const target = useRef(value);

  useEffect(() => {
    target.current = value;
    startedAt.current = null;
    let raf: number;
    const step = (t: number) => {
      if (startedAt.current === null) startedAt.current = t;
      const elapsed = t - startedAt.current;
      const progress = Math.min(1, elapsed / duration);
      // ease-out-cubic — decelerates naturally, matches the rise() keyframe.
      const eased = 1 - Math.pow(1 - progress, 3);
      setN(Math.round(target.current * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Only re-run when target value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{format ? format(n) : n}</span>;
}
