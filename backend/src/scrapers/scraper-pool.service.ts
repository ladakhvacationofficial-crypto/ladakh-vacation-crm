import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations/integrations.service';
import { VendorType } from '@prisma/client';

export interface ExtractedRoomCategory {
  name: string;
  maxOccupancy?: number;
  bedType?: string;
  extraBedRate?: number;
  childRate?: number;
  mealPlans?: string[];
  notes?: string;
}

export interface ExtractedPropertyResult {
  sourceProvider: string;
  sourceUrl: string;
  name: string;
  city: string | null;
  propertyType: VendorType;
  phone: string | null;
  email: string | null;
  address: string | null;
  starRating: number | null;
  roomCount: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  roomCategories: ExtractedRoomCategory[];
  seasonalFrom: Date | null;
  seasonalTo: Date | null;
  reportedAmenities: string[];
  rawPayload: Record<string, unknown>;
  warnings?: string[];
  matchedSettlement?: string | null;
  matchedValley?: string | null;
  altitudeMeters?: number | null;
  confidence?: number;
}

export interface UrlQualificationResult {
  qualified: boolean;
  reason?: string;
  domainType?: 'direct_property' | 'deep_ota';
}

/**
 * High-precision URL qualification engine.
 * Filters out search portals, social networks, travel blogs, directories,
 * and OTA aggregate listing/search homepages.
 * Strictly admits only direct property websites and deep, single-property review pages.
 */
