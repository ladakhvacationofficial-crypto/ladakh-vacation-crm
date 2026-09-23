import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MonthlyForecastPoint {
  monthName: string;
  monthIndex: number; // 1-12
  year: number;
  projectedInquiries: number;
  projectedBookings: number;
  expectedGrossRevenue: number;
  demandIndex: number; // 1.0 = baseline average, 1.4 = 40% surge
  peakSeasonTag?: string;
  marginAdvice: {
    recommendedMarginPercent: number;
    pricingStrategy: 'PREMIUM_SURGE' | 'OPTIMAL_STANDARD' | 'VOLUME_PROMOTIONAL';
    headline: string;
    actionableAdvice: string;
  };
}

export interface DestinationForecastBreakdown {
  destination: string;
  next30DaysDemand: number;
  next60DaysDemand: number;
  next90DaysDemand: number;
  trend: 'SURGING' | 'STABLE' | 'DECLINING';
  keyDriver: string;
}

export interface TourismForecastResponse {
  generatedAt: Date;
  horizonDays: 90;
  monthlyProjections: MonthlyForecastPoint[];
  destinationBreakdown: DestinationForecastBreakdown[];
  operationalAlerts: string[];
}

@Injectable()
export class MlForecastingService {
  private readonly logger = new Logger(MlForecastingService.name);

