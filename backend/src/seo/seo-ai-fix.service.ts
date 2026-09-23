import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';

export interface GenerateSeoFixDto {
  checkId: string;
  label?: string;
  detail?: string;
  task?: string;
  url: string;
  pageTitle?: string;
  targetKeyword?: string;
  currentContent?: string;
}

export interface SeoFixResult {
  checkId: string;
  label: string;
  fixType: 'copy' | 'code' | 'meta' | 'editorial';
  headline: string;
  rationale: string;
  suggestion: string;
  instructions: string[];
}

@Injectable()
export class SeoAiFixService {
  private readonly logger = new Logger(SeoAiFixService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a targeted, ready-to-use SEO fix for a specific failing or warning audit check.
   */
  async generateFix(dto: GenerateSeoFixDto): Promise<SeoFixResult> {
    const checkId = dto.checkId;
    const url = dto.url || '/';
    const pageTitle = dto.pageTitle || this.extractTitleFromUrl(url);
    const keyword = dto.targetKeyword || this.extractKeywordFromUrl(url);

    this.logger.log(`Generating SEO AI fix for check "${checkId}" on page "${url}" (keyword: "${keyword}")`);

    // Check if an AI provider is active in the database
    let liveFix: SeoFixResult | null = null;
    try {
      const aiIntegration = await this.prisma.integration.findFirst({
        where: { category: 'AI', isActive: true },
        orderBy: { priority: 'desc' },
      });

      if (aiIntegration) {
        const creds = JSON.parse(decryptSecret(aiIntegration.credentials));
        if (aiIntegration.provider === 'google_gemini' && creds.apiKey) {
          liveFix = await this.callGemini(creds.apiKey, dto, pageTitle, keyword);
        } else if (aiIntegration.provider === 'openai' && creds.apiKey) {
          liveFix = await this.callOpenAi(creds.apiKey, dto, pageTitle, keyword);
        } else if (aiIntegration.provider === 'anthropic' && creds.apiKey) {
          liveFix = await this.callAnthropic(creds.apiKey, dto, pageTitle, keyword);
        } else if (aiIntegration.provider === 'groq' && creds.apiKey) {
          liveFix = await this.callGroq(creds.apiKey, dto, pageTitle, keyword);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Live AI fix generation failed, using built-in travel SEO engine: ${err.message}`);
    }

    // Fall back to built-in travel SEO synthesis engine
    return liveFix || this.synthesizeBuiltInFix(dto, pageTitle, keyword);
  }

  // ── Built-in Synthesis Engine (Zero dependency, domain expert) ───────────

  private synthesizeBuiltInFix(
    dto: GenerateSeoFixDto,
    pageTitle: string,
    keyword: string,
  ): SeoFixResult {
    const checkId = dto.checkId;
    const url = dto.url;
    const destination = this.detectDestination(url, pageTitle, keyword);

    switch (checkId) {
      case 'honest-advice': {
        return {
          checkId,
          label: dto.label || 'Honest "what to skip" advice',
          fixType: 'copy',
          headline: `Honest Travel Advisory & Who This Trip is NOT For (${destination})`,
          rationale:
            "Google's Helpful Content System strongly favors pages demonstrating genuine first-hand expertise. Explicitly warning travelers about rough terrain, altitude acclimation, or seasonal trade-offs builds immense trust and reduces bounce rates.",
          suggestion: `### ⚠️ Who This ${destination} Tour Is NOT For & Important Trade-Offs

While ${destination} is one of the most striking places in the Himalaya, we want you to have realistic expectations before booking:

1. **Not for travellers who want to rush the altitude:**
   Leh sits at 3,500 m. Every itinerary we run keeps the first afternoon empty, the second day low, and the high passes (Khardung La, Chang La, Umling La) for day three or later. We will not move Pangong earlier to fit more in.

2. **Not for anyone with an uncontrolled cardiac or pulmonary condition:**
   Speak to your doctor before booking anything at this altitude, and then to us. Every vehicle carries oxygen and an oximeter, but the right route matters more than the equipment.

3. **Weather and road closures:**
   Passes can close for snow or landslides at short notice, and from November to March most high roads are shut. Leave a spare day before an onward flight.

4. **Connectivity:**
   Prepaid SIMs from other states generally do not work in Ladakh, and coverage is patchy or absent at Pangong, Hanle and on the passes.`,
          instructions: [
            'Copy this markdown/HTML section into your package detail page or itinerary tab.',
            'Place it under an accordion titled "Who This Trip is NOT For & Travel Advisory" or near the FAQ section.',
            'Re-audit the page in the SEO dashboard to verify this check turns green (2/2 pts).',
          ],
        };
      }

      case 'indexable-images':
      case 'image-alt': {
        const destSlug = destination.toLowerCase().replace(/\s+/g, '-');
        return {
          checkId,
          label: dto.label || 'Own photos Google can index',
          fixType: 'code',
          headline: `Convert CSS Background Images to Indexable Next.js <Image> Components`,
          rationale:
            "Google Images bot does not index images rendered via CSS `background-image: url(...)` or tailwind `bg-[url(...)]`. Using standard `<Image />` tags with descriptive `alt` attributes allows Google to index your original photos, qualifying for visual search and image pack SERPs.",
          suggestion: `import Image from 'next/image';

// ❌ BEFORE (Unindexed CSS background):
// <div className="h-96 w-full bg-[url('/images/${destSlug}-hero.jpg')] bg-cover bg-center rounded-2xl" />

// ✅ AFTER (Fully indexable by Googlebot with SEO-rich alt text):
<div className="relative h-96 w-full overflow-hidden rounded-2xl shadow-lg">
  <Image
    src="/images/packages/${destSlug}-tour.jpg"
    alt="${destination}, Ladakh: high-altitude desert landscape photographed on a Ladakh Vacation trip"
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    priority
    className="object-cover transition-transform duration-500 hover:scale-105"
  />
  {/* Overlay gradient for readable text */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
</div>`,
          instructions: [
            'Replace any `style={{ backgroundImage: ... }}` or CSS background divs with the `<Image />` snippet above.',
            'Ensure every image has a descriptive `alt` tag mentioning the specific location, activity, and brand.',
            'Include `width` and `height` (or `fill` with a relative parent) to prevent Cumulative Layout Shift (CLS).',
            'Re-audit the page to verify both "Own photos Google can index" (4/4 pts) and "Image alt text" (2/2 pts) pass.',
          ],
        };
      }

      case 'meta-description': {
        const desc1 = `${destination} tour packages from a Leh-based team: altitude-first itineraries, private 4×4 with a Ladakhi driver, all permits and oxygen on board.`;
        const desc2 = `Book ${destination} with Ladakh Vacation from ₹14,500. Hotels and camps, environmental fee and permits handled, private cab and 24×7 support from Leh. WhatsApp us.`;
        const desc3 = `Plan ${destination} with local experts in Leh. Itemised quotes, custom itineraries sequenced by altitude, and no-cost EMI. Get your itinerary today.`;

        return {
          checkId,
          label: dto.label || 'Meta description',
          fixType: 'meta',
          headline: `Optimized 155-Character Meta Descriptions for "${destination}"`,
          rationale:
            'A compelling, keyword-rich meta description between 140 and 160 characters directly improves Click-Through Rate (CTR) from Google search results. Clear prices and actionable CTAs distinguish your snippet from generic aggregators.',
          suggestion: `<!-- Option 1: Value & Peace of Mind (155 characters) -->
<meta name="description" content="${desc1}" />

<!-- Option 2: Price & Feature Focused (154 characters) -->
<meta name="description" content="${desc2}" />

<!-- Option 3: Trust & Customization Focused (152 characters) -->
<meta name="description" content="${desc3}" />`,
          instructions: [
            'Add the `<meta name="description" ... />` tag to the page header or export `metadata.description` in your Next.js page.',
            'Ensure primary keyword ("' + keyword + '") is included within the first 60 characters.',
            'Re-audit the page to earn full points (2/2 pts).',
          ],
        };
      }

      case 'title':
      case 'title-unique':
      case 'query-coverage': {
        const title1 = `${destination} Tour Packages 2026: Itineraries, Best Deals & Stays | Ladakh Vacation`;
        const title2 = `${destination} Tour Packages from ₹14,500 | Ladakh Vacation`;
        const title3 = `${keyword.replace(/\b\w/g, (c) => c.toUpperCase())} — Custom Itineraries & Local Guides`;

        return {
          checkId,
          label: dto.label || 'Search words in title or main heading',
          fixType: 'copy',
          headline: `High-CTR Title Tag Variants for "${keyword}"`,
          rationale:
            'Search engines weigh page titles heavily. Aligning the title tag with exact search intent and placing target keywords at the front helps rankings and boosts SERP clicks.',
          suggestion: `// Recommended Next.js Page Metadata Title Options:

1. High Intent & Trust (Recommended):
   "${title1}"

2. Price & Value Hook:
   "${title2}"

3. Intent Exact-Match:
   "${title3}"`,
          instructions: [
            'Set your `<title>` tag or Next.js `metadata.title` to one of the options above.',
            'Keep total length under 60 characters so Google does not truncate it with an ellipsis.',
            'Re-audit to confirm query coverage and title uniqueness checks pass.',
          ],
        };
      }

      case 'main-heading': {
        return {
          checkId,
          label: dto.label || 'Main heading',
          fixType: 'copy',
          headline: `Search-Intent Aligned H1 Heading for "${destination}"`,
          rationale:
            'A single clear `<h1>` heading matching the search query signals topical authority to Google and immediately reassures visitors they landed on the right page.',
          suggestion: `<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
  ${destination} Tour Packages <span className="text-primary-600">(Custom Handcrafted Itineraries)</span>
</h1>`,
          instructions: [
            'Ensure the page has exactly one `<h1>` element above the fold.',
            'Include the core destination and "Tour Packages" phrase in the heading.',
            'Re-audit the page to earn full points (1/1 pt).',
          ],
        };
      }

      case 'unique-content': {
        return {
          checkId,
          label: dto.label || 'Content specific to this page',
          fixType: 'copy',
          headline: `Unique Local Insights & Destination Highlights for ${destination}`,
          rationale:
            "Programmatic SEO pages that repeat identical boilerplate text risk classification as thin or doorway pages under Google's Spam Policies. Adding 200+ words of authentic local details resolves content duplication.",
          suggestion: `### Discover Authentic ${destination} with Local Specialists

When planning ${destination}, the order of the days matters more than the list of sights. Our team in Leh sequences every route by altitude, so the places you came for are enjoyed rather than endured.

#### What to know before you go:
- **Best months:** May, June and September are the prime months; September and October bring the clearest skies. From November to March most high roads close.
- **Permits:** Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee. Foreign nationals need a Protected Area Permit, which we arrange before you land.
- **Getting around:** A private Innova Crysta or Xylo with a Ladakhi driver, carrying oxygen, an oximeter and a first-aid kit.

Every itinerary is a starting point, reshaped around your dates, your group and your pace.`,
          instructions: [
            'Insert this unique copy onto the package page, ideally in the "Overview" or "Destination Guide" section.',
            'Customize any specific hotel names or private transfers included in your offering.',
            'Re-audit to earn full credit on "Content specific to this page" (12/12 pts).',
          ],
        };
      }

      case 'author': {
        return {
          checkId,
          label: dto.label || 'Author named',
          fixType: 'editorial',
          headline: 'E-E-A-T Author Byline & Editorial Schema',
          rationale:
            "Google's Search Quality Evaluator Guidelines emphasize Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T). Naming an authentic travel specialist demonstrates real human curation.",
          suggestion: `<!-- Visual Byline Component. Replace [Author name] and [Role] with a real
     member of the Leh team before publishing: a named person who actually
     plans these trips is the point of this check. -->
<div className="flex items-center gap-3 py-4 my-6 border-y border-slate-200">
  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-slate-800">
    LV
  </div>
  <div>
    <p className="text-xs font-semibold text-slate-900">
      Planned by [Author name] · [Role], Ladakh Vacation, Leh
    </p>
    <p className="text-[11px] text-slate-500">
      Last reviewed: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
    </p>
  </div>
</div>

<!-- JSON-LD Author Schema snippet -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "${destination} Tour Package",
  "author": {
    "@type": "Person",
    "name": "[Author name]",
    "jobTitle": "[Role]",
    "worksFor": { "@type": "Organization", "name": "Ladakh Vacation" }
  }
}
</script>`,
          instructions: [
            'Replace [Author name] and [Role] with a real member of the team, then add the byline above the itinerary breakdown.',
            'Include the structured JSON-LD schema in the `<head>` or via Next.js metadata.',
            'Re-audit to score full points on the Author check (4/4 pts).',
          ],
        };
      }

      case 'honest-dates': {
        const isoDate = new Date().toISOString().split('T')[0];
        return {
          checkId,
          label: dto.label || 'Updated date matches content changes',
          fixType: 'code',
          headline: 'Machine-Readable Publication & Modification Date Tags',
          rationale:
            'Google verifies fresh content using `<time datetime="...">` tags and schema `dateModified`. Matching dates between visible copy and HTML tags prevents freshness penalties.',
          suggestion: `<div className="text-xs text-slate-500 flex items-center gap-2">
  <span>Updated for 2026 Season:</span>
  <time dateTime="${isoDate}" className="font-medium text-slate-700">
    ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </time>
</div>`,
          instructions: [
            'Place this `<time>` element near the package title or author byline.',
            'Re-audit to verify date freshness check passes (2/2 pts).',
          ],
        };
      }

      default: {
        return {
          checkId,
          label: dto.label || checkId,
          fixType: 'editorial',
          headline: `Optimization Recommendation for "${dto.label || checkId}"`,
          rationale: dto.task || 'Resolving this SEO check ensures full compliance with Google Search Essentials and provides a better user experience.',
          suggestion: `### Action Plan for "${dto.label || checkId}":

1. **Diagnosis:**
   ${dto.detail || 'Audit flagged a signal that can be improved on this URL.'}

2. **Required Fix:**
   ${dto.task || 'Review the page markup and ensure Google Search guidelines are satisfied.'}

3. **Target Destination & Keyword:**
   - Page: ${url}
   - Destination: ${destination}
   - Focus Query: ${keyword}`,
          instructions: [
            'Implement the suggested adjustment in your page template.',
            'Re-run the page audit to verify points have been credited.',
          ],
        };
      }
    }
  }

  // ── External AI Provider Integrations ────────────────────────────────────

  private async callGemini(
    apiKey: string,
    dto: GenerateSeoFixDto,
    pageTitle: string,
    keyword: string,
  ): Promise<SeoFixResult | null> {
    const prompt = this.buildAiPrompt(dto, pageTitle, keyword);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return this.parseAiResponse(rawText, dto);
  }

  private async callOpenAi(
    apiKey: string,
    dto: GenerateSeoFixDto,
    pageTitle: string,
    keyword: string,
  ): Promise<SeoFixResult | null> {
    const prompt = this.buildAiPrompt(dto, pageTitle, keyword);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return this.parseAiResponse(data.choices[0]?.message?.content ?? '', dto);
  }

  private async callAnthropic(
    apiKey: string,
    dto: GenerateSeoFixDto,
    pageTitle: string,
    keyword: string,
  ): Promise<SeoFixResult | null> {
    const prompt = this.buildAiPrompt(dto, pageTitle, keyword);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return this.parseAiResponse(data?.content?.[0]?.text ?? '', dto);
  }

  private async callGroq(
    apiKey: string,
    dto: GenerateSeoFixDto,
    pageTitle: string,
    keyword: string,
  ): Promise<SeoFixResult | null> {
    const prompt = this.buildAiPrompt(dto, pageTitle, keyword);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return this.parseAiResponse(data.choices[0]?.message?.content ?? '', dto);
  }

  private buildAiPrompt(dto: GenerateSeoFixDto, pageTitle: string, keyword: string): string {
    return `You are a world-class Technical SEO & Helpful Content specialist for Ladakh Vacation, a Leh-based Ladakh tour operator (Leh, Nubra, Pangong, Hanle, Tso Moriri, and the Manali and Srinagar roads into Ladakh). Its itineraries are sequenced by altitude. Indian guests pay the Ladakh environmental fee (there is no Inner Line Permit for Indian tourists). Foreign nationals need a Protected Area Permit, which the operator arranges. Every vehicle is a private 4×4 with a Ladakhi driver and oxygen on board. Never invent prices, awards, statistics or staff names.

A page audit flagged an SEO issue that needs an immediate, actionable fix:
- Check ID: "${dto.checkId}" (${dto.label || ''})
- Audit Detail: "${dto.detail || 'Signal scored below maximum points'}"
- Suggested Task: "${dto.task || ''}"
- Page URL: "${dto.url}"
- Page Title: "${pageTitle}"
- Target Keyword: "${keyword}"

Generate a complete, production-ready fix in strict JSON format.
If the check is "honest-advice", produce genuine "Who this trip is NOT for" trade-off advice tailored to the destination.
If the check is "indexable-images" or "image-alt", produce clean Next.js <Image /> JSX code with rich, descriptive alt text replacing CSS background images.
If the check is "meta-description", produce 3 high-converting 150-158 character meta descriptions.
If the check is "unique-content", write 2-3 paragraphs of authentic local travel insights.

Return strictly a JSON object with keys:
{
  "headline": string,
  "rationale": string,
  "fixType": "copy" | "code" | "meta" | "editorial",
  "suggestion": string,
  "instructions": string[]
}`;
  }

  private parseAiResponse(rawJson: string, dto: GenerateSeoFixDto): SeoFixResult | null {
    try {
      const clean = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(clean);
      return {
        checkId: dto.checkId,
        label: dto.label || dto.checkId,
        fixType: parsed.fixType || 'copy',
        headline: parsed.headline || `AI Fix for ${dto.label || dto.checkId}`,
        rationale: parsed.rationale || '',
        suggestion: parsed.suggestion || '',
        instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      };
    } catch {
      return null;
    }
  }

  // ── Helper Utilities ─────────────────────────────────────────────────────

  private extractTitleFromUrl(url: string): string {
    const slug = url.split('/').filter(Boolean).pop() || 'ladakh';
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private extractKeywordFromUrl(url: string): string {
    const slug = url.split('/').filter(Boolean).pop() || 'ladakh-tour-packages';
    return slug.replace(/-/g, ' ');
  }

  private detectDestination(url: string, title: string, keyword: string): string {
    const combined = `${url} ${title} ${keyword}`.toLowerCase();
    if (combined.includes('hanle') || combined.includes('moriri') || combined.includes('umling')) return 'Hanle & Tso Moriri';
    if (combined.includes('pangong')) return 'Pangong Tso';
    if (combined.includes('nubra') || combined.includes('turtuk') || combined.includes('khardung')) return 'Nubra Valley';
    if (combined.includes('bike')) return 'Leh Ladakh Bike Trip';
    if (combined.includes('manali')) return 'Manali to Leh';
    if (combined.includes('kashmir') || combined.includes('srinagar')) return 'Kashmir & Ladakh';
    if (combined.includes('monaster') || combined.includes('lamayuru') || combined.includes('alchi') || combined.includes('hemis')) return 'Ladakh Monasteries';
    if (/\bleh\b/.test(combined)) return 'Leh';
    return 'Ladakh';
  }
}
