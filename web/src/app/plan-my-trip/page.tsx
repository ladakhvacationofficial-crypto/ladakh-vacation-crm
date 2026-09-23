'use client';

import { captureContext } from '@/lib/attribution';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Compass, Calendar, Users, Hotel, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { SITE, whatsAppLink } from '@/lib/site';

const DESTINATIONS = [
  { id: 'Leh & Sham Valley', name: 'Leh & Sham Valley', sub: 'Leh, the monasteries, Sham Valley. No high passes', emoji: '🏔️' },
  { id: 'Nubra & Pangong', name: 'Nubra & Pangong', sub: 'Khardung La, Hunder, Turtuk, Pangong Tso', emoji: '✨' },
  { id: 'Hanle & Tso Moriri', name: 'Hanle & Tso Moriri', sub: 'Dark Sky Reserve, Umling La, Changthang', emoji: '🌌' },
  { id: 'Overland', name: 'Overland to Leh', sub: 'Manali–Leh or Srinagar–Leh by road, or by bike', emoji: '🛣️' },
];

const DURATIONS = [
  { id: '3-4N', label: '3 to 4 Nights', hint: 'Leh, with Nubra on four' },
  { id: '5-6N', label: '5 to 6 Nights', hint: 'Honeymoon, monasteries, Hanle' },
  { id: '7N', label: '7 Nights', hint: 'Nubra, Turtuk & Pangong' },
  { id: '8N+', label: '8+ Nights', hint: 'The whole of Ladakh' },
];

const HOTEL_TIERS = [
  { id: 'Standard', name: 'Standard 3★', desc: 'Centrally located 3★ hotels in Leh and deluxe camps, all personally inspected' },
  { id: 'Deluxe', name: 'Deluxe 4★', desc: '4★ hotels in Leh and the better camps at Nubra and Pangong' },
  { id: 'Luxury', name: 'Luxury', desc: 'The best available rooms in Leh and luxury tented camps' },
];

