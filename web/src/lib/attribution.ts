import { SITE } from './site';

type Attribution = Record<string, string>;
let pending: Promise<string | undefined> | undefined;
let first: Attribution | undefined;
function storageGet(key: string) { try { return sessionStorage.getItem(key); } catch { return null; } }
function storageSet(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch {} }
function context(): Attribution {
  if (first) return first;
  const stored = storageGet('lv.attribution');
  if (stored) { try { first = JSON.parse(stored); if (first) return first; } catch {} }
  const params = new URLSearchParams(window.location.search);
  first = { landingPage: window.location.pathname, referrer: document.referrer.slice(0,500) };
  for (const [key, query] of Object.entries({utmSource:'utm_source',utmMedium:'utm_medium',utmCampaign:'utm_campaign',utmTerm:'utm_term',utmContent:'utm_content',gclid:'gclid',fbclid:'fbclid'})) {
    const value = params.get(query); if (value) first[key] = value.slice(0,key.endsWith('clid') ? 300 : 200);
  }
  storageSet('lv.attribution',JSON.stringify(first));
  return first;
}
export function trackVisit(): Promise<string | undefined> {
  if (typeof window === 'undefined') return Promise.resolve(undefined);
  if (!SITE.leadCaptureUrl) return Promise.resolve(undefined);
  if (pending) return pending;
  const existing = storageGet('lv.visitId');
  if (existing) return Promise.resolve(existing);
  const attribution = context();
  const sessionId = storageGet('lv.sessionId') || crypto.randomUUID();
  storageSet('lv.sessionId',sessionId);
  let visitorId = sessionId;
  try { visitorId = localStorage.getItem('lv.visitorId') || crypto.randomUUID(); localStorage.setItem('lv.visitorId', visitorId); } catch {}
  const { landingPage, ...fields } = attribution;
  pending = fetch(SITE.leadCaptureUrl.replace(/\/leads\/capture\/?$/, '/visits'), {
    method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(8000),
    body:JSON.stringify({visitorId,sessionId,pagePath:landingPage,...fields}),
  }).then(async response => {
    if (!response.ok) return undefined;
    const body = await response.json();
    if (typeof body.visitId === 'string') { storageSet('lv.visitId',body.visitId); return body.visitId; }
    return undefined;
  }).catch(() => undefined);
  return pending;
}
export async function captureContext() {
  const fields = context();
  // Do not make a slow beacon prevent an enquiry from being submitted.
  const visitId = await Promise.race([trackVisit(), new Promise<undefined>(resolve => setTimeout(resolve,800))]);
  return {...fields,...(visitId ? {visitId} : {}), source: fields.gclid ? 'GOOGLE_ADS' : fields.fbclid ? 'META_ADS' : 'WEBSITE'};
}