  // 12-month Ladakh seasonality index (1.0 = annual average). A planning
  // heuristic, not measured data: Ladakh's season is set by the roads, which
  // open from May and close from November, and by the camps, which run
  // roughly May to September. Replace with booking history once it exists.
  private readonly LADAKH_SEASONALITY_WEIGHTS: Record<number, { factor: number; tag: string }> = {
    1: { factor: 0.4, tag: 'Deep winter: Leh by air only' }, // Jan
    2: { factor: 0.4, tag: 'Deep winter: Leh by air only' }, // Feb
    3: { factor: 0.55, tag: 'Late winter: high roads still closed' }, // Mar
    4: { factor: 0.85, tag: 'Season opening: Leh and the monasteries' }, // Apr
    5: { factor: 1.55, tag: 'Peak: snow-lined passes, roads opening' }, // May
    6: { factor: 1.7, tag: 'Peak: every route and camp open' }, // Jun
    7: { factor: 1.4, tag: 'Summer: warmest weeks, Hemis festival' }, // Jul
    8: { factor: 1.3, tag: 'Summer: roadblock risk from rain elsewhere' }, // Aug
    9: { factor: 1.5, tag: 'Clear skies, thin crowds, best at Hanle' }, // Sep
    10: { factor: 1.1, tag: 'Autumn shoulder: camps closing' }, // Oct
    11: { factor: 0.5, tag: 'High roads closing for winter' }, // Nov
    12: { factor: 0.45, tag: 'Winter: Leh by air only' }, // Dec
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a 90-day predictive demand forecast with dynamic pricing recommendations.
   */
  async getTourismDemandForecast(): Promise<TourismForecastResponse> {
    this.logger.log('Generating ML tourism demand forecast for upcoming 90 days');

    // Estimates from observed volume, with explicit heuristic seasonality.
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [leadCount, bookings] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: since } } }),
      this.prisma.booking.aggregate({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } }, _count: true, _avg: { totalSell: true } }),
    ]);
    const baseMonthlyInquiries = leadCount / 3;
    const baseMonthlyBookings = bookings._count / 3;
    const baseAvgBookingValue = bookings._avg.totalSell ?? 0;

    const currentDate = new Date();
    const monthlyProjections: MonthlyForecastPoint[] = [];

    // Forecast for next 3 calendar months
    for (let offset = 0; offset < 3; offset++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
      const monthIndex = targetDate.getMonth() + 1;
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'long' });
      const year = targetDate.getFullYear();

      const seasonal = this.LADAKH_SEASONALITY_WEIGHTS[monthIndex] || { factor: 1.0, tag: 'Standard Tourism Period' };
      const demandIndex = Math.round(seasonal.factor * 100) / 100;

      // Observed monthly average multiplied by a heuristic seasonal factor
      const projectedInquiries = Math.round(baseMonthlyInquiries * demandIndex);
      const projectedBookings = Math.round(baseMonthlyBookings * demandIndex);
      const expectedGrossRevenue = projectedBookings * baseAvgBookingValue;

      // Dynamic margin logic
      let marginAdvice: MonthlyForecastPoint['marginAdvice'];
      if (demandIndex >= 1.35) {
        marginAdvice = {
          recommendedMarginPercent: 22,
          pricingStrategy: 'PREMIUM_SURGE',
          headline: `High Demand Surge in ${monthName} (+${Math.round((demandIndex - 1) * 100)}%)`,
          actionableAdvice:
            'Leh hotels, Nubra and Pangong camps and 4×4s will be scarce. Raise package markup to 20–25% and pre-block camp and hotel inventory immediately.',
        };
      } else if (demandIndex >= 1.1) {
        marginAdvice = {
          recommendedMarginPercent: 18,
          pricingStrategy: 'OPTIMAL_STANDARD',
          headline: `Healthy Steady Demand in ${monthName}`,
          actionableAdvice:
            'Maintain standard 16–18% markup. Offer a free extra acclimatisation night in Leh or an airport upgrade to close hesitant quotes faster.',
        };
      } else {
        marginAdvice = {
          recommendedMarginPercent: 12,
          pricingStrategy: 'VOLUME_PROMOTIONAL',
          headline: `Moderate / Off-Peak in ${monthName}`,
          actionableAdvice:
            'Off-season: most high roads are closed and many camps shut. Sell Leh, monastery and winter trips by air on a lean 10–12% margin.',
        };
      }

      monthlyProjections.push({
        monthName,
        monthIndex,
        year,
        projectedInquiries,
        projectedBookings,
        expectedGrossRevenue,
        demandIndex,
        peakSeasonTag: seasonal.tag,
        marginAdvice,
      });
    }

    // No destination allocation is inferred without destination booking data.
    const destinationBreakdown: DestinationForecastBreakdown[] = [];

    const operationalAlerts: string[] = [
      'Planning estimates use the last 90 days and heuristic seasonal factors, not a trained forecast. Zero history means zero projected volume.',
      `📈 Projected 90-day gross inquiry volume: ${monthlyProjections.reduce((a, b) => a + b.projectedInquiries, 0).toLocaleString()} inquiries.`,
      `💰 Expected gross booking pipeline: ₹${(monthlyProjections.reduce((a, b) => a + b.expectedGrossRevenue, 0) / 100000).toFixed(1)} Lakhs.`,
      `⚡ Dynamic Pricing Alert: ${monthlyProjections[0].marginAdvice.headline}. Implement ${monthlyProjections[0].marginAdvice.recommendedMarginPercent}% markup.`,
      `🚗 Fleet Advisory: Pre-block Innova Crysta and Xylo 4×4s, with oxygen and oximeters checked, for the May–June and September peaks.`,
    ];

    return {
      generatedAt: new Date(),
      horizonDays: 90,
      monthlyProjections,
      destinationBreakdown,
      operationalAlerts,
    };
  }

  /**
   * Evaluates dynamic pricing margin advice for a specific travel date and destination.
   * Useful for real-time quoting in the Itinerary Tier Builder.
   */
  getDynamicMarginForDate(
    travelDateInput?: Date | string | null,
    destination?: string | null,
  ) {
    let date = new Date();
    if (travelDateInput) {
      const parsed = new Date(travelDateInput);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }

    const monthIndex = date.getMonth() + 1;
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const seasonal = this.LADAKH_SEASONALITY_WEIGHTS[monthIndex] || {
      factor: 1.0,
      tag: 'Standard Tourism Period',
    };

    let demandIndex = seasonal.factor;

    // Destination-specific fine-tuning
    const destLower = (destination || '').toLowerCase();
    if ((destLower.includes('hanle') || destLower.includes('moriri')) && (monthIndex === 9 || monthIndex === 10)) {
      demandIndex += 0.15; // clearest skies at Hanle
    } else if ((destLower.includes('pangong') || destLower.includes('nubra')) && monthIndex >= 6 && monthIndex <= 8) {
      demandIndex += 0.1; // camps full through the summer
    }

    demandIndex = Math.round(demandIndex * 100) / 100;
    const surgePercentage = Math.max(0, Math.round((demandIndex - 1.0) * 100));

    if (demandIndex >= 1.35) {
      return {
        recommendedMarginPercent: 22,
        demandIndex,
        surgePercentage,
        strategy: 'PREMIUM_SURGE' as const,
        badge: `🔥 Peak Surge (+${surgePercentage}%)`,
        headline: `High Demand Surge in ${monthName}`,
        seasonTag: seasonal.tag,
        actionableAdvice: `High seasonal occupancy. Recommend 20–25% margin (suggested: 22%).`,
      };
    } else if (demandIndex >= 1.1) {
      return {
        recommendedMarginPercent: 18,
        demandIndex,
        surgePercentage,
        strategy: 'OPTIMAL_STANDARD' as const,
        badge: `⚡ Steady Season (+${surgePercentage}%)`,
        headline: `Steady Demand in ${monthName}`,
        seasonTag: seasonal.tag,
        actionableAdvice: `Optimal steady market. Recommend standard 16–18% margin (suggested: 18%).`,
      };
    } else {
      return {
        recommendedMarginPercent: 12,
        demandIndex,
        surgePercentage: 0,
        strategy: 'VOLUME_PROMOTIONAL' as const,
        badge: `❄️ Value Season`,
        headline: `Moderate / Off-Peak in ${monthName}`,
        seasonTag: seasonal.tag,
        actionableAdvice: `Off-season in Ladakh. Recommend a lean 12% margin, and check the route is open on these dates.`,
      };
    }
  }
}
