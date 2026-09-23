import { MlForecastingService } from './ml-forecasting.service';

describe('MlForecastingService', () => {
  let service: MlForecastingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      lead: { count: jest.fn().mockResolvedValue(90) },
      booking: { aggregate: jest.fn().mockResolvedValue({ _count: 45, _avg: {totalSell: 30000} }) },
    };
    service = new MlForecastingService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates 90-day monthly forecasts with dynamic margin guidance', async () => {
    const forecast = await service.getTourismDemandForecast();

    expect(forecast.horizonDays).toBe(90);
    expect(forecast.monthlyProjections.length).toBe(3);
    expect(forecast.destinationBreakdown).toEqual([]);
    expect(forecast.operationalAlerts.length).toBeGreaterThan(0);

    // Verify first month structure
    const m1 = forecast.monthlyProjections[0];
    expect(m1.projectedInquiries).toBeGreaterThan(0);
    expect(m1.projectedBookings).toBeGreaterThan(0);
    expect(m1.marginAdvice).toBeDefined();
    expect(m1.marginAdvice.recommendedMarginPercent).toBeGreaterThanOrEqual(10);
  });

  it('evaluates dynamic margin for specific dates and destinations', () => {
    // Peak summer on the Nubra and Pangong circuit (June)
    const peakSummer = service.getDynamicMarginForDate('2026-06-15', 'Nubra & Pangong');
    expect(peakSummer.strategy).toBe('PREMIUM_SURGE');
    expect(peakSummer.recommendedMarginPercent).toBe(22);
    expect(peakSummer.surgePercentage).toBeGreaterThanOrEqual(35);

    // Clear-sky season at Hanle (September)
    const clearSkies = service.getDynamicMarginForDate('2026-09-20', 'Hanle');
    expect(clearSkies.strategy).toBe('PREMIUM_SURGE');
    expect(clearSkies.recommendedMarginPercent).toBe(22);

    // Autumn shoulder (October)
    const shoulder = service.getDynamicMarginForDate('2026-10-20', 'Leh');
    expect(shoulder.recommendedMarginPercent).toBe(18);

    // Deep winter (January): roads closed, lean margin
    const winter = service.getDynamicMarginForDate('2026-01-15', 'Leh');
    expect(winter.strategy).toBe('VOLUME_PROMOTIONAL');
  });
});
