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

  // Direct hotel / camp / houseboat website!
  return { qualified: true, domainType: 'direct_property' };
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

    // 1. Try Firecrawl search with negative operators & targeted query
    const firecrawl = activeScrapers.find((s) => s.provider === 'firecrawl');
    if (firecrawl) {
      try {
        const apiKey = String(firecrawl.credentials?.apiKey ?? '').trim();
        const base = String(firecrawl.credentials?.baseUrl ?? 'https://api.firecrawl.dev').trim().replace(/\/+$/, '');
        
        // Primary query targeting direct hospitality properties
        const primaryTarget = `${query} (resort OR camp OR hotel OR houseboat) "official website" OR "contact" OR "tariff" -site:facebook.com -site:instagram.com -site:youtube.com -site:pinterest.com -site:reddit.com -site:quora.com -site:expedia.com -site:travelocity.com -site:trivago.com -site:trip.com -site:hotels.com -site:cntraveller.in -site:justdial.com -inurl:search -inurl:login`;
        
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
          const secondaryTarget = `${query} site:tripadvisor.in/Hotel_Review OR site:makemytrip.com/hotels`;
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
        const jinaQuery = `${query} hotel camp houseboat contact`;
        const res = await fetch(`https://s.jina.ai/${encodeURIComponent(jinaQuery)}`, { headers });
        if (res.ok) {
          const markdown = await res.text();
          const matches = markdown.matchAll(/\[(?:[^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g);
          for (const m of matches) {
            const u = m[1];
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
            'Extract hotel, resort, camp or houseboat details into JSON: name, city, propertyType (HOTEL, CAMP, or HOUSEBOAT), phone, email, address, starRating (number 1-5), roomCount (total rooms), checkInTime (HH:MM), checkOutTime (HH:MM), roomCategories (array of objects with name, maxOccupancy, bedType, extraBedRate, childRate, mealPlans), seasonalFrom (YYYY-MM-DD or null), seasonalTo (YYYY-MM-DD or null), reportedAmenities (array of string tags like Wifi, Heater, Hot Water, etc.).',
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

    // Try AI extraction first if an active AI integration exists
    const aiIntegration = await this.integrations.pickAI();
    if (aiIntegration) {
      try {
        const parsed = await this.extractWithAI(aiIntegration, textSample, url);
        if (parsed && parsed.name) {
          return this.normalizePropertyResult(parsed, url, provider, rawPayload, options);
        }
      } catch (err: any) {
        this.logger.warn(`AI extraction parsing failed (${err?.message}), falling back to heuristic regex parser`);
      }
    }

    // Heuristic regex & rule-based parser fallback
    return this.parseWithHeuristics(textSample, url, provider, rawPayload, options);
  }

  private async extractWithAI(
    aiIntegration: { provider: string; credentials: Record<string, unknown> },
    text: string,
    url: string,
  ): Promise<any> {
    const prompt = `You are a hospitality intelligence parser for Ladakh and Kashmir tourism.
Extract hotel, resort, camp or houseboat operational details from this webpage text.
Target URL: "${url}"

Webpage Content:
${text}

Return STRICTLY a JSON object with these keys:
{
  "name": string (Property name),
  "city": string ("Leh", "Nubra", "Pangong", "Srinagar", "Kargil", "Zanskar", "Gulmarg", "Pahalgam", "Sonamarg"),
  "propertyType": "HOTEL" | "CAMP" | "HOUSEBOAT",
  "phone": string or null (Indian phone or mobile),
  "email": string or null,
  "address": string or null,
  "starRating": number (1-5) or null,
  "roomCount": number or null (total room capacity),
  "checkInTime": string ("14:00") or null,
  "checkOutTime": string ("11:00") or null,
  "roomCategories": [
    {
      "name": string ("Deluxe Room", "Super Deluxe", "Luxury Tent", "Royal Suite"),
      "maxOccupancy": number (usually 2 or 3),
      "bedType": string ("King", "Twin", "Double"),
      "extraBedRate": number or null,
      "childRate": number or null,
      "mealPlans": string[] (["EP", "CP", "MAP", "AP"])
    }
  ],
  "seasonalFrom": string ("YYYY-MM-DD") or null (for seasonal camps in Nubra/Pangong),
  "seasonalTo": string ("YYYY-MM-DD") or null,
  "reportedAmenities": string[] (tags such as "Wi-Fi", "Oxygen Cylinder", "Electric Blanket", "Central Heating", "Campfire", "Power Backup", "Restaurant")
}
Do NOT include live OTA room prices. Only bed-wise specs, occupancy, and operating parameters.`;

    const apiKey = String(aiIntegration.credentials?.apiKey ?? '');
    if (!apiKey) return null;

    if (aiIntegration.provider === 'openai' || aiIntegration.provider === 'groq' || aiIntegration.provider === 'deepseek') {
      const endpoint =
        aiIntegration.provider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : aiIntegration.provider === 'deepseek'
          ? 'https://api.deepseek.com/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

      const model =
        aiIntegration.provider === 'groq'
          ? 'llama-3.3-70b-versatile'
          : aiIntegration.provider === 'deepseek'
          ? 'deepseek-chat'
          : 'gpt-4o-mini';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!res.ok) throw new Error(`AI API HTTP ${res.status}`);
      const data: any = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }

    if (aiIntegration.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
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

    // 2. City detection
    let city = options?.city || null;
    if (!city) {
      const cities = ['Leh', 'Nubra', 'Pangong', 'Srinagar', 'Kargil', 'Zanskar', 'Gulmarg', 'Pahalgam', 'Sonamarg'];
      for (const c of cities) {
        if (new RegExp(`\\b${c}\\b`, 'i').test(text) || new RegExp(`\\b${c}\\b`, 'i').test(url)) {
          city = c;
          break;
        }
      }
    }

    // 3. Property Type
    let propertyType: VendorType = VendorType.HOTEL;
    if (options?.propertyType && Object.values(VendorType).includes(options.propertyType as VendorType)) {
      propertyType = options.propertyType as VendorType;
    } else if (/houseboat/i.test(name) || /houseboat/i.test(text)) {
      propertyType = VendorType.HOUSEBOAT;
    } else if (/camp|tents|glamping/i.test(name) || /camp|luxury tent/i.test(text)) {
      propertyType = VendorType.CAMP;
    }

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

    // 6. Property Type resolution
    let pType: VendorType = VendorType.HOTEL;
    const typeStr = String(raw.propertyType || options?.propertyType || '').toUpperCase();
    if (typeStr === 'CAMP' || /camp|tents|glamping/i.test(cleanName)) pType = VendorType.CAMP;
    else if (typeStr === 'HOUSEBOAT' || /houseboat/i.test(cleanName)) pType = VendorType.HOUSEBOAT;

    // 7. Room categories resolution
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

    // 8. Seasonal windows for camps
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

    // 9. City resolution
    let resolvedCity = options?.city || raw.city || null;
    if (resolvedCity && /nubra/i.test(resolvedCity)) resolvedCity = 'Nubra';
    else if (resolvedCity && /leh/i.test(resolvedCity)) resolvedCity = 'Leh';
    else if (resolvedCity && /srinagar/i.test(resolvedCity)) resolvedCity = 'Srinagar';
    else if (resolvedCity && /pangong/i.test(resolvedCity)) resolvedCity = 'Pangong';

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
