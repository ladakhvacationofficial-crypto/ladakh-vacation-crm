import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource, LeadStatus } from '@prisma/client';

export type LeadGrade = 'HOT' | 'WARM' | 'COOL' | 'COLD';

export interface LeadScoreResult {
  leadId: string;
  name: string;
  score: number; // 1-100
  grade: LeadGrade;
  winProbability: number; // 0.0 - 1.0
  positiveSignals: string[];
  riskSignals: string[];
  recommendedAction: string;
  scoredAt: Date;
}

export interface RawLeadFeatures {
  id?: string;
  name?: string;
  source: LeadSource | string;
  destination?: string | null;
  travelDate?: Date | string | null;
  nights?: number | null;
  adults?: number | null;
  children?: number | null;
  budget?: number | null;
  message?: string | null;
  enquiryCount?: number;
  firstContactAt?: Date | string | null;
  createdAt?: Date | string;
  status?: LeadStatus | string;
}

@Injectable()
export class MlScoringService {
  private readonly logger = new Logger(MlScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Score an existing lead by ID, persist the score to the database, and return detailed explainability.
   */
  async scoreLeadById(id: string): Promise<LeadScoreResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        activities: {
          select: { id: true, type: true, createdAt: true },
          take: 10,
        },
      },
    });

    if (!lead) throw new NotFoundException(`Lead with id "${id}" not found`);

    const result = this.calculateLeadScore({
      id: lead.id,
      name: lead.name,
      source: lead.source,
      destination: lead.destination,
      travelDate: lead.travelDate,
      nights: lead.nights,
      adults: lead.adults,
      children: lead.children,
      budget: lead.budget,
      message: lead.message,
      enquiryCount: lead.enquiryCount,
      firstContactAt: lead.firstContactAt,
      createdAt: lead.createdAt,
      status: lead.status,
    });

    // Do not overwrite the deterministic capture-time score.
    // Append advisory win probability to scoreNotes while preserving the original breakdown.
    const advisoryNote = `[Advisory Win Prob: ${(result.winProbability * 100).toFixed(0)}% (${result.grade})]`;
    const updatedNotes = lead.scoreNotes && !lead.scoreNotes.includes('Advisory Win Prob')
      ? `${lead.scoreNotes} | ${advisoryNote}`
      : (lead.scoreNotes || advisoryNote);

    await this.prisma.lead.update({
      where: { id },
      data: {
        scoreNotes: updatedNotes,
      },
    });

    return result;
  }

  /**
   * Batch re-score all open/active leads in the pipeline.
   */
  async batchScoreActiveLeads(limit = 100): Promise<{ scoredCount: number; averageScore: number }> {
    const activeLeads = await this.prisma.lead.findMany({
      where: {
        status: {
          in: [
            LeadStatus.NEW,
            LeadStatus.CONTACTED,
            LeadStatus.INTERESTED,
            LeadStatus.QUOTATION_SENT,
            LeadStatus.NEGOTIATION,
          ],
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    let totalScore = 0;
    for (const lead of activeLeads) {
      const res = this.calculateLeadScore({
        id: lead.id,
        name: lead.name,
        source: lead.source,
        destination: lead.destination,
        travelDate: lead.travelDate,
        nights: lead.nights,
        adults: lead.adults,
        children: lead.children,
        budget: lead.budget,
        message: lead.message,
        enquiryCount: lead.enquiryCount,
        firstContactAt: lead.firstContactAt,
        createdAt: lead.createdAt,
        status: lead.status,
      });

      totalScore += res.score;

      const advisoryNote = `[Advisory Win Prob: ${(res.winProbability * 100).toFixed(0)}% (${res.grade})]`;
      const updatedNotes = lead.scoreNotes && !lead.scoreNotes.includes('Advisory Win Prob')
        ? `${lead.scoreNotes} | ${advisoryNote}`
        : (lead.scoreNotes || advisoryNote);

      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          scoreNotes: updatedNotes,
        },
      });
    }

    const avg = activeLeads.length > 0 ? Math.round(totalScore / activeLeads.length) : 0;
    this.logger.log(`Batch scored ${activeLeads.length} active leads. Average score: ${avg}`);
    return { scoredCount: activeLeads.length, averageScore: avg };
  }

  /**
   * Pure mathematical multivariate logistic scoring model with explainable factor decomposition.
   */
  calculateLeadScore(lead: RawLeadFeatures): LeadScoreResult {
    let z = -0.4; // Base log-odds prior (represents average baseline conversion)
    const positiveSignals: string[] = [];
    const riskSignals: string[] = [];

    // ── 1. Channel Quality Weight ──────────────────────────────────────────
    const src = String(lead.source || '').toUpperCase();
    if (src === 'WHATSAPP') {
      z += 0.95;
      positiveSignals.push('Direct WhatsApp channel (+22% conversion likelihood)');
    } else if (src === 'PHONE' || src === 'WALK_IN') {
      z += 0.85;
      positiveSignals.push('Direct phone / walk-in inbound (+20% conversion likelihood)');
    } else if (src === 'REFERRAL') {
      z += 1.15;
      positiveSignals.push('Customer referral (+28% conversion likelihood)');
    } else if (src === 'WEBSITE' || src === 'LANDING_PAGE') {
      z += 0.55;
      positiveSignals.push('Organic website / landing page intent (+14%)');
    } else if (src === 'GOOGLE_ADS') {
      z += 0.45;
      positiveSignals.push('High-intent Google search click (+12%)');
    } else if (src === 'META_ADS' || src === 'INSTAGRAM' || src === 'FACEBOOK') {
      z += 0.2;
      // Social ads have higher browsing volume
    } else if (src === 'EMAIL') {
      z += 0.1;
    }

    // ── 2. Destination & Seasonality Alignment ─────────────────────────────
    const dest = (lead.destination || '').toLowerCase();
    const travelDate = lead.travelDate ? new Date(lead.travelDate) : null;
    const travelMonth = travelDate ? travelDate.getMonth() + 1 : null; // 1 = Jan, 12 = Dec

    const isRoad = ['manali', 'bike', 'sarchu', 'srinagar', 'kashmir', 'zoji', 'kargil'].some((k) => dest.includes(k));
    const isHanle = ['hanle', 'moriri', 'umling', 'star'].some((k) => dest.includes(k));
    const isLadakh =
      isRoad ||
      isHanle ||
      ['ladakh', 'leh', 'nubra', 'pangong', 'turtuk', 'khardung', 'sham', 'monaster'].some((k) => dest.includes(k));

    if (isLadakh && travelMonth) {
      if (isRoad && ![6, 7, 8, 9].includes(travelMonth)) {
        if ([5, 10].includes(travelMonth)) {
          z += 0.2;
          riskSignals.push('Road opening/closing month for the Manali or Srinagar route: confirm the pass is open (-3%)');
        } else {
          z -= 0.85;
          riskSignals.push('Manali–Leh and Srinagar–Leh roads closed in this month (-22%)');
        }
      } else if (isHanle && [9, 10].includes(travelMonth)) {
        z += 0.95;
        positiveSignals.push('Clear-sky season at Hanle (+25%)');
      } else if ([5, 6, 9].includes(travelMonth)) {
        z += 0.95;
        positiveSignals.push('Prime Ladakh season: passes open, camps running (+25%)');
      } else if ([7, 8].includes(travelMonth)) {
        z += 0.6;
        positiveSignals.push('Ladakh summer season; allow a spare day for roadblocks (+16%)');
      } else if ([4, 10].includes(travelMonth)) {
        z += 0.4;
        positiveSignals.push('Ladakh shoulder season (+10%)');
      } else {
        z -= 0.85;
        riskSignals.push('Ladakh winter: sub-zero nights, high passes and camps closed (-22%)');
      }
    } else if (isLadakh) {
      z += 0.3;
    }

    // ── 3. Party Size & Group Viability ─────────────────────────────────────
    const adults = lead.adults ?? 2;
    const children = lead.children ?? 0;
    const totalPax = adults + children;

    if (totalPax === 2) {
      z += 0.55;
      positiveSignals.push('Couple / Honeymoon booking — rapid decision cycle (+15%)');
    } else if (totalPax >= 3 && totalPax <= 5) {
      z += 0.6;
      positiveSignals.push('Family travel group — high booking commitment (+16%)');
    } else if (totalPax >= 6) {
      z += 0.75;
      positiveSignals.push(`Large group booking (${totalPax} travelers) — high gross revenue (+20%)`);
    } else if (totalPax === 1) {
      z -= 0.25;
      riskSignals.push('Solo traveler inquiry — historically higher drop-out rate (-7%)');
    }

    // ── 4. Budget & Financial Viability ──────────────────────────────────────
    const nights = Math.max(lead.nights ?? 5, 2);
    if (lead.budget && lead.budget > 0) {
      const budgetPerPaxPerNight = lead.budget / (Math.max(totalPax, 1) * nights);
      if (budgetPerPaxPerNight >= 5000) {
        z += 0.85;
        positiveSignals.push(`Premium budget: ₹${Math.round(budgetPerPaxPerNight).toLocaleString()}/pax/night (+22%)`);
      } else if (budgetPerPaxPerNight >= 2500) {
        z += 0.5;
        positiveSignals.push(`Healthy budget: ₹${Math.round(budgetPerPaxPerNight).toLocaleString()}/pax/night (+13%)`);
      } else if (budgetPerPaxPerNight < 1200) {
        z -= 0.6;
        riskSignals.push(`Constrained budget (₹${Math.round(budgetPerPaxPerNight).toLocaleString()}/pax/night) may not cover private cabs (-16%)`);
      }
    } else {
      riskSignals.push('Budget unconfirmed — requires immediate qualification');
    }

    // ── 5. Response Latency (Speed-to-Lead) ──────────────────────────────────
    if (lead.createdAt) {
      const createdTime = new Date(lead.createdAt).getTime();
      if (lead.firstContactAt) {
        const contactTime = new Date(lead.firstContactAt).getTime();
        const latencyHours = (contactTime - createdTime) / 3600000;
        if (latencyHours <= 1) {
          z += 0.6;
          positiveSignals.push('Fast initial response (< 1 hour golden window) (+16%)');
        } else if (latencyHours <= 6) {
          z += 0.3;
          positiveSignals.push('Responsive first contact (< 6 hours) (+8%)');
        } else if (latencyHours > 24) {
          z -= 0.65;
          riskSignals.push(`Delayed first response (${Math.round(latencyHours)}h) increases lead decay (-17%)`);
        }
      } else {
        const ageHours = (Date.now() - createdTime) / 3600000;
        if (ageHours > 12 && lead.status === LeadStatus.NEW) {
          z -= 0.5;
          riskSignals.push(`Lead uncontacted for ${Math.round(ageHours)} hours (-14%)`);
        }
      }
    }

    if ((lead.enquiryCount ?? 1) > 1) {
      z += 0.45;
      positiveSignals.push(`Repeat inquiry (${lead.enquiryCount} times) shows persistent intent (+12%)`);
    }

    // ── 6. Message Keyword Intent Mining ────────────────────────────────────
    const msg = (lead.message || '').toLowerCase();
    const highIntentKeywords = [
      'permit',
      'flight',
      'honeymoon',
      'booked',
      'tickets',
      'dates fixed',
      'urgent',
      'ready',
      '4 star',
      'camp',
      'advance',
      'package price',
    ];
    const foundKeywords = highIntentKeywords.filter((k) => msg.includes(k));
    if (foundKeywords.length > 0) {
      z += 0.55;
      positiveSignals.push(`High-intent keywords mentioned: "${foundKeywords.slice(0, 3).join('", "')}" (+15%)`);
    }

    // ── 7. Calculate Sigmoid Win Probability & Score ─────────────────────────
    // P = 1 / (1 + e^-z)
    const winProbability = 1 / (1 + Math.exp(-z));
    const score = Math.min(99, Math.max(5, Math.round(winProbability * 100)));

    let grade: LeadGrade = 'COOL';
    if (score >= 75) grade = 'HOT';
    else if (score >= 50) grade = 'WARM';
    else if (score >= 30) grade = 'COOL';
    else grade = 'COLD';

    // ── 8. Next Best Action Recommendation ──────────────────────────────────
    let recommendedAction: string;
    if (grade === 'HOT') {
      recommendedAction =
        '🔥 Priority Lead: Call within 15 minutes, share custom Deluxe Itinerary PDF via WhatsApp, and offer Gondola Phase 1 booking assistance.';
    } else if (grade === 'WARM') {
      recommendedAction =
        '⚡ High Potential: Send customized 5N/6D quotation and follow up with a quick phone call to finalize travel dates.';
    } else if (grade === 'COOL') {
      recommendedAction =
        '❄️ Needs Nurturing: Qualify budget and dates via WhatsApp brochure before spending time on custom itinerary pricing.';
    } else {
      recommendedAction =
        '🧊 Cold / Long-Term: Enroll in automated seasonal broadcast campaign (e.g. Autumn / Snow season teaser).';
    }

    return {
      leadId: lead.id || 'sample',
      name: lead.name || 'Traveler',
      score,
      grade,
      winProbability: Math.round(winProbability * 100) / 100,
      positiveSignals: positiveSignals.slice(0, 6),
      riskSignals: riskSignals.slice(0, 5),
      recommendedAction,
      scoredAt: new Date(),
    };
  }
}
