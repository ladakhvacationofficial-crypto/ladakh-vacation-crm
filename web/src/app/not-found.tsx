import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DESTINATIONS } from '@/lib/destinations';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="mesh-pine grain relative isolate flex min-h-[78svh] items-center overflow-hidden">
      <div
        aria-hidden
        className="blob left-[10%] top-[16%] h-[360px] w-[360px]"
        style={{ background: 'rgba(201,169,97,0.16)' }}
      />
      <div className="wrap relative text-center">
        <p className="anim-fade kicker kicker-light">Error 404</p>
        <h1 className="display d1 anim-rise d-1 mx-auto mt-4 max-w-[16ch] text-paper-50">
          You&rsquo;ve wandered off the map.
        </h1>
        <p className="anim-rise d-3 lede mx-auto mt-6 max-w-lg !text-paper-200/75">
          This page does not exist &mdash; but four Himalayan regions do. Try one
          of those instead.
        </p>

        <div className="anim-rise d-4 mx-auto mt-10 flex flex-wrap justify-center gap-2.5">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.slug}
              href={`/destinations/${d.slug}`}
              className="rounded-full border border-paper-100/25 px-4 py-2 text-[13px] text-paper-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/10 hover:text-gold-200"
            >
              {d.name}
            </Link>
          ))}
        </div>

        <div className="anim-rise d-5 mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-gold btn-shine group">
            Back to home
            <ArrowRight className="arrow-slide size-4" strokeWidth={2.2} />
          </Link>
          <Link href="/packages" className="btn btn-ghost-light">
            Browse packages
          </Link>
        </div>
      </div>
    </section>
  );
}
