/**
 * Attribution helper for Ladakh Vacation.
 *
 * Captures paid advertising click parameters (Google Ads gclid, Meta Ads fbclid)
 * and Google Analytics standard UTM tags (source, medium, campaign, term, content)
 * on first pageview, caching them in sessionStorage so multi-page journeys preserve
 * campaign origin through to conversion.
 */

const STORAGE_KEY = 'lv.attribution';

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
  visitId?: string;
}

/**
 * Initializes and captures query parameters from the active window URL.
 * Call this on page mount or in the root layout.
 */
export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};

  try {
    const params = new URLSearchParams(window.location.search);
    const existingRaw = window.sessionStorage.getItem(STORAGE_KEY);
    const existing: AttributionData = existingRaw ? JSON.parse(existingRaw) : {};

    const updated: AttributionData = {
      ...existing,
      utmSource: params.get('utm_source') || existing.utmSource,
      utmMedium: params.get('utm_medium') || existing.utmMedium,
      utmCampaign: params.get('utm_campaign') || existing.utmCampaign,
      utmTerm: params.get('utm_term') || existing.utmTerm,
      utmContent: params.get('utm_content') || existing.utmContent,
      gclid: params.get('gclid') || existing.gclid,
      fbclid: params.get('fbclid') || existing.fbclid,
      landingPage: existing.landingPage || window.location.pathname,
      referrer: existing.referrer || (document.referrer ? document.referrer.slice(0, 500) : undefined),
    };

    // Clean undefined keys
    const cleaned = Object.fromEntries(
      Object.entries(updated).filter(([_, v]) => v !== undefined && v !== ''),
    );

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch {
    return {};
  }
}

/**
 * Returns current attribution payload to attach to lead capture requests.
 */
export function getAttributionPayload(): AttributionData {
  if (typeof window === 'undefined') return {};

  try {
    // Re-check URL first in case user navigated directly with params
    const fresh = captureAttribution();
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const stored: AttributionData = raw ? JSON.parse(raw) : fresh;

    const visitId = window.sessionStorage.getItem('lv.visitId');
    if (visitId) {
      stored.visitId = visitId;
    }

    return stored;
  } catch {
    return {};
  }
}
