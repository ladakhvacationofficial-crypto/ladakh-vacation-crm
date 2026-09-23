import { LeadSource } from '@prisma/client';
import { LadakhSeason } from '../common/dates';

/**
 * Transparent, balanced rule-based lead scoring (0-100) with category ceilings:
 *
 * 1. Intent & Acquisition Channel: max 25 pts
 * 2. Trip Specificity & Timing:    max 35 pts
 * 3. Budget Viability vs Floor:    max 30 pts
 * 4. Contactability:               max 10 pts
 *
 * Total = sum of category scores (capped at 100).
 * Prevents thin ad clicks from scoring as "hot" leads while rewarding complete,
 * economically viable trip inquiries.
 */
export interface ScoreInput {
  source?: LeadSource;
  email?: string | null;
  message?: string | null;
  destination?: string | null;
  travelDate?: Date | null;
  season?: LadakhSeason;
  budget?: number | null;
  nights?: number | null;
  adults?: number | null;
  gclid?: string | null;
  fbclid?: string | null;
  enquiryCount?: number;
  minBudgetPerPaxNight?: number | null;
}

const SOURCE_WEIGHT: Record<LeadSource, number> = {
  REFERRAL: 16,
  B2B_AGENT: 16,
  WALK_IN: 14,
  GOOGLE_ADS: 13,
  TRADE_FAIR: 13,
  META_ADS: 11,
  ORGANIC: 11,
  PHONE: 11,
  INSTAGRAM: 9,
  FACEBOOK: 9,
  WHATSAPP: 9,
  LANDING_PAGE: 9,
  WEBSITE: 9,
  EMAIL: 7,
  OTHER: 5,
};

export function scoreLead(input: ScoreInput): {
  score: number;
  notes: string;
} {
  const parts: string[] = [];

  // ── 1. Intent & Acquisition Channel (Max 25 pts) ──────────────────────────
  let cat1 = 5; // Base intent
  const cat1Parts: string[] = ['base +5'];

  const src = input.source ?? LeadSource.OTHER;
  const srcPts = SOURCE_WEIGHT[src] ?? 5;
  cat1 += srcPts;
  cat1Parts.push(`src:${src} +${srcPts}`);

  // Paid click ID verification (Google / Meta click id)
  if (input.gclid || input.fbclid) {
    cat1 += 4;
    cat1Parts.push('paid-click +4');
  }

  // Repeat enquiry
  const repeats = Math.max(0, (input.enquiryCount ?? 1) - 1);
  if (repeats > 0) {
    const repeatPts = Math.min(6, repeats * 3);
    cat1 += repeatPts;
    cat1Parts.push(`repeat x${repeats} +${repeatPts}`);
  }

  const scoreCat1 = Math.min(25, cat1);
  parts.push(`Intent: ${scoreCat1}/25 (${cat1Parts.join(', ')})`);

  // ── 2. Trip Specificity & Timing (Max 35 pts) ─────────────────────────────
  let cat2 = 0;
  const cat2Parts: string[] = [];

  if (input.travelDate) {
    if (input.season === 'PRIME') {
      cat2 += 14;
      cat2Parts.push('prime date +14');
    } else if (input.season === 'SHOULDER') {
      cat2 += 11;
      cat2Parts.push('shoulder date +11');
    } else if (input.season === 'WINTER') {
      cat2 += 7;
      cat2Parts.push('winter date +7');
    } else {
      cat2 += 10;
      cat2Parts.push('travel date +10');
    }
  }

  if (input.nights && input.nights > 0) {
    const nightPts = input.nights >= 4 && input.nights <= 9 ? 8 : 4;
    cat2 += nightPts;
    cat2Parts.push(`${input.nights}N +${nightPts}`);
  }

  if (input.destination) {
    cat2 += 5;
    cat2Parts.push('destination +5');
  }

  if (input.adults && input.adults > 0) {
    cat2 += 4;
    cat2Parts.push(`pax(${input.adults}) +4`);
  }

  // Only real user message (not system-appended date text)
  if (input.message && input.message.trim().length > 20) {
    cat2 += 4;
    cat2Parts.push('custom notes +4');
  }

  const scoreCat2 = Math.min(35, cat2);
  if (cat2Parts.length > 0) {
    parts.push(`Trip: ${scoreCat2}/35 (${cat2Parts.join(', ')})`);
  } else {
    parts.push('Trip: 0/35 (no details)');
  }

  // ── 3. Budget & Economic Viability (Max 30 pts) ───────────────────────────
  let cat3 = 0;
  const cat3Parts: string[] = [];

  const defaultFloor =
    input.season === 'PRIME' ? 2500 : input.season === 'SHOULDER' ? 2000 : 1600;
  const floor = input.minBudgetPerPaxNight ?? defaultFloor;

  if (input.budget && input.budget > 0) {
    const pax = Math.max(input.adults || 2, 1);
    const nights = Math.max(input.nights || 5, 1);
    const ratePerPaxNight = Math.round(input.budget / (pax * nights));

    if (ratePerPaxNight >= floor * 2 || ratePerPaxNight >= 5000) {
      cat3 += 30;
      cat3Parts.push(`premium ₹${ratePerPaxNight.toLocaleString('en-IN')}/pax-night +30`);
    } else if (ratePerPaxNight >= floor) {
      cat3 += 22;
      cat3Parts.push(`viable ₹${ratePerPaxNight.toLocaleString('en-IN')}/pax-night (floor ₹${floor}) +22`);
    } else if (ratePerPaxNight >= Math.round(floor * 0.7)) {
      cat3 += 10;
      cat3Parts.push(`tight ₹${ratePerPaxNight.toLocaleString('en-IN')}/pax-night +10`);
    } else {
      cat3 -= 10;
      cat3Parts.push(`sub-floor ₹${ratePerPaxNight.toLocaleString('en-IN')}/pax-night < floor ₹${floor} (-10)`);
    }
  } else {
    cat3Parts.push('unspecified (+0)');
  }

  const scoreCat3 = Math.max(-10, Math.min(30, cat3));
  parts.push(`Budget: ${scoreCat3}/30 (${cat3Parts.join(', ')})`);

  // ── 4. Contactability (Max 10 pts) ────────────────────────────────────────
  let cat4 = 5; // Direct phone or inbound inquiry
  const cat4Parts: string[] = ['phone +5'];

  if (input.email) {
    cat4 += 5;
    cat4Parts.push('email +5');
  }

  const scoreCat4 = Math.min(10, cat4);
  parts.push(`Contact: ${scoreCat4}/10 (${cat4Parts.join(', ')})`);

  const total = Math.max(0, Math.min(100, scoreCat1 + scoreCat2 + scoreCat3 + scoreCat4));

  return {
    score: total,
    notes: parts.join(' | '),
  };
}
