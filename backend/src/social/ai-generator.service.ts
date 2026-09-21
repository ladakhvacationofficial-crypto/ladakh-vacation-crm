import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import { ContentTone, SocialPlatform } from '@prisma/client';

export interface GenerateCopyDto {
  destination: string; // e.g. "Leh", "Nubra Valley", "Pangong Tso", "Hanle"
  packageTitle?: string;
  season?: string; // e.g. "Spring", "Summer", "Autumn", "Winter"
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
    const dest = dto.destination || 'Ladakh';
    const pkg = dto.packageTitle || `${dest} Holiday Experience`;
    const season = dto.season || 'Summer & Autumn';

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
   * Built-in caption templates, used when no AI integration is configured or
   * the live call fails. Every claim in them is one the Ads landers make
   * (permits, oxygen, private 4×4, Leh-based team), so a fallback post never
   * promises something the business does not do.
   */
  private buildSpecializedVariants(
    dest: string,
    pkg: string,
    season: string,
    customPrompt?: string,
  ): GeneratedVariant[] {
    const d = dest.toLowerCase();
    const isHanle = d.includes('hanle') || d.includes('moriri') || d.includes('star');
    const isNubra = d.includes('nubra') || d.includes('pangong') || d.includes('turtuk') || d.includes('khardung');
    const isRoad = d.includes('manali') || d.includes('bike') || d.includes('srinagar') || d.includes('road');

    // ── Variant 1: Storytelling & Experiential ──────────────────────────────
    const storytellingCaption = isHanle
      ? `At 4,500 m in Hanle, the Milky Way is bright enough to cast a shadow. 🌌\n\nIndia's first Dark Sky Reserve, the Changthang plateau, Tso Moriri at dawn, and Umling La, the highest motorable road on earth.\n\nPlanned by a Leh-based team, sequenced by altitude, with an astro guide for the night you came for.\n\n📍 ${pkg}\n📩 DM us or tap the link in bio for your itinerary.`
      : isNubra
      ? `Over Khardung La, down into the Hunder dunes, and on until the land stops and Pangong's impossible blue begins. 🏔️💙\n\nWe never send anyone to Pangong on day two. Two nights around Leh and a night in Nubra first, so the lake is something you remember for the right reasons.\n\n📍 ${pkg}\n📩 DM us or tap the link in bio for your itinerary.`
      : isRoad
      ? `Five passes above 4,000 m, and a road that is the whole point of the trip. 🛣️🏍️\n\nWe break the journey with overnight stops, so you arrive in Leh acclimatised instead of wrecked. Backup vehicle, oxygen and a Ladakhi crew behind you every kilometre.\n\n📍 ${pkg}\n📩 DM us or tap the link in bio for dates.`
      : `Ladakh, planned by Ladakhis. 🏔️\n\nOld Town lanes in Leh, Shanti Stupa at dusk, monasteries older than most countries, and a first afternoon deliberately left empty, because the altitude comes first.\n\nPermits handled, a private 4×4 with a Ladakhi driver, and oxygen in every vehicle.\n\n📍 ${pkg}\n📩 DM us or tap the link in bio for your itinerary.`;

    // ── Variant 2: Promotional ──────────────────────────────────────────────
    const promoCaption = `${pkg.toUpperCase()} | ${season} 🏔️\n\nPlan ${dest} with a Leh-based team, not a call centre.\n\n✨ Every Ladakh Vacation trip includes:\n✔️ Handpicked 3★/4★ hotels in Leh and deluxe camps at Nubra and Pangong\n✔️ Private Innova Crysta or Xylo with a Ladakhi driver\n✔️ Oxygen, oximeter and first aid in every vehicle\n✔️ All Inner Line Permits, printed before you land\n✔️ Daily breakfast and dinner\n✔️ 24×7 support from a named coordinator in Leh\n\n💳 25% deposit confirms your dates. No-cost EMI on cards.\n\n👉 DM us or WhatsApp +91 96229 55386 for a day-by-day itinerary and an itemised quote.`;

    // ── Variant 3: Punchy Reel Hook / Short Form ────────────────────────────
    const reelCaption = `This is your sign to finally do ${dest}. ✈️🏔️\n\n3 things you cannot miss:\n1️⃣ Crossing Khardung La at 5,359 m\n2️⃣ Sunrise on Pangong Tso from a shoreline camp\n3️⃣ The Milky Way over Hanle\n\nSave this for your next trip and send it to your travel partner. 📲\n\nTag @ladakhvacation on your adventures ✨`;

    const hashtags = this.curateHashtags(dest);

    return [
      {
        tone: ContentTone.STORYTELLING,
        title: 'Storytelling & Experiential',
        hook: storytellingCaption.split('\n')[0],
        caption: storytellingCaption,
        cta: 'DM us or tap the link in bio for your itinerary.',
        hashtags: hashtags.slice(0, 10),
      },
      {
        tone: ContentTone.PROMOTIONAL,
        title: 'Promotional',
        hook: `${pkg.toUpperCase()} | ${season}`,
        caption: promoCaption,
        cta: 'DM us or WhatsApp for an itemised quote.',
        hashtags: hashtags.slice(0, 8),
      },
      {
        tone: ContentTone.PUNCHY_REEL,
        title: 'Punchy Reel Hook & Viral Tags',
        hook: `This is your sign to finally do ${dest}. ✈️`,
        caption: reelCaption,
        cta: 'Save this reel & share with your travel partner!',
        hashtags: hashtags,
      },
    ];
  }

