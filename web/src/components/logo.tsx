/**
 * Brand mark: the real Ladakh Vacation emblem (the royal-blue banner in the
 * gold square), the same file the Ads landers use. Served from /public, so it
 * costs one small cached request (~8 KB webp).
 */
export function Mark({ className = 'size-9' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lv-emblem.webp"
      alt=""
      width={115}
      height={120}
      className={`${className} object-contain`}
      aria-hidden
    />
  );
}

export function Wordmark({
  light = false,
  className = '',
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark className="size-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className="text-[19px] font-bold tracking-tight"
          style={{ color: 'var(--color-gold-500)' }}
        >
          LADAKH
        </span>
        <span
          className="text-[10.5px] font-semibold tracking-[0.22em]"
          style={{
            color: light ? 'var(--color-paper-200)' : 'var(--color-pine-700)',
          }}
        >
          VACATION
        </span>
      </span>
    </span>
  );
}
