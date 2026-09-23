jest.mock('@nestjs/schedule',()=>({Cron:()=>()=>{},CronExpression:{EVERY_MINUTE:'* * * * *'}}));
import { LeadsService } from './leads.service';
describe('Formatted phone deduplication',()=>{
  it('matches the normalized key instead of a formatted display number',async()=>{
    const db:any={lead:{findFirst:jest.fn().mockResolvedValue({id:'existing',phone:'+91 98765 43210',phoneKey:'9876543210',enquiryCount:1,source:'WEBSITE',createdAt:new Date()}),update:jest.fn().mockResolvedValue({id:'existing',score:20}),create:jest.fn()},activity:{create:jest.fn()}};
    const service=new (LeadsService as any)(db,{}, {}, {}, {});
    const result=await service.capture({name:'Test Traveller',phone:'9876543210'},{ });
    expect(db.lead.findFirst.mock.calls[0][0].where.phoneKey).toBe('9876543210');
    expect(db.lead.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({duplicate:true,leadId:'existing'});
  });
});