  private curateHashtags(dest: string): string[] {
    const base = [
      '#LadakhVacation',
      '#Ladakh',
      '#LehLadakh',
      '#IncredibleIndia',
      '#TravelIndia',
      '#Himalayas',
      '#Wanderlust',
    ];

    const destTags: Record<string, string[]> = {
      leh: ['#LehDiaries', '#LehPalace', '#ShantiStupa', '#ThikseyMonastery', '#ShamValley', '#Julley'],
      nubra: ['#NubraValley', '#KhardungLa', '#HunderDunes', '#Turtuk', '#DiskitMonastery'],
      pangong: ['#PangongTso', '#PangongLake', '#ChangLa', '#LadakhLakes'],
      hanle: ['#Hanle', '#HanleDarkSkyReserve', '#DarkSky', '#UmlingLa', '#TsoMoriri', '#Astrophotography'],
      manali: ['#ManaliToLeh', '#ManaliLehHighway', '#Sarchu', '#BaralachaLa', '#HimalayanRoadtrip'],
      bike: ['#LadakhBikeTrip', '#RoyalEnfield', '#ManaliToLeh', '#BikersOfIndia', '#HimalayanRoadtrip'],
      srinagar: ['#SrinagarToLeh', '#ZojiLa', '#Kargil', '#KashmirToLadakh'],
      ladakh: ['#LadakhTourism', '#PangongTso', '#NubraValley', '#KhardungLa', '#LehLadakhDiaries', '#HimalayanRoadtrip'],
    };

    const key = Object.keys(destTags).find((k) => dest.toLowerCase().includes(k)) || 'ladakh';
    return [...destTags[key], ...base];
  }

  private async callOpenAi(apiKey: string, dest: string, pkg: string, season: string, custom?: string) {
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a Leh-based Ladakh tour operator (Leh, Nubra, Pangong, Hanle, the Manali and Srinagar roads).
Write 3 Instagram/Facebook captions for destination "${dest}", package "${pkg}", season "${season}".
Tone 1: Evocative storytelling.
Tone 2: High-converting promotional with package perks and clear CTA.
Only promise what the business actually offers: private 4×4 with a Ladakhi driver, oxygen and first aid in every vehicle, all Inner Line Permits handled, altitude-first itineraries (never Pangong on day two), 24×7 support from Leh, WhatsApp +91 96229 55386. Do not invent prices, discounts or deadlines.
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
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a Leh-based Ladakh tour operator (Leh, Nubra, Pangong, Hanle, the Manali and Srinagar roads).

Write exactly 3 social media captions for:
- Destination: "${dest}"
- Package: "${pkg}"
- Season: "${season}"
${custom ? `- Special focus: "${custom}"` : ''}

Tone 1 (STORYTELLING): Immersive, evocative, sensory — high passes, prayer flags, monasteries, Pangong's blue, the Hanle night sky.
Tone 2 (PROMOTIONAL): High-converting with package highlights and a clear WhatsApp CTA.
Tone 3 (PUNCHY_REEL): Ultra-short viral hook (1–2 lines), 3 bullet highlights, shareable energy.

Only promise what the business actually offers: private 4×4 with a Ladakhi driver, oxygen and first aid in every vehicle, all Inner Line Permits handled, altitude-first itineraries (never Pangong on day two), 24×7 support from Leh, WhatsApp +91 96229 55386. Do not invent prices, discounts or deadlines.
Include authentic emojis. Add 10 destination-specific hashtags (e.g. #LadakhTourism #PangongTso).

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
    const prompt = `You are an elite travel marketing copywriter for Ladakh Vacation, a Leh-based Ladakh tour operator (Leh, Nubra, Pangong, Hanle, the Manali and Srinagar roads).

Write exactly 3 social media captions for:
- Destination: "${dest}"
- Package: "${pkg}"
- Season: "${season}"
${custom ? `- Special focus: "${custom}"` : ''}

Tone 1 (STORYTELLING): Immersive, evocative, sensory — high passes, prayer flags, monasteries, Pangong's blue, the Hanle night sky.
Tone 2 (PROMOTIONAL): High-converting with package highlights and a clear WhatsApp CTA.
Tone 3 (PUNCHY_REEL): Ultra-short viral hook (1–2 lines), 3 bullet highlights, shareable energy.

Only promise what the business actually offers: private 4×4 with a Ladakhi driver, oxygen and first aid in every vehicle, all Inner Line Permits handled, altitude-first itineraries (never Pangong on day two), 24×7 support from Leh, WhatsApp +91 96229 55386. Do not invent prices, discounts or deadlines.
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

