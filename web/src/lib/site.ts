/**
 * Single source of truth for public-facing brand facts.
 * Change here → propagates through header, footer, WhatsApp CTAs, JSON-LD,
 * sitemap, robots. Never hardcode any of these anywhere else.
 */
export const SITE = {
  name: 'Ladakh Vacation',
  legalName: 'Ladakh Vacation',
  tagline: 'Discover Ladakh · Experience Life',
  domain: 'https://ladakhvacation.in',
  landerDomain: 'https://go.ladakhvacation.in',

  /**
   * NAP (name / address / phone). Local SEO depends on these matching the
   * Google Business Profile character-for-character across every citation.
   * Phone and email are the ones on the live landers; the street line has
   * not been checked against the GBP yet, so confirm it before launch. If
   * the GBP is ever edited, edit here in the same sitting.
   */
  founded: '2012',

  phone: {
    display: '+91 96229 55386',
    tel: '+919622955386',
    wa: '919622955386',
  },
  email: 'ladakhvacation@gmail.com',

  address: {
    street: 'Main Bazaar',
    city: 'Leh',
    region: 'Ladakh',
    postalCode: '194101',
    country: 'IN',
  },

  /** Approximate office coords (Main Bazaar, Leh) — for LocalBusiness JSON-LD. */
  geo: { lat: 34.1642, lng: 77.5848 },

  hours: 'Mon–Sun, 09:00–20:00 IST',

  /** The Google Business Profile reviews link the landers use. */
  googleReviews: 'https://share.google/597twcuknHlL2iW1e',

  social: {
    instagram: 'https://instagram.com/ladakhvacation',
    facebook: 'https://facebook.com/ladakhvacation',
  },

  /**
   * Carried over from the live ladakhvacation.in site and landers (4.9 ★ /
   * 3,300+ reviews, 2,400+ travellers, est. 2012).
   *
   * The rating and reviewCount feed AggregateRating JSON-LD. Publishing
   * numbers that do not match the GBP is a structured-data violation, so
   * re-check these whenever the GBP count moves materially.
   */
  stats: {
    guests: '2,400+',
    rating: '4.9',
    reviewCount: 3300,
    years: String(Math.max(13, new Date().getFullYear() - 2012)),
  },

  /** Google Tag Manager container. Empty until Ladakh Vacation has its own:
   *  the layout only loads GTM when this is set. (Glitz's container ID must
   *  never be reused here, it would send these visits into Glitz analytics.) */
  gtmId: '',

  /** Backend endpoint that accepts public lead captures. */
  leadCaptureUrl:
    process.env.NEXT_PUBLIC_LEAD_CAPTURE_URL ??
    'https://ladakhvacationecosystem.onrender.com/api/leads/capture',

  /**
   * Cheap health endpoint used to wake the Render free-tier backend.
   * Every public page fires a 1×1 Image() at this so the API is warm by
   * the time a visitor submits an enquiry (Render sleeps after 15min idle).
   */
  wakePingUrl:
    process.env.NEXT_PUBLIC_WAKE_PING_URL === 'off' ? '' :
      (process.env.NEXT_PUBLIC_WAKE_PING_URL || process.env.NEXT_PUBLIC_LEAD_CAPTURE_URL?.replace(/\/leads\/capture\/?$/, '/health') || 'https://ladakhvacationecosystem.onrender.com/api/health'),
} as const;

/**
 * Build a wa.me link with a prefilled message so every WhatsApp CTA is
 * consistent and the sales team can tell which page the chat came from.
 */
export function whatsAppLink(context: string): string {
  const msg = `Hi Ladakh Vacation, I'm enquiring about ${context}.`;
  return `https://wa.me/${SITE.phone.wa}?text=${encodeURIComponent(msg)}`;
}

/** ₹ with Indian digit grouping. 18500 → "₹18,500" */
export function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}
