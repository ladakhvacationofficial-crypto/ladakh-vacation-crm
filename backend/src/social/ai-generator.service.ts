import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import { ContentTone, SocialPlatform } from '@prisma/client';

export interface GenerateCopyDto {
  destination: string; // e.g. "Kashmir", "Gulmarg", "Ladakh", "Pahalgam"
  packageTitle?: string;
  season?: string; // e.g. "Autumn", "Winter Snow", "Spring Tulip", "Summer"
  targetPlatform?: SocialPlatform;
  customPrompt?: string;
  tone?: ContentTone;
}

export interface GeneratedVariant {
  tone: ContentTone;
  title: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
}

export interface GenerationResult {
  destination: string;
  topic: string;
  variants: GeneratedVariant[];
  suggestedHashtags: string[];
  bestPostingTimes: { day: string; time: string }[];
}

@Injectable()
export class AiGeneratorService {
  private readonly logger = new Logger(AiGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates 3 specialized social copy variants with curated hashtags and best posting time recommendations.
   */
  async generateSocialCopy(dto: GenerateCopyDto): Promise<GenerationResult> {
    const dest = dto.destination || 'Kashmir';
    const pkg = dto.packageTitle || `${dest} Holiday Experience`;
    const season = dto.season || 'Autumn & Winter';

    this.logger.log(`Generating AI social copy for destination: "${dest}", package: "${pkg}"`);

    // Check if an AI integration is configured in database
    const aiIntegration = await this.prisma.integration.findFirst({
      where: { category: 'AI', isActive: true },
      orderBy: { priority: 'desc' },
    });

    let liveAiGenerated: GeneratedVariant[] | null = null;

    if (aiIntegration) {
      try {
        const creds = JSON.parse(decryptSecret(aiIntegration.credentials));
        if (aiIntegration.provider === 'openai' && creds.apiKey) {
          liveAiGenerated = await this.callOpenAi(creds.apiKey, dest, pkg, season, dto.customPrompt);
        } else if (aiIntegration.provider === 'anthropic' && creds.apiKey) {
          liveAiGenerated = await this.callAnthropic(creds.apiKey, dest, pkg, season, dto.customPrompt);
        } else if (aiIntegration.provider === 'google_gemini' && creds.apiKey) {
          liveAiGenerated = await this.callGemini(creds.apiKey, dest, pkg, season, dto.customPrompt);
        }
      } catch (err: any) {
        this.logger.warn(`Live AI call failed (${aiIntegration.provider}), falling back to built-in generator: ${err.message}`);
      }
    }

    const variants = liveAiGenerated || this.buildSpecializedVariants(dest, pkg, season, dto.customPrompt);
    const suggestedHashtags = this.curateHashtags(dest);

    return {
      destination: dest,
      topic: `${dest} — ${pkg} (${season})`,
      variants,
      suggestedHashtags,
      bestPostingTimes: [
        { day: 'Wednesday & Friday', time: '11:00 AM – 1:00 PM IST' },
        { day: 'Saturday & Sunday', time: '7:30 PM – 9:30 PM IST' },
      ],
    };
  }

  /**
   * High-converting travel copy synthesizer with domain-expert prompts for Kashmir & Ladakh tourism.
   */
  private buildSpecializedVariants(
    dest: string,
    pkg: string,
    season: string,
    customPrompt?: string,
  ): GeneratedVariant[] {
    const isLadakh = dest.toLowerCase().includes('ladakh') || dest.toLowerCase().includes('leh');
    const isGulmarg = dest.toLowerCase().includes('gulmarg');
    const isPahalgam = dest.toLowerCase().includes('pahalgam');

    // ── Variant 1: Storytelling & Experiential ──────────────────────────────
    const storytellingCaption = isLadakh
      ? `Where the earth meets the sky in shades of raw amber and sapphire. 🏔️✨\n\nThere is a stillness in Ladakh that resets your soul — driving across the Khardung La pass, watching prayer flags flutter against endless blue horizons, and watching the sunset cast golden reflections over Pangong Tso.\n\nCraft your story with Ladakh Vacation — handpicked boutique stays, curated private transport, and local hospitality that feels like home.\n\n📍 ${pkg}\n📩 Send us a DM or tap the link in bio for customized itineraries.`
      : isGulmarg
      ? `Imagine waking up to a world dipped in pure white powder and pine forests. ❄️🌲\n\nWhether you are riding the highest cable car at Apharwat Peak or warming up with piping hot saffron Kehwa beside a crackling fireplace, Gulmarg is pure magic.\n\nExperience winter luxury tailored to perfection with Ladakh Vacation.\n\n📍 ${pkg}\n📩 Send us a direct message or link in bio to reserve your winter slot!`
      : `Waking up to the gentle splash of oars on Dal Lake, golden Chinar leaves drifting through the autumn breeze, and the aroma of freshly brewed Kahwa in the crisp morning air. 🍁☕🛶\n\nKashmir isn’t just a destination — it’s a feeling that stays with you long after you return home.\n\nLet Ladakh Vacation plan your seamless escape with luxury houseboats, private chauffeurs, and 24/7 on-ground assistance.\n\n📍 ${pkg}\n📩 DM us "KASHMIR" or click link in bio for customized quote.`;

    // ── Variant 2: Promotional & Urgency ────────────────────────────────────
    const promoCaption = `🔥 LIMITED SEATS: ${pkg.toUpperCase()} | Special Season Offer! 🏔️✈️\n\nPlan your dream getaway to ${dest} with complete peace of mind and zero hassle!\n\n✨ What's Included in your Ladakh Vacation Package:\n✔️ Handpicked 4★ / 5★ Luxury Stays & Houseboats\n✔️ Daily Buffet Breakfast & Chef-curated Dinners\n✔️ Private Sanitized Chauffeur-driven Transport\n✔️ Shikara Ride, Sightseeing & Local Guided Tours\n✔️ 24/7 Dedicated On-Ground Support\n\n💰 Special Group & Couple Discounts available for early bookings!\n\n👉 DM us right now or WhatsApp us at +91 99060 00000 for full day-by-day itinerary & transparent pricing.`;

    // ── Variant 3: Punchy Reel Hook / Short Form ────────────────────────────
    const reelCaption = `This is your sign to pack your bags and experience ${dest}! ✈️🏔️\n\n3 things you CANNOT miss:\n1️⃣ Sunrise Shikara ride on Dal Lake\n2️⃣ Gondola ride up to Apharwat snow slopes\n3️⃣ Traditional Kashmiri Wazwan dinner\n\nSave this for your next trip and share with your travel partner! 📲\n\nTag @ladakhvacation on your adventures ✨`;

    const hashtags = this.curateHashtags(dest);

    return [
      {
        tone: ContentTone.STORYTELLING,
        title: 'Storytelling & Experiential',
        hook: `Where the earth meets the sky...`,
        caption: storytellingCaption,
        cta: 'DM us or tap link in bio for customized itineraries.',
        hashtags: hashtags.slice(0, 10),
      },
      {
        tone: ContentTone.PROMOTIONAL,
        title: 'Promotional & Limited Offer',
        hook: `🔥 LIMITED SEATS: ${pkg.toUpperCase()}`,
        caption: promoCaption,
        cta: 'DM us or WhatsApp for transparent pricing.',
        hashtags: hashtags.slice(0, 8),
      },
      {
        tone: ContentTone.PUNCHY_REEL,
        title: 'Punchy Reel Hook & Viral Tags',
        hook: `This is your sign to experience ${dest}! ✈️`,
        caption: reelCaption,
        cta: 'Save this reel & share with your travel partner!',
        hashtags: hashtags,
      },
    ];
  }

  private curateHashtags(dest: string): string[] {
    const base = [
      '#Ladakh VacationHolidays',
      '#TravelIndia',
      '#IncredibleIndia',
      '#TravelGram',
      '#Wanderlust',
      '#LuxuryTravel',
      '#HolidayVibes',
    ];

    const destTags: Record<string, string[]> = {
      kashmir: [
        '#KashmirTourism',
        '#ParadiseOnEarth',
        '#DalLakeSrinagar',
        '#GulmargSnow',
        '#PahalgamDiaries',
        '#KashmirDiaries',
        '#KashmirWinter',
        '#ShikaraRide',
      ],
      ladakh: [
        '#LadakhTourism',
        '#PangongTso',
        '#NubraValley',
        '#KhardungLa',
        '#LehLadakhDiaries',
        '#HimalayanRoadtrip',
      ],
      gulmarg: [
        '#GulmargSkiing',
        '#GulmargGondola',
        '#ApharwatPeak',
        '#SnowParadise',
        '#WinterInKashmir',
      ],
      pahalgam: [
        '#PahalgamValley',
        '#BetaabValley',
        '#AruValley',
        '#LidderRiver',
      ],
    };

    const key = Object.keys(destTags).find((k) => dest.toLowerCase().includes(k)) || 'kashmir';
    return [...(destTags[key] || destTags.kashmir), ...base];
  }

  private async callOpenAi(apiKey: string, dest: string, pkg: string, season: string, custom?: string) {
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a premier travel agency specializing in Kashmir and Ladakh.
Write 3 Instagram/Facebook captions for destination "${dest}", package "${pkg}", season "${season}".
Tone 1: Evocative storytelling.
Tone 2: High-converting promotional with package perks and clear CTA.
Tone 3: Short punchy reel hook.
Include emojis and 10 relevant hashtags.
Return strictly a JSON array of 3 objects with keys: { "tone": "STORYTELLING"|"PROMOTIONAL"|"PUNCHY_REEL", "title": string, "hook": string, "caption": string, "cta": string, "hashtags": string[] }`;

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
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return Array.isArray(parsed) ? parsed : parsed.variants || null;
  }

  private async callAnthropic(
    apiKey: string,
    dest: string,
    pkg: string,
    season: string,
    custom?: string,
  ) {
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a premier Kashmir & Ladakh travel agency in India.

Write exactly 3 social media captions for:
- Destination: "${dest}"
- Package: "${pkg}"
- Season: "${season}"
${custom ? `- Special focus: "${custom}"` : ''}

Tone 1 (STORYTELLING): Immersive, evocative, sensory — Chinar leaves, Dal Lake shikara, saffron fields, snow peaks.
Tone 2 (PROMOTIONAL): High-converting with package highlights, urgency, pricing hooks, clear WhatsApp CTA.
Tone 3 (PUNCHY_REEL): Ultra-short viral hook (1–2 lines), 3 bullet highlights, shareable energy.

Include authentic emojis. Add 10 destination-specific hashtags (e.g. #KashmirTourism #GulmargSkiing).

Return ONLY a valid JSON array — no markdown, no code fences:
[
  {"tone": "STORYTELLING", "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]},
  {"tone": "PROMOTIONAL",  "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]},
  {"tone": "PUNCHY_REEL",  "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]}
]`;

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

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const rawText: string = data?.content?.[0]?.text ?? '';

    // Strip any accidental code fence wrapping
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      this.logger.warn('Anthropic returned non-JSON response, falling back to template engine');
      return null;
    }
  }

