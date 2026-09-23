'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, Phone } from 'lucide-react';
import { SITE, whatsAppLink } from '@/lib/site';
import { DESTINATIONS } from '@/lib/destinations';
import { captureAttribution, getAttributionPayload } from '@/lib/attribution';

type Props = {
  /** Which page this form sits on — sent to the CRM as `campaign`. */
  source: string;
  /** Prefills the destination select and tags the lead. */
  packageName?: string;
  destination?: string;
  /** Renders on a dark background. */
  light?: boolean;
  className?: string;
};

/**
 * Public enquiry form. POSTs straight to the CRM's capture endpoint — the
 * same one the Google Ads landers use — so every lead lands in one pipeline
 * with the standard follow-up cadence attached.
 */
export function EnquiryForm({
  source,
  packageName,
  destination,
  light = false,
  className = '',
}: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureAttribution();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const attr = getAttributionPayload();

    const payload = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim() || undefined,
      destination: String(data.get('destination') ?? '').trim() || destination || undefined,
      adults: Number(data.get('adults')) || undefined,
      travelDate: String(data.get('travelDate') ?? '').trim() || undefined,
      message: String(data.get('message') ?? '').trim() || undefined,
      source: (attr.gclid ? 'GOOGLE_ADS' : attr.fbclid ? 'META_ADS' : 'WEBSITE') as any,
      campaign: attr.utmCampaign || source,
      landingPage: typeof window !== 'undefined' ? window.location.pathname : source,
      tags: packageName ? [packageName] : undefined,
      ...attr,
    };

    try {
      const res = await fetch(SITE.leadCaptureUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('sent');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'sent') {
    return (
      <div className={className}>
        <div className="anim-rise rounded-2xl border border-gold-300 bg-gold-50 p-7 text-center">
          <div className="pulse-gold mx-auto grid size-12 place-items-center rounded-full bg-gold-400 text-ink-950">
            <Check className="size-6" strokeWidth={2.5} />
          </div>
          <h3 className="display d3 mt-4 text-ink-900">Enquiry received.</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            A travel specialist will reach out within a few hours with a custom
            itinerary. For anything urgent, WhatsApp or call us directly.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <a
              href={whatsAppLink(packageName ?? 'my enquiry')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-pine"
            >
              WhatsApp us now
            </a>
            <a href={`tel:${SITE.phone.tel}`} className="btn btn-ghost">
              <Phone className="size-4" strokeWidth={2} />
              {SITE.phone.display}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const label = light
    ? 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-paper-200/70'
    : 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500';

  const field = light
    ? 'w-full rounded-lg border border-paper-100/20 bg-paper-50/10 px-3.5 py-3 text-[14.5px] text-paper-50 placeholder:text-paper-200/40 transition-all duration-200 focus:border-gold-400 focus:bg-paper-50/15 focus:outline-none'
    : 'w-full rounded-lg border border-paper-300 bg-white px-3.5 py-3 text-[14.5px] text-ink-900 placeholder:text-ink-400 transition-all duration-200 focus:border-gold-400 focus:shadow-[0_0_0_3px_rgba(201,169,97,0.15)] focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className={className} noValidate={false}>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Your name *</span>
            <input required name="name" autoComplete="name" className={field} placeholder="Full name" />
          </label>
          <label className="block">
            <span className={label}>Phone / WhatsApp *</span>
            <input
              required
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="[0-9+() -]{8,}"
              className={field}
              placeholder="+91 …"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Email</span>
            <input name="email" type="email" autoComplete="email" className={field} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className={label}>Destination</span>
            <select
              name="destination"
              defaultValue={destination ?? ''}
              className={`${field} cursor-pointer appearance-none`}
            >
              <option value="">Not sure yet</option>
              {DESTINATIONS.map((d) => (
                <option key={d.slug} value={d.name} className="text-ink-900">
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Travelling from</span>
            <input name="travelDate" type="date" className={`${field} cursor-pointer`} />
          </label>
          <label className="block">
            <span className={label}>Travellers</span>
            <input
              name="adults"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              className={field}
              placeholder="2"
            />
          </label>
        </div>

        <label className="block">
          <span className={label}>What are you planning?</span>
          <textarea
            name="message"
            rows={3}
            className={`${field} resize-y`}
            placeholder={
              packageName
                ? `Interested in ${packageName} — tell us group size, dates, anything specific.`
                : 'E.g. 7 nights in Ladakh in late June, family of four, one grandparent.'
            }
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-800">
            Could not send ({error}). Please WhatsApp us on {SITE.phone.display} instead — we will get straight back to you.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn btn-gold btn-shine w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending' && <Loader2 className="size-4 animate-spin" />}
          {status === 'sending' ? 'Sending…' : 'Get my free itinerary'}
        </button>

        <p className={`text-center text-[11.5px] ${light ? 'text-paper-200/55' : 'text-ink-500'}`}>
          No spam, no call-centre hand-offs. One specialist, start to finish.
        </p>
      </div>
    </form>
  );
}
