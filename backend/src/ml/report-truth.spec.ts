import { MlClusteringService } from './ml-clustering.service';
import { MlForecastingService } from './ml-forecasting.service';
describe('Report truthfulness',()=>{
  it('keeps empty history empty',async()=>{
    const db:any={lead:{findMany:jest.fn().mockResolvedValue([]),count:jest.fn().mockResolvedValue(0)},booking:{aggregate:jest.fn().mockResolvedValue({_count:0,_avg:{totalSell:null}})}};
    const cohorts=await new MlClusteringService(db).getTravelerClusters();
    expect(cohorts.totalLeadsAnalyzed).toBe(0);
    expect(cohorts.clusters.every(c=>c.size===0 && c.conversionRate===0)).toBe(true);
    const forecast=await new MlForecastingService(db).getTourismDemandForecast();
    expect(forecast.monthlyProjections.every(m=>m.projectedInquiries===0 && m.projectedBookings===0 && m.expectedGrossRevenue===0)).toBe(true);
  });
  it('counts real cohorts and computes conversion from recorded statuses',async()=>{
    const db:any={lead:{findMany:jest.fn().mockResolvedValue([{budget:100000,adults:2,children:0,nights:5,destination:'Leh',status:'CONFIRMED'}, {budget:100000,adults:2,children:0,nights:5,destination:'Leh',status:'NEW'}])}};
    const result=await new MlClusteringService(db).getTravelerClusters();
    expect(result.clusters[0]).toMatchObject({size:2,conversionRate:0.5,percentageOfTotal:100});
    expect(result.clusters.reduce((n,c)=>n+c.size,0)).toBe(2);
    expect(result.clusters.slice(1).every(c=>c.size===0)).toBe(true);
  });
  it('propagates database failures instead of generating invented projections',async()=>{
    const db:any={lead:{count:jest.fn().mockRejectedValue(new Error('database unavailable'))},booking:{aggregate:jest.fn()}};
    await expect(new MlForecastingService(db).getTourismDemandForecast()).rejects.toThrow('database unavailable');
  });
});
