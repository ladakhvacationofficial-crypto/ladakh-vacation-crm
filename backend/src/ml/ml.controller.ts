import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor } from '../common/access';
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MlScoringService } from './ml-scoring.service';
import { MlForecastingService } from './ml-forecasting.service';
import { MlClusteringService } from './ml-clustering.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { INTERNAL_STAFF, FULL_LEAD_ACCESS } from '../common/access';

@Controller('ml')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MlController {
  constructor(
    private readonly scoring: MlScoringService,
    private readonly forecasting: MlForecastingService,
    private readonly clustering: MlClusteringService,
  ) {}

  /**
   * Score a single lead in real time, persist the score, and return explainable signals.
   */
  @Roles(...INTERNAL_STAFF)
  @Get('leads/:id/score')
  scoreLead(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.scoring.scoreLeadById(id, actor);
  }

  /**
   * Batch re-score active leads across the pipeline.
   */
  @Roles(...FULL_LEAD_ACCESS)
  @Post('leads/batch-score')
  batchScore(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 100;
    return this.scoring.batchScoreActiveLeads(lim);
  }

  /**
   * 90-day predictive tourism demand forecast with dynamic pricing & margin recommendations.
   */
  @Roles(...INTERNAL_STAFF)
  @Get('forecast')
  getForecast() {
    return this.forecasting.getTourismDemandForecast();
  }

  /**
   * K-Means traveler cohort segmentation & targeted marketing pitches.
   */
  @Roles(...INTERNAL_STAFF)
  @Get('clusters')
  getClusters() {
    return this.clustering.getTravelerClusters();
  }

  /**
   * Real-time dynamic pricing and surge margin evaluation for quotes and itinerary builder.
   */
  @Roles(...INTERNAL_STAFF)
  @Get('dynamic-margin')
  getDynamicMargin(
    @Query('date') date?: string,
    @Query('destination') destination?: string,
  ) {
    return this.forecasting.getDynamicMarginForDate(date, destination);
  }
}
