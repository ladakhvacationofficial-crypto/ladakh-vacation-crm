'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mountain,
  Calendar,
  Users,
  Compass,
  Bed,
  Utensils,
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Car,
  FileDown,
  Sparkles,
  HeartHandshake,
} from 'lucide-react';

interface ItineraryItem {
  id: string;
  kind: string;
  time?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  hotelName?: string | null;
  hotelCity?: string | null;
}

interface ItineraryDay {
  id: string;
  dayNumber: number;
  date?: string | null;
  city?: string | null;
  headline?: string | null;
  summary?: string | null;
  items: ItineraryItem[];
}

interface ItineraryOption {
  id: string;
  name: string;
  isRecommended: boolean;
  perPersonSell: number;
  totalSell: number;
  sortOrder: number;
}

interface PublicItinerary {
  id: string;
  code: string;
  shareToken: string;
  title: string;
  headline?: string | null;
  intro?: string | null;
  totalPax: number;
  inclusions?: string | null;
  exclusions?: string | null;
  clientName: string;
  destination: string;
  travelStartDate?: string | null;
  days: ItineraryDay[];
  options: ItineraryOption[];
  booking?: {
    id: string;
    bookingNumber: string;
    status: string;
  } | null;
  company: {
    brandName: string;
    phone: string;
    email: string;
    website: string;
  };
}

const ALTITUDE_STAGES = [
  { day: 1, name: 'Leh Arrival', alt: '11,500 ft', advisory: 'Mandatory 24h room rest & hydration' },
  { day: 2, name: 'Sham Valley', alt: '11,500 ft', advisory: 'Light acclimatization sightseeing' },
  { day: 3, name: 'Khardung La Pass', alt: '18,380 ft', advisory: 'Highest motorable road transit to Nubra' },
  { day: 4, name: 'Pangong Lake', alt: '14,270 ft', advisory: 'High-altitude cold alpine stay' },
  { day: 5, name: 'Chang La Pass', alt: '17,586 ft', advisory: 'Descent back to Leh Valley' },
];