export default function PlanMyTripPage() {
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('Nubra & Pangong');
  const [duration, setDuration] = useState('5-6N');
  const [hotelTier, setHotelTier] = useState('Deluxe');
  const [month, setMonth] = useState('Next Month');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      destination,
      adults: parseInt(adults, 10) || 2,
      children: parseInt(children, 10) || 0,
      travelDate: month,
      message: `[Custom Planner] Duration: ${duration} | Hotel: ${hotelTier} | Travel Window: ${month}. Notes: ${notes}`,
      source: 'WEBSITE',
      campaign: 'PLAN_MY_TRIP_WIZARD',
      landingPage: '/plan-my-trip',
      tags: ['CUSTOM_PLANNER', destination, hotelTier],
    };

    try {
      if (!SITE.leadCaptureUrl) throw new Error('Enquiries are temporarily unavailable. Please call or WhatsApp us.');
      const res = await fetch(SITE.leadCaptureUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...await captureContext() }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError('Unable to submit enquiry. Please WhatsApp us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        kicker="Interactive Itinerary Creator"
        title="Custom Holiday Planner"
        lede="Answer 4 quick questions and a planner in Leh will build a day-by-day itinerary around your dates, your group and the altitude."
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Plan My Trip' },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="wrap max-w-3xl">
          {submitted ? (
            <div className="glass-panel glow-gold rounded-3xl p-10 text-center space-y-6">
              <div className="size-16 rounded-full bg-gold-400 text-ink-950 grid place-items-center mx-auto">
                <Check className="size-8 stroke-[2.5]" />
              </div>
              <h2 className="display d2 text-ink-950">Your Custom Trip Plan is in Motion!</h2>
              <p className="text-[15.5px] leading-relaxed text-ink-700 max-w-lg mx-auto">
                Thank you, <strong>{name}</strong>. A planner in Leh is reviewing your <strong>{destination}</strong>, <strong>{duration}</strong> request and will share a day-by-day proposal, usually the same day.
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <a
                  href={whatsAppLink(`custom ${destination} ${duration} plan`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-pine"
                >
                  Chat with Curator on WhatsApp
                </a>
                <Link href="/" className="btn btn-ghost">
                  Back to Homepage
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 md:p-12">
              {/* Step indicator */}
              <div className="flex items-center justify-between border-b border-paper-300 pb-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className={`size-8 rounded-full grid place-items-center text-xs font-semibold ${
                        step === i
                          ? 'bg-gold-400 text-ink-950'
                          : step > i
                          ? 'bg-pine-600 text-paper-50'
                          : 'bg-paper-200 text-ink-500'
                      }`}
                    >
                      {step > i ? '✓' : i}
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-ink-600">
                      {i === 1 ? 'Destination' : i === 2 ? 'Duration' : i === 3 ? 'Hotels' : 'Details'}
                    </span>
                  </div>
                ))}
              </div>

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="display d3 text-ink-950">Where would you like to travel?</h3>
                    <p className="text-sm text-ink-600 mt-1">Pick the part of Ladakh you most want to see. We will build the rest around it.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {DESTINATIONS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDestination(d.id)}
                        className={`p-5 rounded-2xl text-left transition-all border ${
                          destination === d.id
                            ? 'border-gold-500 bg-gold-50/80 shadow-md ring-2 ring-gold-400/30'
                            : 'border-paper-300 bg-paper-100/50 hover:bg-paper-100'
                        }`}
                      >
                        <div className="text-2xl">{d.emoji}</div>
                        <h4 className="font-semibold text-ink-950 text-base mt-2">{d.name}</h4>
                        <p className="text-xs text-ink-600 mt-1">{d.sub}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn btn-gold flex items-center gap-2">
                      Next: Duration & Timing <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="display d3 text-ink-950">Trip Duration & Travel Season</h3>
                    <p className="text-sm text-ink-600 mt-1">How many days do you have in mind?</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {DURATIONS.map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setDuration(dur.id)}
                        className={`p-5 rounded-2xl text-left transition-all border ${
                          duration === dur.id
                            ? 'border-gold-500 bg-gold-50/80 shadow-md ring-2 ring-gold-400/30'
                            : 'border-paper-300 bg-paper-100/50 hover:bg-paper-100'
                        }`}
                      >
                        <h4 className="font-semibold text-ink-950 text-base">{dur.label}</h4>
                        <p className="text-xs text-gold-700 font-medium mt-1">{dur.hint}</p>
                      </button>
                    ))}
                  </div>

                  <div className="pt-3">
                    <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-2">
                      Estimated Travel Month / Window
                    </label>
                    <input
                      type="text"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="e.g. October 2026 or Diwali Holidays"
                      className="w-full px-4 py-3 rounded-xl border border-paper-300 bg-paper-50 focus:border-gold-500 text-sm"
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <button type="button" onClick={() => setStep(1)} className="btn btn-ghost flex items-center gap-1.5">
                      <ArrowLeft className="size-4" /> Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn btn-gold flex items-center gap-2">
                      Next: Accommodation <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="display d3 text-ink-950">Hotel & Experience Style</h3>
                    <p className="text-sm text-ink-600 mt-1">Choose the comfort level that matches your trip.</p>
                  </div>
                  <div className="space-y-3">
                    {HOTEL_TIERS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setHotelTier(h.id)}
                        className={`w-full p-5 rounded-2xl text-left transition-all border flex items-center justify-between ${
                          hotelTier === h.id
                            ? 'border-gold-500 bg-gold-50/80 shadow-md ring-2 ring-gold-400/30'
                            : 'border-paper-300 bg-paper-100/50 hover:bg-paper-100'
                        }`}
                      >
                        <div>
                          <h4 className="font-semibold text-ink-950 text-base">{h.name}</h4>
                          <p className="text-xs text-ink-600 mt-0.5">{h.desc}</p>
                        </div>
                        <div
                          className={`size-6 rounded-full border grid place-items-center ${
                            hotelTier === h.id ? 'border-gold-600 bg-gold-500 text-ink-950' : 'border-paper-400'
                          }`}
                        >
                          {hotelTier === h.id && <Check className="size-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-2">
                        Adults (12+ yrs)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={adults}
                        onChange={(e) => setAdults(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-2">
                        Children (Under 12)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={children}
                        onChange={(e) => setChildren(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button type="button" onClick={() => setStep(2)} className="btn btn-ghost flex items-center gap-1.5">
                      <ArrowLeft className="size-4" /> Back
                    </button>
                    <button type="button" onClick={() => setStep(4)} className="btn btn-gold flex items-center gap-2">
                      Final Step: Contact Details <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <form onSubmit={handleFinalSubmit} className="space-y-5">
                  <div>
                    <h3 className="display d3 text-ink-950">Where Should We Send Your Itinerary?</h3>
                    <p className="text-sm text-ink-600 mt-1">Our team in Leh will prepare your quote and message you.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-paper-100 border border-paper-300 text-xs text-ink-700 flex items-center justify-between">
                    <span>
                      <strong>Summary:</strong> {destination} · {duration} · {hotelTier} · {adults} Adults
                    </span>
                    <button type="button" onClick={() => setStep(1)} className="text-gold-700 underline font-semibold">
                      Edit
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-1.5">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-1.5">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-800 uppercase tracking-wider mb-1.5">
                      Special Requests / Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Need Gondola tickets assistance, vegetarian food, ground-floor room"
                      className="w-full px-4 py-2.5 rounded-xl border border-paper-300 bg-paper-50 text-sm"
                    />
                  </div>

                  {error && <p className="text-xs text-rose-600">{error}</p>}

                  <div className="flex justify-between items-center pt-4">
                    <button type="button" onClick={() => setStep(3)} className="btn btn-ghost flex items-center gap-1.5">
                      <ArrowLeft className="size-4" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-gold btn-shine flex items-center gap-2"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Generate My Itinerary
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