  private async callGemini(
    apiKey: string,
    dest: string,
    pkg: string,
    season: string,
    custom?: string,
  ) {
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a premier Kashmir & Ladakh travel agency in India.

Write exactly 3 social media captions for:
- Destination: "${dest}"
- Package: "${pkg}"
- Season: "${season}"
${custom ? `- Special focus: "${custom}"` : ''}

Tone 1 (STORYTELLING): Immersive, evocative, sensory — Chinar leaves, Dal Lake shikara, saffron fields, snow peaks.
Tone 2 (PROMOTIONAL): High-converting with package highlights, urgency, pricing hooks, clear WhatsApp CTA.
Tone 3 (PUNCHY_REEL): Ultra-short viral hook (1–2 lines), 3 bullet highlights, shareable energy.

Include authentic emojis. Add 10 destination-specific hashtags.

Return ONLY a valid JSON array — no markdown, no code fences:
[
  {"tone": "STORYTELLING", "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]},
  {"tone": "PROMOTIONAL",  "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]},
  {"tone": "PUNCHY_REEL",  "title": "...", "hook": "...", "caption": "...", "cta": "...", "hashtags": ["#...", ...]}
]`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      this.logger.warn('Gemini returned non-JSON response, falling back to template engine');
      return null;
    }
  }
}