export default function PublicItineraryViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<PublicItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
    fetch(`${apiBase}/itineraries/public/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Itinerary not found (${res.status})`);
        }
        return res.json();
      })
      .then((it: PublicItinerary) => {
        setData(it);
        const rec = it.options.find((o) => o.isRecommended) ?? it.options[0];
        if (rec) setSelectedOptionId(rec.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAcceptOption() {
    if (!selectedOptionId) return;
    setAccepting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
      const res = await fetch(`${apiBase}/itineraries/public/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: selectedOptionId, clientNotes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Could not accept proposal');
      setAccepted(true);
      setShowAcceptModal(false);
    } catch (e: any) {
      alert(e.message || 'Error accepting proposal');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 text-ink-850 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-warn-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-ink-600">Loading your Ladakh journey...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ink-50 text-ink-850 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-ink-100 border border-ink-200 rounded-2xl p-8 shadow-2xl">
          <ShieldAlert className="size-12 text-warn-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold tracking-tight mb-2">Itinerary Unavailable</h1>
          <p className="text-sm text-ink-600 mb-6">
            {error ?? 'This travel proposal link is invalid or may have expired.'}
          </p>
          <a
            href="tel:+919419178901"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-warn-500 text-ink-50 font-semibold text-sm hover:bg-warn-500 transition"
          >
            <Phone className="size-4" /> Call Ladakh Concierge
          </a>
        </div>
      </div>
    );
  }

  const selectedOption = data.options.find((o) => o.id === selectedOptionId) ?? data.options[0];
  const totalNights = Math.max(1, data.days.length - 1);

  return (
    <div className="min-h-screen bg-ink-50 text-ink-850 font-sans antialiased pb-24">
      {/* Top Brand Banner */}
      <header className="sticky top-0 z-40 bg-ink-50/85 backdrop-blur-md border-b border-ink-200/80 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-black tracking-widest text-warn-500 font-serif">
              LADAKH VACATION
            </span>
            <span className="text-[11px] uppercase tracking-wider text-ink-600 font-semibold px-2 py-0.5 rounded bg-ink-200 border border-ink-300">
              Proposal #{data.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/919419178901?text=Hi%20Ladakh%20Vacation,%20I%20am%20reviewing%20itinerary%20${data.code}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-healthy-500/20 text-healthy-500 border border-healthy-500/30 text-xs font-semibold hover:bg-healthy-500/12 transition"
            >
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a
              href="tel:+919419178901"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-200 text-ink-800 border border-ink-300 text-xs font-semibold hover:bg-ink-300 transition"
            >
              <Phone className="size-3.5" />
              <span className="hidden sm:inline">Call Expert</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-10 pb-8 sm:px-8 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warn-500/10 border border-warn-500/20 text-warn-500 text-xs font-semibold mb-4">
          <Sparkles className="size-3.5" /> Handcrafted Private Expedition for {data.clientName}
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-ink-950 tracking-tight leading-tight mb-3">
          {data.title}
        </h1>
        {data.headline && (
          <p className="text-base sm:text-lg text-warn-500/90 font-medium mb-4">
            {data.headline}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-ink-700 font-medium pt-2">
          <div className="flex items-center gap-1.5 bg-ink-100 border border-ink-200 px-3 py-1.5 rounded-lg">
            <Calendar className="size-4 text-warn-500" />
            <span>{totalNights} Nights / {data.days.length} Days</span>
          </div>
          <div className="flex items-center gap-1.5 bg-ink-100 border border-ink-200 px-3 py-1.5 rounded-lg">
            <Users className="size-4 text-warn-500" />
            <span>{data.totalPax} Travelers</span>
          </div>
          <div className="flex items-center gap-1.5 bg-ink-100 border border-ink-200 px-3 py-1.5 rounded-lg">
            <Compass className="size-4 text-warn-500" />
            <span>Private Innova / 4x4 Circuit</span>
          </div>
        </div>
      </section>

      {/* Altitude Profile & High-Altitude Safety Alert */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mb-8">
        <div className="bg-gradient-to-br from-ink-100 to-ink-100/90 border border-warn-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="p-2.5 rounded-xl bg-warn-500/20 border border-warn-500/30 text-warn-500 shrink-0">
              <Mountain className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink-850 flex items-center gap-2">
                Altitude Curve & Acclimatization Advisory
              </h2>
              <p className="text-xs sm:text-sm text-ink-600 mt-0.5">
                Ladakh sits above 11,000 feet. Your circuit has been doctor-calibrated with a 48-hour acclimatization buffer.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
            {ALTITUDE_STAGES.map((s, idx) => (
              <div
                key={idx}
                className="bg-ink-50/60 border border-ink-200 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="text-[11px] font-semibold text-ink-600">Day {s.day}</div>
                <div className="text-sm font-bold text-ink-850 mt-0.5">{s.name}</div>
                <div className="text-xs font-black text-warn-500 mt-1">{s.alt}</div>
                <div className="text-[10px] text-ink-500 mt-1.5 leading-snug">{s.advisory}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package Tier Selection Cards */}
      {data.options.length > 0 && (
        <section className="px-4 sm:px-8 max-w-5xl mx-auto mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-ink-850">Select Travel Tier</h2>
              <p className="text-xs sm:text-sm text-ink-600">
                Choose the accommodation and comfort tier that best suits your group.
              </p>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            {data.options.map((opt) => {
              const active = opt.id === selectedOptionId;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`cursor-pointer rounded-2xl p-5 border transition flex flex-col justify-between relative ${
                    active
                      ? 'bg-warn-500/10 border-warn-500 shadow-lg shadow-warn-500/10'
                      : 'bg-ink-100/70 border-ink-200 hover:border-ink-300'
                  }`}
                >
                  {opt.isRecommended && (
                    <span className="absolute -top-2.5 right-4 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-warn-500 text-ink-50 font-sans shadow-md">
                      Best Value
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-ink-850">{opt.name}</span>
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          active ? 'border-warn-500 bg-warn-500' : 'border-ink-400'
                        }`}
                      >
                        {active && <div className="size-1.5 rounded-full bg-ink-50" />}
                      </div>
                    </div>
                    <p className="text-xs text-ink-600 mt-1">
                      Full Circuit with MAP Meals & Private Cab
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink-200">
                    <div className="text-xl sm:text-2xl font-black text-ink-850">
                      ₹{opt.totalSell.toLocaleString('en-IN')}
                    </div>
                    {opt.perPersonSell > 0 && (
                      <div className="text-xs text-warn-500/90 font-medium">
                        ₹{opt.perPersonSell.toLocaleString('en-IN')} / person
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Day by Day Interactive Timeline */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-ink-850">
            Day-by-Day Expedition Circuit
          </h2>
          <span className="text-xs text-ink-600 font-medium">
            {data.days.length} Days Detailed Plan
          </span>
        </div>

        {/* Day Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {data.days.map((d) => (
            <button
              key={d.dayNumber}
              onClick={() => setActiveDay(d.dayNumber)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                activeDay === d.dayNumber
                  ? 'bg-warn-500 text-ink-50'
                  : 'bg-ink-100 text-ink-600 hover:text-ink-800 border border-ink-200'
              }`}
            >
              Day {d.dayNumber} · {d.city ?? 'Leh'}
            </button>
          ))}
        </div>

        {/* Active Day Detail Card */}
        {(() => {
          const day = data.days.find((d) => d.dayNumber === activeDay) ?? data.days[0];
          if (!day) return null;
          return (
            <div className="bg-ink-100/80 border border-ink-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-200 pb-4 mb-6">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-warn-500">
                    Day {day.dayNumber} Expedition
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-ink-950 mt-1">
                    {day.headline ?? `Day ${day.dayNumber} Sightseeing & Travel`}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-ink-200 text-ink-700">
                  <MapPin className="size-3.5 text-warn-500" />
                  <span>Night Halt: {day.city ?? 'Leh'}</span>
                </div>
              </div>

              {day.summary && (
                <p className="text-sm text-ink-700 leading-relaxed mb-6 font-medium">
                  {day.summary}
                </p>
              )}

              {/* Day's Activities & Stays */}
              <div className="space-y-4">
                {day.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-ink-50/70 border border-ink-200/80 flex items-start gap-4"
                  >
                    <div className="p-2.5 rounded-xl bg-ink-100 border border-ink-200 text-warn-500 shrink-0">
                      {item.kind === 'STAY' ? (
                        <Bed className="size-5" />
                      ) : item.kind === 'TRANSFER' ? (
                        <Car className="size-5" />
                      ) : item.kind === 'MEAL' ? (
                        <Utensils className="size-5" />
                      ) : (
                        <Compass className="size-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-ink-850 truncate">
                          {item.title}
                        </h4>
                        {item.time && (
                          <span className="text-[11px] font-semibold text-ink-600 shrink-0 flex items-center gap-1">
                            <Clock className="size-3" /> {item.time}
                          </span>
                        )}
                      </div>
                      {item.hotelName && (
                        <div className="text-xs font-semibold text-warn-500 mt-0.5">
                          Accommodation: {item.hotelName} {item.hotelCity ? `(${item.hotelCity})` : ''}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-xs text-ink-600 mt-1 leading-normal">
                          {item.description}
                        </p>
                      )}
                      {item.location && (
                        <div className="text-[11px] text-ink-500 mt-1.5 flex items-center gap-1">
                          <MapPin className="size-3 text-ink-500" />
                          {item.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Inclusions & Exclusions */}
      {(data.inclusions || data.exclusions) && (
        <section className="px-4 sm:px-8 max-w-5xl mx-auto mb-12">
          <div className="grid gap-6 sm:grid-cols-2">
            {data.inclusions && (
              <div className="bg-ink-100/60 border border-healthy-500/35 rounded-2xl p-6">
                <h3 className="text-base font-bold text-healthy-500 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> Package Inclusions
                </h3>
                <ul className="text-xs text-ink-700 space-y-2 leading-relaxed">
                  {data.inclusions.split('\n').filter(Boolean).map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-healthy-500 font-bold">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.exclusions && (
              <div className="bg-ink-100/60 border border-ink-200 rounded-2xl p-6">
                <h3 className="text-base font-bold text-ink-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warn-500" /> Exclusions
                </h3>
                <ul className="text-xs text-ink-600 space-y-2 leading-relaxed">
                  {data.exclusions.split('\n').filter(Boolean).map((line, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ink-500">✕</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-ink-50/95 backdrop-blur-lg border-t border-ink-200 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium text-ink-600">
              Selected: <span className="text-ink-800 font-bold">{selectedOption?.name}</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-warn-500">
              ₹{selectedOption?.totalSell.toLocaleString('en-IN')}
              <span className="text-xs text-ink-600 font-normal ml-1.5">Net for {data.totalPax} pax</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {accepted ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-healthy-500/20 text-healthy-500 border border-healthy-500/40 text-sm font-bold">
                <CheckCircle2 className="size-4" /> Proposal Accepted
              </div>
            ) : (
              <button
                onClick={() => setShowAcceptModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-warn-500 to-warn-500 text-ink-50 font-black text-sm hover:from-warn-500 hover:to-warn-500 shadow-xl shadow-warn-500/20 transition active:scale-95"
              >
                <HeartHandshake className="size-4.5" /> Accept Proposal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Acceptance Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-ink-100 border border-ink-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-ink-850 mb-2">Confirm Your Ladakh Expedition</h3>
            <p className="text-xs text-ink-600 mb-4 leading-relaxed">
              You are accepting the <strong className="text-warn-500">{selectedOption?.name}</strong> option at ₹{selectedOption?.totalSell.toLocaleString('en-IN')}. Our team will immediately block your rooms and vehicle.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-ink-700 block mb-1">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="e.g. Ground floor rooms preferred, vegetarian meals only..."
                rows={3}
                className="w-full rounded-xl bg-ink-50 border border-ink-200 p-3 text-xs text-ink-800 placeholder-stone-600 focus:outline-none focus:border-warn-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-ink-600 hover:text-ink-800"
              >
                Cancel
              </button>
              <button
                disabled={accepting}
                onClick={handleAcceptOption}
                className="px-6 py-2.5 rounded-full bg-warn-500 text-ink-50 font-bold text-xs hover:bg-warn-500 transition"
              >
                {accepting ? 'Processing...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