export function isQualifiedPropertyUrl(rawUrl: string): UrlQualificationResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { qualified: false, reason: 'Invalid URL format' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  // 0. Static assets, media files, image CDNs, tracking URLs
  if (
    /\.(png|jpe?g|gif|webp|svg|ico|pdf|css|js|woff2?|mp4|mov|avi|zip|tar|gz)(?:[?#]|$)/i.test(parsed.pathname) ||
    /\.(png|jpe?g|gif|webp|svg|ico|pdf)(?:[?#]|$)/i.test(rawUrl)
  ) {
    return { qualified: false, reason: `Static asset or media file URL: ${pathname}` };
  }

  const cdnAndTrackerPatterns = [
    'fbcdn.net',
    'akamaihd.net',
    'cloudfront.net',
    'googleusercontent.com',
    'tacdn.com',
    'cloudinary.com',
    'imgix.net',
    'twimg.com',
    'licdn.com',
    'ojrq.net',
    'omguk.com',
    'doubleclick.net',
    'adnxs.com',
    'adroll.com',
    'criteo.com',
    'awstrack.me',
    'trustpilot.com',
    'tripadvisor.mediacdn.',
    'ytimg.com',
    'ggpht.com',
  ];
  if (cdnAndTrackerPatterns.some((pattern) => hostname.includes(pattern))) {
    return { qualified: false, reason: `CDN, media host, or tracking redirector: ${hostname}` };
  }

  // 1. Social networks, video portals, forums, search engines
  const blacklistedDomains = [
    'facebook.com',
    'instagram.com',
    'youtube.com',
    'youtu.be',
    'twitter.com',
    'x.com',
    'pinterest.com',
    'reddit.com',
    'quora.com',
    'wikipedia.org',
    'tiktok.com',
    'linkedin.com',
    'google.com',
    'bing.com',
    'duckduckgo.com',
    'yahoo.com',
    'medium.com',
  ];
  if (blacklistedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return { qualified: false, reason: `Disallowed social/search domain: ${hostname}` };
  }

  // 2. Generic directory portals or government registries without direct property booking/tariffs
  const directoryDomains = [
    'justdial.com',
    'indiamart.com',
    'sulekha.com',
    'nidhi.tourism.gov.in',
    'ladakh.gov.in',
    'leh.nic.in',
  ];
  if (directoryDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return { qualified: false, reason: `Generic directory portal: ${hostname}` };
  }

  // 3. Travel blogs, package tour operators, guide listicles
  const travelBlogDomains = [
    'cntraveller.in',
    'outlookindia.com',
    'traveldiaryparnashree.com',
    'tibettravel.org',
    'mytriphack.com',
    'banbanjara.com',
    'sotc.in',
    'thomascook.in',
    'thrillophilia.com',
    'holidify.com',
    'tourmyindia.com',
    'tripcrafters.com',
    'lehladakhtaxis.com',
    'unwindoutdoor.com',
    'bruisedpassports.com',
    'atlasobscura.com',
    'luxuryescapes.com',
  ];
  if (travelBlogDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return { qualified: false, reason: `Travel blog or package tour portal: ${hostname}` };
  }

  // 4. OTAs / Aggregators: Allow ONLY deep single-property detail pages
  const aggregators: Record<string, RegExp> = {
    'tripadvisor.': /\/hotel_review-g\d+-d\d+/i,
    'booking.com': /\/hotel\/[a-z]{2}\/[a-z0-9_-]+\.html/i,
    'makemytrip': /\/hotels\/[a-z0-9_-]+-details-[a-z0-9_-]+\.html/i,
    'goibibo.com': /\/hotels\/[a-z0-9_-]+-hotel-in-[a-z0-9_-]+-\d+/i,
    'agoda.com': /\/[a-z0-9_-]+\/hotel\/[a-z0-9_-]+\.html/i,
    'easemytrip.com': /\/hotels\/[a-z0-9_-]+-\d+\/?$/i,
  };

  for (const [aggKey, detailPattern] of Object.entries(aggregators)) {
    if (hostname.includes(aggKey)) {
      if (detailPattern.test(pathname)) {
        return { qualified: true, domainType: 'deep_ota' };
      }
      return { qualified: false, reason: `Generic aggregator listing/search page on ${hostname}` };
    }
  }

  // Other known aggregators with no direct single-property extraction support
  const rejectedAggregators = [
    'expedia.',
    'hotels.com',
    'travelocity.',
    'trivago.',
    'trip.com',
    'kayak.',
    'airbnb.',
    'hostelworld.',
    'yatra.com',
  ];
  for (const agg of rejectedAggregators) {
    if (hostname.includes(agg)) {
      return { qualified: false, reason: `Aggregator portal not supported: ${hostname}` };
    }
  }

  // 5. Tour itineraries, package bookings, car rental, blog articles
  if (
    /\/(?:tour|tours|package|packages|itinerary|itineraries|package-tours|travel-guide|sightseeing|places-to-visit|blog|blogs|articles|trips)\//i.test(
      pathname,
    ) ||
    /-(?:tour|tours|package|packages|itinerary|trips)-in-/i.test(pathname)
  ) {
    return { qualified: false, reason: `Tour package or blog article URL: ${pathname}` };
  }

  // Direct hotel / camp / houseboat website!
  return { qualified: true, domainType: 'direct_property' };
}

// ── Ladakh Settlement Gazetteer & Valley Geography ────────────────────────────

export interface SettlementEntry {
  settlement: string;
  valley: 'Nubra' | 'Pangong' | 'Leh' | 'Changthang' | 'Zanskar' | 'Kargil' | 'Sham Valley' | 'Srinagar';
  canonicalCity: string;
  keywords: string[];
  defaultPropertyType?: VendorType;
  altitudeM?: number;
}

export const LADAKH_SETTLEMENT_GAZETTEER: SettlementEntry[] = [
  // ── Nubra Valley (North of Khardung La, Shayok & Siachen Rivers) ──
  {
    settlement: 'Hunder',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['hunder', 'hundar', 'hunder sand dunes', 'hundur', 'double hump camel'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 3048,
  },
  {
    settlement: 'Diskit',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['diskit', 'deskit', 'diskit monastery', 'diskit gompa'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3144,
  },
  {
    settlement: 'Sumur',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['sumur', 'sumoor', 'samstanling'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 3096,
  },
  {
    settlement: 'Panamik',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['panamik', 'panamick', 'panamik hot springs'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3183,
  },
  {
    settlement: 'Turtuk',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['turtuk', 'tyakshi', 'thang', 'balti village'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 2800,
  },
  {
    settlement: 'Kyagar & Tegar',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['kyagar', 'tegar', 'tiger village'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 3100,
  },
  {
    settlement: 'Tirith & Pinchimik',
    valley: 'Nubra',
    canonicalCity: 'Nubra',
    keywords: ['tirith', 'pinchimik', 'warshi', 'bogdang', 'baqdang'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 3100,
  },

  // ── Pangong Tso & Changthang North (East of Chang La) ──
  {
    settlement: 'Spangmik',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['spangmik', 'spangmic', 'pangong lake shore', 'pangong tso shore'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 4250,
  },
  {
    settlement: 'Lukung',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['lukung', 'lukun', 'pangong entrance'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 4250,
  },
  {
    settlement: 'Man Village',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['man village', 'maan village', 'man pangong'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 4260,
  },
  {
    settlement: 'Merak',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['merak', 'merak village'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 4270,
  },
  {
    settlement: 'Tangtse & Durbuk',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['tangtse', 'tangste', 'durbuk', 'darbuk'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3950,
  },
  {
    settlement: 'Chushul & Tsaga',
    valley: 'Pangong',
    canonicalCity: 'Pangong',
    keywords: ['chushul', 'tsaga', 'tsaga la'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 4350,
  },

  // ── High Changthang (Tso Moriri, Hanle, Chumathang) ──
  {
    settlement: 'Hanle',
    valley: 'Changthang',
    canonicalCity: 'Leh',
    keywords: ['hanle', 'anlay', 'hanley', 'dark sky reserve', 'astronomical observatory'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 4500,
  },
  {
    settlement: 'Korzok (Tso Moriri)',
    valley: 'Changthang',
    canonicalCity: 'Leh',
    keywords: ['korzok', 'karzok', 'tso moriri', 'tsomoriri'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 4530,
  },
  {
    settlement: 'Chumathang & Nyoma',
    valley: 'Changthang',
    canonicalCity: 'Leh',
    keywords: ['chumathang', 'nyoma', 'mahe', 'puga'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 4050,
  },

  // ── Zanskar (Across Pensi La / Shingo La) ──
  {
    settlement: 'Padum',
    valley: 'Zanskar',
    canonicalCity: 'Zanskar',
    keywords: ['padum', 'padam', 'zanskar valley', 'karsha', 'zangla', 'stongde', 'sani'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3669,
  },
  {
    settlement: 'Rangdum',
    valley: 'Zanskar',
    canonicalCity: 'Zanskar',
    keywords: ['rangdum', 'rangdum gompa', 'suru zanskar'],
    defaultPropertyType: VendorType.CAMP,
    altitudeM: 3657,
  },

  // ── Kargil & Suru Valley ──
  {
    settlement: 'Kargil Town',
    valley: 'Kargil',
    canonicalCity: 'Kargil',
    keywords: ['kargil', 'baroo', 'bimbat', 'suru valley', 'sankoo', 'panikhar', 'mulbekh'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 2676,
  },
  {
    settlement: 'Drass',
    valley: 'Kargil',
    canonicalCity: 'Kargil',
    keywords: ['drass', 'dras', 'drass war memorial'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3280,
  },

  // ── Sham Valley (Lower Ladakh / Indus West) ──
  {
    settlement: 'Sham Valley (Alchi / Likir / Uleytokpo / Lamayuru)',
    valley: 'Sham Valley',
    canonicalCity: 'Leh',
    keywords: ['alchi', 'likir', 'lamayuru', 'uleytokpo', 'uley tokpo', 'tingmosgang', 'nimmu', 'nimo', 'basgo', 'khaltse', 'nurla', 'skurbuchan'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3100,
  },

  // ── Leh Town & Upper Indus (Acclimatization Hubs) ──
  {
    settlement: 'Leh Town & Environs',
    valley: 'Leh',
    canonicalCity: 'Leh',
    keywords: ['leh town', 'sheynam', 'fort road', 'choglamsar', 'saboo', 'shey', 'thiksey', 'stok', 'phyang', 'spituk', 'chushot', 'sankar', 'changspa', 'skara', 'upper karzoo'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 3524,
  },

  // ── Kashmir Valley (Srinagar, Gulmarg, Pahalgam, Sonamarg) ──
  {
    settlement: 'Srinagar (Dal Lake / Nigeen Lake)',
    valley: 'Srinagar',
    canonicalCity: 'Srinagar',
    keywords: ['dal lake', 'nigeen lake', 'boulevard road', 'srinagar', 'shikara', 'houseboat ghat', 'rajbagh', 'lal chowk', 'dalgate'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 1585,
  },
  {
    settlement: 'Gulmarg',
    valley: 'Srinagar',
    canonicalCity: 'Srinagar',
    keywords: ['gulmarg', 'tangmarg'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 2650,
  },
  {
    settlement: 'Pahalgam',
    valley: 'Srinagar',
    canonicalCity: 'Srinagar',
    keywords: ['pahalgam', 'aru valley', 'betaab valley', 'baisaran'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 2130,
  },
  {
    settlement: 'Sonamarg',
    valley: 'Srinagar',
    canonicalCity: 'Srinagar',
    keywords: ['sonamarg', 'sonmarg', 'thajiwas'],
    defaultPropertyType: VendorType.HOTEL,
    altitudeM: 2740,
  },
];

export function resolveSettlementAndValley(
  text: string,
  url: string,
  title?: string,
  optionsCity?: string,
): {
  settlement: string | null;
  valley: string | null;
  canonicalCity: string;
  confidence: number;
  altitudeMeters?: number;
  defaultPropertyType?: VendorType;
} {
  const normText = (text || '').toLowerCase();
  const normUrl = (url || '').toLowerCase();
  const normTitle = (title || '').toLowerCase();

  // Strip transit / distance references to Leh so "120 km from Leh airport" doesn't falsely vote Leh
  const sanitizedText = normText.replace(
    /(?:\d+\s*(?:km|kms|hours?|hrs?)\s*(?:from|to|away from)\s*leh|drive\s*(?:from|to)\s*leh|airport\s*(?:in|at)?\s*leh|leh\s*(?:airport|highway|manali|srinagar)|reach\s*leh|over\s*khardung\s*la\s*from\s*leh)/gi,
    ' ',
  );

  let bestEntry: SettlementEntry | null = null;
  let bestScore = 0;

  for (const entry of LADAKH_SETTLEMENT_GAZETTEER) {
    let score = 0;

    for (const kw of entry.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');

      // 1. URL match
      if (normUrl.includes(kw.replace(/\s+/g, '-')) || normUrl.includes(kw.replace(/\s+/g, ''))) {
        score += 45;
      }

      // 2. Title / Heading match
      if (wordRegex.test(normTitle)) {
        score += 35;
      }

      // 3. Body text match
      const textMatches = sanitizedText.match(new RegExp(`\\b${escaped}\\b`, 'gi'));
      if (textMatches && textMatches.length > 0) {
        score += Math.min(textMatches.length * 10, 30);
      }
    }

    // Direct Valley name bonus
    if (entry.valley !== 'Leh' && new RegExp(`\\b${entry.valley.toLowerCase()}\\b`, 'i').test(sanitizedText + ' ' + normTitle)) {
      score += 15;
    }

    // Match with user's optional city hint
    if (optionsCity && entry.canonicalCity.toLowerCase() === optionsCity.toLowerCase()) {
      score += 25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // If a high-confidence outer settlement was detected (Hunder, Spangmik, Turtuk, etc.)
  if (bestEntry && bestScore >= 20) {
    const confidence = Math.min(1, Math.round((bestScore / 80) * 100) / 100);
    return {
      settlement: bestEntry.settlement,
      valley: bestEntry.valley,
      canonicalCity: bestEntry.canonicalCity,
      confidence: Math.max(0.6, confidence),
      altitudeMeters: bestEntry.altitudeM,
      defaultPropertyType: bestEntry.defaultPropertyType,
    };
  }

  // Fallbacks:
  if (optionsCity) {
    const match = LADAKH_SETTLEMENT_GAZETTEER.find(
      (e) => e.canonicalCity.toLowerCase() === optionsCity.toLowerCase(),
    );
    return {
      settlement: match?.settlement ?? null,
      valley: match?.valley ?? optionsCity,
      canonicalCity: optionsCity,
      confidence: 0.5,
      altitudeMeters: match?.altitudeM,
      defaultPropertyType: match?.defaultPropertyType,
    };
  }

  // Check generic presence of Leh vs Srinagar
  if (/\b(?:srinagar|dal lake|nigeen)\b/i.test(normText + ' ' + normUrl)) {
    return {
      settlement: 'Srinagar (Dal Lake / Nigeen Lake)',
      valley: 'Srinagar',
      canonicalCity: 'Srinagar',
      confidence: 0.5,
      altitudeMeters: 1585,
    };
  }

  if (/\b(?:nubra|hunder|diskit)\b/i.test(normText + ' ' + normUrl)) {
    return {
      settlement: 'Hunder',
      valley: 'Nubra',
      canonicalCity: 'Nubra',
      confidence: 0.6,
      altitudeMeters: 3048,
      defaultPropertyType: VendorType.CAMP,
    };
  }

  if (/\b(?:pangong|spangmik)\b/i.test(normText + ' ' + normUrl)) {
    return {
      settlement: 'Spangmik',
      valley: 'Pangong',
      canonicalCity: 'Pangong',
      confidence: 0.6,
      altitudeMeters: 4250,
      defaultPropertyType: VendorType.CAMP,
    };
  }

  // Default to Leh Town
  return {
    settlement: 'Leh Town & Environs',
    valley: 'Leh',
    canonicalCity: 'Leh',
    confidence: 0.4,
    altitudeMeters: 3524,
    defaultPropertyType: VendorType.HOTEL,
  };
}

export function resolvePropertyType(
  name: string,
  text: string,
  url: string,
  resolvedCity: string,
  optionsPropertyType?: string,
): VendorType {
  const normName = (name || '').toLowerCase();
  const normUrl = (url || '').toLowerCase();
  const normText = (text || '').toLowerCase();

  // If user explicitly provided a property type, respect it unless it is HOUSEBOAT in Ladakh
  if (optionsPropertyType && Object.values(VendorType).includes(optionsPropertyType as VendorType)) {
    const chosen = optionsPropertyType as VendorType;
    if (chosen === VendorType.HOUSEBOAT && resolvedCity !== 'Srinagar') {
      // Prohibited: No houseboats in Ladakh!
      return /camp|tent|glamping/i.test(normName) ? VendorType.CAMP : VendorType.HOTEL;
    }
    return chosen;
  }

  // 1. Camps & Luxury Tents (checked BEFORE houseboat!)
  if (
    /camp|tents|glamping|campsite|resort & camp|luxury tent/i.test(normName) ||
    /camp|glamping/i.test(normUrl) ||
    (resolvedCity === 'Pangong' && /tent|camp/i.test(normText)) ||
    (resolvedCity === 'Nubra' && /sand dunes|luxury camp|tents/i.test(normText) && !/grand hotel/i.test(normName))
  ) {
    return VendorType.CAMP;
  }

  // 2. Houseboats: Strictly restricted to Srinagar and explicitly in name/url
  if (
    resolvedCity === 'Srinagar' &&
    (/houseboat|shikara/i.test(normName) || /houseboat/i.test(normUrl))
  ) {
    return VendorType.HOUSEBOAT;
  }

  // Default
  return VendorType.HOTEL;
}

@Injectable()
export class ScraperPoolService {
  private readonly logger = new Logger(ScraperPoolService.name);

  constructor(private readonly integrations: IntegrationsService) {}

  /**
   * Scrapes property operational specs and bed-wise pricing variants from a URL.
   * Employs priority failover: tries highest-priority active SCRAPING integration,
   * falling over to subsequent providers if quotas or rate limits are reached.
   */
  async extractProperty(
    url: string,
    options?: { preferredProvider?: string; city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const qualCheck = isQualifiedPropertyUrl(url);
    if (!qualCheck.qualified) {
      throw new Error(`Disqualified URL: ${qualCheck.reason}`);
    }

    const activeScrapers = await this.integrations.listActiveScrapers();
    const warnings: string[] = [];

    // Sort providers: preferred first, then by priority DESC
    let sortedScrapers = [...activeScrapers];
    if (options?.preferredProvider) {
      const idx = sortedScrapers.findIndex((s) => s.provider === options.preferredProvider);
      if (idx > -1) {
        const [preferred] = sortedScrapers.splice(idx, 1);
        sortedScrapers.unshift(preferred);
      }
    }

    // Try each active scraper in failover sequence
    for (const scraper of sortedScrapers) {
      try {
        this.logger.log(`Attempting extraction of "${url}" using provider "${scraper.provider}" (priority ${scraper.priority})`);
        const result = await this.executeProviderScrape(scraper.provider, scraper.credentials, url, options);
        if (result && result.name) {
          // If phone or email is missing on a direct property website, probe subpages
          if (qualCheck.domainType === 'direct_property' && (!result.phone || !result.email)) {
            const probed = await this.probeContactInfo(url, result.phone, result.email);
            if (!result.phone && probed.phone) result.phone = probed.phone;
            if (!result.email && probed.email) result.email = probed.email;
          }
          result.warnings = warnings;
          return result;
        }
      } catch (err: any) {
        const msg = `Provider "${scraper.provider}" failed for "${url}": ${err?.message ?? String(err)}`;
        this.logger.warn(msg);
        warnings.push(msg);
      }
    }

    // If all configured scrapers fail (or none active), use public Jina Reader fallback
    try {
      this.logger.log(`Falling back to public Jina Reader for "${url}"`);
      const fallbackResult = await this.scrapeWithJina(url, { baseUrl: 'https://r.jina.ai' }, options);
      if (fallbackResult && fallbackResult.name) {
        if (qualCheck.domainType === 'direct_property' && (!fallbackResult.phone || !fallbackResult.email)) {
          const probed = await this.probeContactInfo(url, fallbackResult.phone, fallbackResult.email);
          if (!fallbackResult.phone && probed.phone) fallbackResult.phone = probed.phone;
          if (!fallbackResult.email && probed.email) fallbackResult.email = probed.email;
        }
        fallbackResult.warnings = warnings;
        return fallbackResult;
      }
    } catch (err: any) {
      warnings.push(`Public Jina fallback error: ${err?.message ?? String(err)}`);
    }

    // Final fallback: direct HTTP fetch + heuristic extraction
    this.logger.log(`Attempting direct heuristic fetch for "${url}"`);
    const directResult = await this.scrapeDirectFetch(url, options);
    if (qualCheck.domainType === 'direct_property' && (!directResult.phone || !directResult.email)) {
      const probed = await this.probeContactInfo(url, directResult.phone, directResult.email);
      if (!directResult.phone && probed.phone) directResult.phone = probed.phone;
      if (!directResult.email && probed.email) directResult.email = probed.email;
    }
    directResult.warnings = warnings;
    return directResult;
  }

  /**
   * Concurrency swarm: extracts multiple URLs concurrently across the scraper pool.
   * Pre-filters each URL through the qualification engine.
   */
  async batchExtract(
    urls: string[],
    options?: { city?: string; propertyType?: string; concurrency?: number },
  ): Promise<Array<{ url: string; success: boolean; data?: ExtractedPropertyResult; error?: string }>> {
    const limit = Math.max(1, Math.min(options?.concurrency ?? 2, 5));
    const results: Array<{ url: string; success: boolean; data?: ExtractedPropertyResult; error?: string }> = [];

    // Pre-qualify URLs
    const qualifiedTargets: string[] = [];
    for (const u of urls) {
      const q = isQualifiedPropertyUrl(u);
      if (!q.qualified) {
        results.push({ url: u, success: false, error: q.reason || 'Unqualified URL' });
      } else {
        qualifiedTargets.push(u);
      }
    }

    for (let i = 0; i < qualifiedTargets.length; i += limit) {
      const chunk = qualifiedTargets.slice(i, i + limit);
      const chunkResults = await Promise.allSettled(
        chunk.map((u) => this.extractProperty(u, options)),
      );

      chunkResults.forEach((res, idx) => {
        const targetUrl = chunk[idx];
        if (res.status === 'fulfilled') {
          results.push({ url: targetUrl, success: true, data: res.value });
        } else {
          results.push({ url: targetUrl, success: false, error: res.reason?.message ?? String(res.reason) });
        }
      });
    }

    return results;
  }

  /**
   * Discovers property URLs matching a destination query (e.g. "Srinagar houseboats" or "Nubra luxury camps")
   * using precision search operators and domain qualification filters.
   */
  async discoverByKeyword(
    query: string,
    options?: { city?: string; propertyType?: string; limit?: number },
  ): Promise<Array<{ url: string; success: boolean; data?: ExtractedPropertyResult; error?: string }>> {
    const limit = Math.max(1, Math.min(options?.limit ?? 5, 15));
    const discoveredUrls: string[] = [];
    const activeScrapers = await this.integrations.listActiveScrapers();

    const isLadakhQuery =
      /nubra|pangong|leh|zanskar|kargil|ladakh|hunder|diskit|spangmik|sham valley|changthang/i.test(
        `${query} ${options?.city || ''}`,
      );
    const isHouseboatQuery = /houseboat|shikara/i.test(query);

    // Negative operators: exclude houseboats and Kashmir cross-promotions when querying Ladakh
    const negativeOperators =
      isLadakhQuery && !isHouseboatQuery
        ? '-houseboat -houseboats -kashmir -srinagar'
        : '';

    const propertyTerms = isLadakhQuery
      ? options?.propertyType === 'CAMP' || /camp/i.test(query)
        ? 'camp OR resort OR "luxury tents"'
        : 'hotel OR resort OR camp'
      : isHouseboatQuery
      ? 'houseboat OR shikara'
      : 'hotel OR resort OR camp OR houseboat';

    // 1. Try Firecrawl search with negative operators & targeted query
    const firecrawl = activeScrapers.find((s) => s.provider === 'firecrawl');
    if (firecrawl) {
      try {
        const apiKey = String(firecrawl.credentials?.apiKey ?? '').trim();
        const base = String(firecrawl.credentials?.baseUrl ?? 'https://api.firecrawl.dev').trim().replace(/\/+$/, '');
        
        // Primary query targeting direct hospitality properties
        const primaryTarget = `${query} (${propertyTerms}) "official website" OR "contact" OR "tariff" ${negativeOperators} -site:facebook.com -site:instagram.com -site:youtube.com -site:pinterest.com -site:reddit.com -site:quora.com -site:expedia.com -site:travelocity.com -site:trivago.com -site:trip.com -site:hotels.com -site:cntraveller.in -site:justdial.com -inurl:search -inurl:login -inurl:tours -inurl:packages -inurl:itinerary`.trim();
        
        const res = await fetch(`${base}/v1/search`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: primaryTarget, limit: Math.min(limit * 2, 20) }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const items = data?.data || data?.results || [];
          for (const item of items) {
            if (item.url) {
              if (isLadakhQuery && !isHouseboatQuery && /houseboat/i.test(item.url)) {
                continue;
              }
              const q = isQualifiedPropertyUrl(item.url);
              if (q.qualified && !discoveredUrls.includes(item.url)) {
                discoveredUrls.push(item.url);
                if (discoveredUrls.length >= limit) break;
              }
            }
          }
        }

        // Secondary search if we still need more candidates: check deep review URLs
        if (discoveredUrls.length < limit) {
          const secondaryTarget = `${query} ${negativeOperators} site:tripadvisor.in/Hotel_Review OR site:makemytrip.com/hotels`.trim();
          const secRes = await fetch(`${base}/v1/search`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: secondaryTarget, limit: 10 }),
          });
          if (secRes.ok) {
            const secData: any = await secRes.json();
            const items = secData?.data || secData?.results || [];
            for (const item of items) {
              if (item.url) {
                if (isLadakhQuery && !isHouseboatQuery && /houseboat/i.test(item.url)) {
                  continue;
                }
                const q = isQualifiedPropertyUrl(item.url);
                if (q.qualified && !discoveredUrls.includes(item.url)) {
                  discoveredUrls.push(item.url);
                  if (discoveredUrls.length >= limit) break;
                }
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Firecrawl keyword search error: ${err?.message}`);
      }
    }

    // 2. Try Jina Search (s.jina.ai/{query}) as free discovery fallback
    if (discoveredUrls.length < limit) {
      try {
        const jina = activeScrapers.find((s) => s.provider === 'jina');
        const headers: Record<string, string> = { Accept: 'text/plain' };
        if (jina?.credentials?.apiKey) {
          headers['Authorization'] = `Bearer ${String(jina.credentials.apiKey).trim()}`;
        }
        const jinaQuery = `${query} ${propertyTerms} contact ${negativeOperators}`.trim();
        const res = await fetch(`https://s.jina.ai/${encodeURIComponent(jinaQuery)}`, { headers });
        if (res.ok) {
          const markdown = await res.text();
          // Match markdown links [text](url) while strictly ignoring image embeds ![alt](url)
          const matches = markdown.matchAll(/(?<!!)\[(?:[^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g);
          for (const m of matches) {
            const u = m[1];
            if (!u || discoveredUrls.includes(u)) continue;
            if (isLadakhQuery && !isHouseboatQuery && /houseboat/i.test(u)) {
              continue;
            }
            const q = isQualifiedPropertyUrl(u);
            if (q.qualified && !discoveredUrls.includes(u)) {
              discoveredUrls.push(u);
              if (discoveredUrls.length >= limit) break;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Jina keyword search error: ${err?.message}`);
      }
    }

    if (discoveredUrls.length === 0) {
      throw new Error(`No qualified property websites found for query "${query}". Try searching for specific names or direct URLs.`);
    }

    this.logger.log(`Discovered ${discoveredUrls.length} qualified properties for query "${query}". Extracting via swarm...`);
    return this.batchExtract(discoveredUrls.slice(0, limit), options);
  }

  /**
   * Probes common contact and tariff subpages on a direct property website to fill missing phone/email.
   */
  private async probeContactInfo(
    url: string,
    currentPhone?: string | null,
    currentEmail?: string | null,
  ): Promise<{ phone: string | null; email: string | null }> {
    let phone = currentPhone || null;
    let email = currentEmail || null;

    if (phone && email) return { phone, email };

    try {
      const parsed = new URL(url);
      const origin = parsed.origin;
      const candidates = [
        `${origin}/contact-us`,
        `${origin}/contact`,
        `${origin}/contact-us.html`,
        `${origin}/contact.html`,
        `${origin}/tariff`,
      ];

      for (const target of candidates) {
        if (target.toLowerCase() === url.toLowerCase()) continue;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(target, {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              Accept: 'text/html,text/plain',
            },
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const html = await res.text();
            if (!email) {
              const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
              if (emailMatches) {
                const validEmail = emailMatches.find(
                  (e) => !/example\.com|domain\.com|wixpress|sentry|bootstrap/i.test(e),
                );
                if (validEmail) email = validEmail.trim().toLowerCase();
              }
            }
            if (!phone) {
              const phoneMatches = html.match(/(?:\+?91[\-\s]?)?[6-9]\d{9}|(?:01982|0194|01985)[\-\s]?\d{5,6}/g);
              if (phoneMatches && phoneMatches.length > 0) {
                phone = phoneMatches[0].trim();
              }
            }
            if (phone && email) break;
          }
        } catch {
          // Probe timeout or network error, silently continue
        }
      }
    } catch {
      // Invalid URL
    }

    return { phone, email };
  }

  // ── Provider Execution Driver ──────────────────────────────────────────────

  private async executeProviderScrape(
    provider: string,
    creds: Record<string, unknown>,
    url: string,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    switch (provider) {
      case 'firecrawl':
        return this.scrapeWithFirecrawl(url, creds, options);
      case 'jina':
        return this.scrapeWithJina(url, creds, options);
      case 'scrape_do':
        return this.scrapeWithScrapeDo(url, creds, options);
      case 'crawl4ai':
        return this.scrapeWithCrawl4AI(url, creds, options);
      case 'tinyfish':
        return this.scrapeWithTinyFish(url, creds, options);
      default:
        throw new Error(`Unsupported scraping provider: ${provider}`);
    }
  }

  // ── Firecrawl Provider ─────────────────────────────────────────────────────

  private async scrapeWithFirecrawl(
    url: string,
    creds: Record<string, unknown>,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const apiKey = String(creds?.apiKey ?? '').trim();
    if (!apiKey) throw new Error('Missing Firecrawl API Key');
    const base = String(creds?.baseUrl ?? 'https://api.firecrawl.dev').trim().replace(/\/+$/, '');

    const response = await fetch(`${base}/v1/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'extract'],
        extract: {
          prompt:
            'Extract single-property operational details into JSON: isSingleProperty (boolean: MUST be false if page describes multiple hotels, tour packages, or blog listicle), refusalReason (if isSingleProperty is false), name, settlement (e.g. Hunder, Diskit, Spangmik, Leh Town, Dal Lake), valley (Nubra, Pangong, Leh, Zanskar, Kargil, Srinagar), city (Leh, Nubra, Pangong, Srinagar, Kargil, Zanskar), propertyType (HOTEL, CAMP, or HOUSEBOAT - NOTE: houseboats exist ONLY in Srinagar; camps in Nubra/Pangong are CAMP), phone, email, address, starRating, roomCount, checkInTime, checkOutTime, roomCategories (array with name, maxOccupancy, bedType, extraBedRate, childRate, mealPlans), seasonalFrom, seasonalTo, reportedAmenities.',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Firecrawl HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const payload: any = await response.json();
    const extractedData = payload?.data?.extract ?? payload?.extract ?? {};
    const markdown = payload?.data?.markdown ?? payload?.markdown ?? '';

    // If structured extraction identified a multi-property listing or blog, refuse immediately
    if (extractedData.isSingleProperty === false) {
      throw new Error(`Refused: ${extractedData.refusalReason || 'Page describes a listicle or directory, not a single bookable property'}`);
    }

    // If structured extraction was empty, parse from markdown; if both empty, failover to next provider
    if (!extractedData.name) {
      if (markdown) {
        return this.parseContentWithAIOrHeuristics(markdown, url, 'firecrawl', payload, options);
      }
      throw new Error('Firecrawl returned empty extraction and no markdown content');
    }

    // Complement extractedData with regex parsing from markdown if phone or email is missing
    if (markdown) {
      if (!extractedData.phone) {
        const phoneMatch = markdown.match(/(?:\+?91[\-\s]?)?[6-9]\d{9}|(?:01982|0194|01985)[\-\s]?\d{5,6}/);
        if (phoneMatch) extractedData.phone = phoneMatch[0].trim();
      }
      if (!extractedData.email || extractedData.email === '/') {
        const emailMatch = markdown.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) extractedData.email = emailMatch[0].trim();
      }
    }

    return this.normalizePropertyResult(extractedData, url, 'firecrawl', payload, options);
  }

  // ── Jina Reader Provider ───────────────────────────────────────────────────

  private async scrapeWithJina(
    url: string,
    creds: Record<string, unknown>,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const base = String(creds?.baseUrl ?? 'https://r.jina.ai').trim().replace(/\/+$/, '');
    const headers: Record<string, string> = {
      Accept: 'text/plain',
      'X-Target-Selector': 'body',
    };
    if (creds?.apiKey) {
      headers['Authorization'] = `Bearer ${String(creds.apiKey).trim()}`;
    }

    const target = `${base}/${url}`;
    const response = await fetch(target, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Jina Reader HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const markdown = await response.text();
    return this.parseContentWithAIOrHeuristics(markdown, url, 'jina', { jinaUrl: target }, options);
  }

  // ── scrape.do Provider ─────────────────────────────────────────────────────

  private async scrapeWithScrapeDo(
    url: string,
    creds: Record<string, unknown>,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const token = String(creds?.token ?? '').trim();
    if (!token) throw new Error('Missing scrape.do token');
    const base = String(creds?.baseUrl ?? 'https://api.scrape.do').trim().replace(/\/+$/, '');

    const target = `${base}/?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`;
    const response = await fetch(target);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`scrape.do HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const html = await response.text();
    const cleanText = this.stripHtml(html);
    return this.parseContentWithAIOrHeuristics(cleanText, url, 'scrape_do', { rawLength: html.length }, options);
  }

  // ── Crawl4AI Provider ─────────────────────────────────────────────────────

  private async scrapeWithCrawl4AI(
    url: string,
    creds: Record<string, unknown>,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const endpoint = String(creds?.endpointUrl ?? 'http://localhost:11235').trim().replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (creds?.apiToken) {
      headers['Authorization'] = `Bearer ${String(creds.apiToken).trim()}`;
    }

    const response = await fetch(`${endpoint}/crawl`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ urls: [url], priority: 10 }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Crawl4AI HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    const content = data?.results?.[0]?.markdown ?? data?.markdown ?? JSON.stringify(data);
    return this.parseContentWithAIOrHeuristics(content, url, 'crawl4ai', data, options);
  }

  // ── TinyFish Provider ─────────────────────────────────────────────────────

  private async scrapeWithTinyFish(
    url: string,
    creds: Record<string, unknown>,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const apiKey = String(creds?.apiKey ?? '').trim();
    if (!apiKey) throw new Error('Missing TinyFish API Key');
    const base = String(creds?.baseUrl ?? 'https://api.tinyfish.ai').trim().replace(/\/+$/, '');

    const response = await fetch(`${base}/v1/extract`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`TinyFish HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data: any = await response.json();
    return this.normalizePropertyResult(data, url, 'tinyfish', data, options);
  }

  // ── Direct Fetch Fallback ──────────────────────────────────────────────────

  private async scrapeDirectFetch(
    url: string,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Direct fetch HTTP ${response.status}`);
    }

    const html = await response.text();
    const text = this.stripHtml(html);
    return this.parseContentWithAIOrHeuristics(text, url, 'direct_fetch', { contentLength: html.length }, options);
  }

  // ── AI & Heuristic Parsing Engine ──────────────────────────────────────────

  private async parseContentWithAIOrHeuristics(
    rawText: string,
    url: string,
    provider: string,
    rawPayload: any,
    options?: { city?: string; propertyType?: string },
  ): Promise<ExtractedPropertyResult> {
    const textSample = rawText.slice(0, 15000);

    // Multi-provider AI extraction failover loop: try all active AI integrations in priority order
    const activeAIs = await this.integrations.listActiveAIs();
    for (const aiIntegration of activeAIs) {
      try {
        this.logger.log(`Attempting AI extraction via provider: ${aiIntegration.provider}`);
        const parsed = await this.extractWithAI(aiIntegration, textSample, url);
        if (parsed) {
          if (parsed.isSingleProperty === false) {
            throw new Error(`Refused: ${parsed.refusalReason || 'Disqualified multi-property listing or blog listicle'}`);
          }
          if (parsed.name) {
            this.logger.log(`Property successfully parsed by AI provider "${aiIntegration.provider}"`);
            return this.normalizePropertyResult(parsed, url, `${provider}+ai:${aiIntegration.provider}`, rawPayload, options);
          }
        }
      } catch (err: any) {
        if (err.message && err.message.startsWith('Refused:')) {
          throw err;
        }
        this.logger.warn(`AI provider "${aiIntegration.provider}" extraction failed (${err?.message}), trying next AI provider in failover pool...`);
      }
    }

    // Heuristic regex & rule-based parser fallback
    this.logger.log('No AI provider succeeded or none active; falling back to heuristic regex parser');
    return this.parseWithHeuristics(textSample, url, provider, rawPayload, options);
  }

  private async extractWithAI(
    aiIntegration: { provider: string; credentials: Record<string, unknown> },
    text: string,
    url: string,
  ): Promise<any> {
    const prompt = `You are a specialized hospitality intelligence parser for Ladakh and Kashmir tourism.
Examine this webpage content and extract single-property operational details.
Target URL: "${url}"

CRITICAL QUALIFICATION RULES:
1. "isSingleProperty": Set to TRUE only if this page describes ONE specific hotel, resort, luxury camp, or houseboat with its own specific rooms and contacts. Set to FALSE if this page is a listicle, directory ("Top 10 Camps in Nubra", "Best Hotels in Leh"), booking portal multi-property results page, tour package itinerary, travel blog, or multi-property portfolio.
2. "refusalReason": If isSingleProperty is false, explain why (e.g. "Listicle of 10 hotels in Nubra", "Tour package itinerary").
3. GEOGRAPHY: In Ladakh, properties are located in settlements such as:
   - Nubra Valley: Hunder, Diskit, Sumur, Panamik, Turtuk, Kyagar, Tegar, Tirith. (Canonical city: "Nubra")
   - Pangong Lake: Spangmik, Lukung, Man Village, Merak, Tangtse. (Canonical city: "Pangong")
   - Changthang / Tso Moriri / Hanle: Hanle, Korzok, Chumathang, Nyoma. (Canonical city: "Leh")
   - Zanskar: Padum, Karsha, Rangdum. (Canonical city: "Zanskar")
   - Kargil / Suru: Kargil Town, Drass, Sankoo. (Canonical city: "Kargil")
   - Sham Valley: Alchi, Likir, Lamayuru, Uleytokpo, Tingmosgang, Nimmu. (Canonical city: "Leh")
   - Leh Valley: Leh Town, Sheynam, Choglamsar, Saboo, Shey, Thiksey, Stok. (Canonical city: "Leh")
   - Kashmir: Srinagar (Dal Lake, Nigeen Lake), Gulmarg, Pahalgam, Sonamarg. (Canonical city: "Srinagar")
   Note: Many properties in Nubra or Pangong say "120 km from Leh Airport" or "Drive from Leh". Do NOT classify these as Leh! Classify them by their actual settlement and valley.
4. HOUSEBOATS: Houseboats ONLY exist in Srinagar (Dal Lake / Nigeen Lake). Under NO circumstances is a property in Nubra, Pangong, Leh, Zanskar, or Kargil a HOUSEBOAT. In Ladakh, tent/glamping accommodations are strictly "CAMP", and brick/mortar buildings are "HOTEL".

Webpage Content:
${text}

Return STRICTLY a JSON object with these keys:
{
  "isSingleProperty": boolean,
  "refusalReason": string or null,
  "name": string (Property name),
  "settlement": string or null (e.g. "Hunder", "Diskit", "Spangmik", "Leh Town", "Dal Lake"),
  "valley": string or null ("Nubra", "Pangong", "Leh", "Changthang", "Zanskar", "Kargil", "Sham Valley", "Srinagar"),
  "city": "Leh" | "Nubra" | "Pangong" | "Srinagar" | "Kargil" | "Zanskar",
  "propertyType": "HOTEL" | "CAMP" | "HOUSEBOAT",
  "phone": string or null,
  "email": string or null,
  "address": string or null,
  "starRating": number (1-5) or null,
  "roomCount": number or null,
  "checkInTime": string ("14:00") or null,
  "checkOutTime": string ("11:00") or null,
  "roomCategories": [
    {
      "name": string,
      "maxOccupancy": number,
      "bedType": string,
      "extraBedRate": number or null,
      "childRate": number or null,
      "mealPlans": string[]
    }
  ],
  "seasonalFrom": string ("YYYY-MM-DD") or null,
  "seasonalTo": string ("YYYY-MM-DD") or null,
  "reportedAmenities": string[]
}
Do NOT include live OTA room prices. Only bed-wise specs, occupancy, and operating parameters.`;

    const apiKey = String(aiIntegration.credentials?.apiKey ?? '').trim();
    if (!apiKey) return null;

    // 1. Google Gemini
    if (aiIntegration.provider === 'google_gemini') {
      const model = String(aiIntegration.credentials?.model ?? 'gemini-2.5-flash');
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        // Fallback to gemini-1.5-flash if 2.5-flash encounters regional or version issues
        if (model !== 'gemini-1.5-flash') {
          const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
              },
            }),
          });
          if (fallbackRes.ok) {
            const fbData: any = await fallbackRes.json();
            const rawText = fbData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const match = rawText.match(/\{[\s\S]*\}/);
            return match ? JSON.parse(match[0]) : null;
          }
        }
        const errText = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data: any = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const match = rawText.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }

    // 2. OpenAI-compatible endpoints (Groq, NVIDIA, Cerebras, SambaNova, OpenRouter, Mistral, DeepSeek, OpenAI)
    const openAiEndpoints: Record<string, { url: string; defaultModel: string; headers?: Record<string, string> }> = {
      groq: { url: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
      nvidia: { url: 'https://integrate.api.nvidia.com/v1', defaultModel: 'meta/llama-3.3-70b-instruct' },
      openrouter: {
        url: 'https://openrouter.ai/api/v1',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
        headers: { 'HTTP-Referer': 'https://ladakhvacation.in', 'X-Title': 'Ladakh Vacation CRM' },
      },
      cerebras: { url: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.3-70b' },
      sambanova: { url: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.3-70B-Instruct' },
      mistral: { url: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest' },
      deepseek: { url: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
      openai: { url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
    };

    if (openAiEndpoints[aiIntegration.provider]) {
      const cfg = openAiEndpoints[aiIntegration.provider];
      const model = String(aiIntegration.credentials?.model ?? cfg.defaultModel);
      const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(cfg.headers || {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${aiIntegration.provider} HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data: any = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '';
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }

    // 3. Anthropic
    if (aiIntegration.provider === 'anthropic') {
      const model = String(aiIntegration.credentials?.model ?? 'claude-3-5-haiku-20241022');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
      const data: any = await res.json();
      const content = data.content?.[0]?.text ?? '';
      const match = content.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }

    return null;
  }

  private parseWithHeuristics(
    text: string,
    url: string,
    provider: string,
    rawPayload: any,
    options?: { city?: string; propertyType?: string },
  ): ExtractedPropertyResult {
    // 1. Name inference from URL or text
    let name = '';
    const urlMatch = url.replace(/https?:\/\/(www\.)?/, '').split('/')[0].split('.')[0];
    name = urlMatch
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const titleMatch = text.match(/#\s+([^\n\r]+)/) || text.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].trim().split(/[|\-–]/)[0].trim();
    }

    // 2. City & Settlement Resolution via Ladakh Gazetteer
    const geo = resolveSettlementAndValley(text, url, name, options?.city);
    const city = geo.canonicalCity;

    // 3. Property Type (enforces no houseboats in Ladakh)
    const propertyType = resolvePropertyType(name, text, url, city, options?.propertyType);

    // 4. Contacts
    const phoneMatch = text.match(/(?:\+?91[\-\s]?)?[6-9]\d{9}|(?:01982|0194|01985)[\-\s]?\d{5,6}/);
    const phone = phoneMatch ? phoneMatch[0].trim() : null;

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0].trim().toLowerCase() : null;

    // 5. Room Categories
    const roomCategories: ExtractedRoomCategory[] = [];
    const catMatches = text.match(/(Deluxe|Super Deluxe|Luxury Tent|Suite|Standard|Premium|Executive)\s*(Room|Tent|Cottage|Suite)?/gi);
    if (catMatches) {
      const uniqueCats = Array.from(new Set(catMatches.map((c) => c.trim())));
      uniqueCats.slice(0, 4).forEach((cat) => {
        roomCategories.push({
          name: cat,
          maxOccupancy: 3,
          bedType: 'King / Twin',
          extraBedRate: 1500,
          childRate: 800,
          mealPlans: ['CP', 'MAP'],
        });
      });
    }

    if (roomCategories.length === 0) {
      roomCategories.push({
        name: propertyType === VendorType.CAMP ? 'Luxury Tent' : 'Deluxe Room',
        maxOccupancy: 3,
        bedType: 'Double / Twin',
        mealPlans: ['CP', 'MAP'],
      });
    }

    // 6. Amenities
    const knownAmenities = [
      'Wi-Fi',
      'Power Backup',
      'Oxygen Cylinder',
      'Electric Blanket',
      'Central Heating',
      'Hot Water',
      'Campfire',
      'Restaurant',
      'Doctor on Call',
      'Room Heater',
      'Free Parking',
    ];
    const reportedAmenities = knownAmenities.filter((a) =>
      new RegExp(a.replace(/[-]/g, '[-\\s]'), 'i').test(text),
    );

    // 7. Seasonal windows for camps
    let seasonalFrom: Date | null = null;
    let seasonalTo: Date | null = null;
    if (propertyType === VendorType.CAMP || city === 'Pangong' || city === 'Nubra') {
      const curYear = new Date().getFullYear();
      seasonalFrom = new Date(`${curYear}-05-01T00:00:00.000Z`);
      seasonalTo = new Date(`${curYear}-10-15T00:00:00.000Z`);
    }

    return {
      sourceProvider: provider,
      sourceUrl: url,
      name: name || 'Scraped Property',
      city,
      propertyType,
      phone,
      email,
      address: null,
      starRating: null,
      roomCount: null,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      roomCategories,
      seasonalFrom,
      seasonalTo,
      reportedAmenities,
      rawPayload,
      matchedSettlement: geo.settlement,
      matchedValley: geo.valley,
      altitudeMeters: geo.altitudeMeters || null,
      confidence: geo.confidence,
    };
  }

  private normalizePropertyResult(
    raw: any,
    url: string,
    provider: string,
    rawPayload: any,
    options?: { city?: string; propertyType?: string },
  ): ExtractedPropertyResult {
    // 1. Name validation & cleaning
    let cleanName = String(raw.name || '').trim();
    cleanName = cleanName
      .replace(/\s*[-–|•]\s*(?:Official Website|Best Hotel.*|Houseboats in.*|Camps in.*|Luxury.*|Hotels in.*|K2 Journeys|Prices & Reviews|Tripadvisor|MakeMyTrip|Booking\.com).*$/i, '')
      .trim();

    const JUNK_NAMES = [
      'search hotels', 'expedia', 'hotel', 'hotels', 'the cannonball', 'hotel abc',
      'oceanview resort', 'seaside resort', 'luxury glamping', 'resort', 'camp',
      'hotels in', 'resorts in', 'best hotels in', 'tour packages', 'travel guide',
    ];
    if (cleanName.length < 3 || JUNK_NAMES.some((j) => cleanName.toLowerCase() === j)) {
      throw new Error(`Invalid or generic property name extracted: "${cleanName}"`);
    }

    // 2. Geolocation and sanity validation
    const rawAddress = raw.address ? String(raw.address).trim() : null;
    const cleanAddress = rawAddress && !/^(n\/a|null|undefined)$/i.test(rawAddress) ? rawAddress : null;
    const fullGeoText = `${cleanName} ${cleanAddress || ''} ${raw.city || ''} ${options?.city || ''}`.toLowerCase();

    const DISQUALIFIED_LOCATIONS = [
      'california', 'ca 9', 'ca 1', 'florida', 'fl 3', 'nevada', 'nv 8', 'texas',
      'lake tahoe', 'las vegas', 'kissimmee', 'malibu', 'oceanview', 'bandung',
      'indonesia', 'brazil', 'france', 'sample city', '123 sample', '123 beach', '123 ocean',
      'united states', 'usa',
    ];
    for (const badLoc of DISQUALIFIED_LOCATIONS) {
      if (fullGeoText.includes(badLoc)) {
        throw new Error(`Property geographically disqualified (${badLoc}): "${cleanName}" (${cleanAddress})`);
      }
    }

    // 3. Email cleaning
    let email = raw.email ? String(raw.email).trim().toLowerCase() : null;
    if (
      email &&
      (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ||
        /wixpress|sentry|bootstrap|example\.com/i.test(email))
    ) {
      email = null;
    }

    // 4. Phone cleaning
    let phone = raw.phone ? String(raw.phone).trim() : null;
    if (phone) {
      phone = phone.replace(/[^\d+\-\s]/g, '').trim();
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        phone = null;
      }
    }

    // 5. Star rating validation
    let starRating: number | null = raw.starRating ? Number(raw.starRating) : null;
    if (starRating !== null && (isNaN(starRating) || starRating < 1 || starRating > 5)) {
      starRating = null;
    }

    // 6. City & Settlement Resolution via Ladakh Gazetteer
    const geo = resolveSettlementAndValley(
      `${cleanName} ${cleanAddress || ''} ${raw.address || ''} ${raw.city || ''} ${JSON.stringify(rawPayload || {})}`,
      url,
      cleanName,
      options?.city || raw.city,
    );

    let resolvedCity = options?.city || raw.city || geo.canonicalCity;
    if (resolvedCity && /nubra/i.test(resolvedCity)) resolvedCity = 'Nubra';
    else if (resolvedCity && /leh/i.test(resolvedCity)) resolvedCity = 'Leh';
    else if (resolvedCity && /srinagar/i.test(resolvedCity)) resolvedCity = 'Srinagar';
    else if (resolvedCity && /pangong/i.test(resolvedCity)) resolvedCity = 'Pangong';
    else if (resolvedCity && /zanskar/i.test(resolvedCity)) resolvedCity = 'Zanskar';
    else if (resolvedCity && /kargil/i.test(resolvedCity)) resolvedCity = 'Kargil';

    // 7. Property Type resolution (enforces no houseboats in Ladakh)
    let pType: VendorType = resolvePropertyType(
      cleanName,
      `${JSON.stringify(raw)} ${JSON.stringify(rawPayload || {})}`,
      url,
      resolvedCity,
      options?.propertyType || raw.propertyType,
    );

    if (pType === VendorType.HOUSEBOAT && resolvedCity !== 'Srinagar') {
      pType = /camp|tent|glamping/i.test(cleanName) ? VendorType.CAMP : VendorType.HOTEL;
    }

    // 8. Room categories resolution
    const roomCats: ExtractedRoomCategory[] = Array.isArray(raw.roomCategories) && raw.roomCategories.length > 0
      ? raw.roomCategories.map((rc: any) => ({
          name: String(rc.name || 'Standard').trim(),
          maxOccupancy: Number(rc.maxOccupancy) || 3,
          bedType: rc.bedType ? String(rc.bedType).trim() : 'Double / Twin',
          extraBedRate: rc.extraBedRate ? Number(rc.extraBedRate) : undefined,
          childRate: rc.childRate ? Number(rc.childRate) : undefined,
          mealPlans: Array.isArray(rc.mealPlans) && rc.mealPlans.length > 0 ? rc.mealPlans : ['CP', 'MAP'],
          notes: rc.notes ? String(rc.notes) : undefined,
        }))
      : [
          {
            name: pType === VendorType.CAMP ? 'Luxury Tent' : pType === VendorType.HOUSEBOAT ? 'Deluxe Room' : 'Deluxe Room',
            maxOccupancy: 3,
            bedType: 'Double / Twin',
            mealPlans: ['CP', 'MAP'],
          },
        ];

    // 9. Seasonal windows for camps
    let seasonalFrom: Date | null = null;
    let seasonalTo: Date | null = null;
    if (raw.seasonalFrom) {
      const d = new Date(raw.seasonalFrom);
      if (!isNaN(d.getTime())) seasonalFrom = d;
    }
    if (raw.seasonalTo) {
      const d = new Date(raw.seasonalTo);
      if (!isNaN(d.getTime())) seasonalTo = d;
    }
    if (!seasonalFrom && (pType === VendorType.CAMP || (options?.city && /nubra|pangong/i.test(options.city)))) {
      const curYear = new Date().getFullYear();
      seasonalFrom = new Date(`${curYear}-05-01T00:00:00.000Z`);
      seasonalTo = new Date(`${curYear}-10-15T00:00:00.000Z`);
    }

    return {
      sourceProvider: provider,
      sourceUrl: url,
      name: cleanName,
      city: resolvedCity,
      propertyType: pType,
      phone,
      email,
      address: cleanAddress,
      starRating,
      roomCount: raw.roomCount ? Number(raw.roomCount) : null,
      checkInTime: raw.checkInTime ? String(raw.checkInTime).trim() : '14:00',
      checkOutTime: raw.checkOutTime ? String(raw.checkOutTime).trim() : '11:00',
      roomCategories: roomCats,
      seasonalFrom,
      seasonalTo,
      reportedAmenities: Array.isArray(raw.reportedAmenities) ? raw.reportedAmenities.map(String) : [],
      rawPayload,
      matchedSettlement: raw.settlement || geo.settlement,
      matchedValley: raw.valley || geo.valley,
      altitudeMeters: geo.altitudeMeters || null,
      confidence: geo.confidence,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
