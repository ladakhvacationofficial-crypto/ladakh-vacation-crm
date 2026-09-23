import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TravelerCluster {
  id: string;
  name: string;
  badgeEmoji: string;
  description: string;
  size: number;
  percentageOfTotal: number;
  avgBudget: number;
  avgPax: number;
  avgNights: number;
  conversionRate: number; // e.g. 0.42
  recommendedPitch: string;
  sampleWhatsAppPitch: string;
}

export interface ClusterAnalysisResult {
  generatedAt: Date;
  totalLeadsAnalyzed: number;
  clusters: TravelerCluster[];
  actionableInsights: string[];
}

@Injectable()
export class MlClusteringService {
  constructor(private readonly prisma: PrismaService) {}

  async getTravelerClusters(): Promise<ClusterAnalysisResult> {
    const leads = await this.prisma.lead.findMany({
      select: { budget: true, adults: true, children: true, nights: true, destination: true, status: true },
      take: 250, orderBy: { createdAt: 'desc' },
    });
    const definitions = [
      ['luxury-couples', 'Higher-budget couples'], ['family-leisure', 'Families and groups'],
      ['adventure-trekkers', 'Long trips and adventure'], ['value-explorers', 'Other enquiries'],
    ];
    const groups: typeof leads[] = definitions.map(() => []);
    for (const lead of leads) {
      const pax = (lead.adults ?? 0) + (lead.children ?? 0);
      const perNight = pax > 0 && (lead.nights ?? 0) > 0 ? (lead.budget ?? 0) / (pax * lead.nights!) : 0;
      const index = perNight >= 4500 && pax <= 3 ? 0 : pax >= 4 ? 1 :
        /trek|bike|overland/i.test(lead.destination ?? '') || (lead.nights ?? 0) >= 8 ? 2 : 3;
      groups[index].push(lead);
    }
    const clusters = definitions.map(([id, name], index): TravelerCluster => {
      const rows = groups[index];
      const average = (values: (number | null)[]) => {
        const known = values.filter((v): v is number => v !== null);
        return known.length ? Math.round(known.reduce((a,b) => a+b, 0) / known.length) : 0;
      };
      return {
        id, name, badgeEmoji: '', description: 'Rule-based segment of the latest 250 recorded enquiries.',
        size: rows.length, percentageOfTotal: leads.length ? Math.round(rows.length / leads.length * 100) : 0,
        avgBudget: average(rows.map(r => r.budget)), avgNights: average(rows.map(r => r.nights)),
        avgPax: average(rows.map(r => r.adults === null ? null : r.adults + (r.children ?? 0))),
        conversionRate: rows.length ? rows.filter(r => r.status === 'CONFIRMED').length / rows.length : 0,
        recommendedPitch: 'Confirm dates, budget and traveller needs before preparing a quote.',
        sampleWhatsAppPitch: 'Hi {name}, could you confirm your travel dates and preferences for your Ladakh trip?',
      };
    });
    return { generatedAt: new Date(), totalLeadsAnalyzed: leads.length, clusters,
      actionableInsights: [leads.length ? 'Counts and conversion rates use the latest 250 recorded leads. These are descriptive segments, not trained predictions.' : 'No enquiries recorded yet. There is no customer data to analyse.'] };
  }
}
