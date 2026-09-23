jest.mock('@nestjs/schedule',()=>({Cron:()=>()=>{},CronExpression:{EVERY_MINUTE:'* * * * *'}}));
import { MarketingService } from './marketing.service';
describe('Campaign recipient safety', () => {
  function fixture() {
    const leads=[{id:'eligible',name:'Eligible',phone:'1234567890',email:'a@example.com',tags:[],destination:'Leh'},
      {id:'capped',name:'Capped',phone:'1234567891',email:'b@example.com',tags:[]},
      {id:'optout',name:'Optout',phone:'1234567892',email:'c@example.com',tags:['MARKETING_OPT_OUT']}];
    const db:any={lead:{findMany:jest.fn().mockResolvedValue(leads)},campaignRecipient:{findMany:jest.fn().mockResolvedValue([{leadId:'capped'}]),deleteMany:jest.fn(),createMany:jest.fn()},campaign:{findUnique:jest.fn().mockResolvedValue({id:'campaign',status:'DRAFT',channel:'WHATSAPP',audienceFilter:{minScore:60,maxScore:90,inactiveDays:14}}),updateMany:jest.fn().mockResolvedValue({count:1})}};
    const service=new MarketingService(db,{} as any,{} as any);
    jest.spyOn(service as any,'executeBroadcast').mockResolvedValue(undefined);
    return {db,service};
  }
  it('executes the same filters and cap as the preview',async()=>{
    const {db,service}=fixture();
    const preview=await service.previewAudience({minScore:60,maxScore:90,inactiveDays:14},'WHATSAPP');
    await service.sendCampaign('campaign',{id:'owner',role:'OWNER'});
    expect(preview.eligibleCount).toBe(1);
    expect(db.campaignRecipient.createMany.mock.calls[0][0].data.map((r:any)=>r.leadId)).toEqual(['eligible']);
    for(const [query] of db.lead.findMany.mock.calls) {
      expect(query.where.score).toEqual({gte:60,lte:90});
      expect(query.where.lastContact.lte).toBeInstanceOf(Date);
    }
  });
  it('does not start a second broadcast when another request has claimed it',async()=>{
    const {db,service}=fixture(); db.campaign.updateMany.mockResolvedValue({count:0});
    await expect(service.sendCampaign('campaign',{id:'owner',role:'OWNER'})).rejects.toThrow('claimed');
    expect(db.campaignRecipient.deleteMany).not.toHaveBeenCalled();
    expect((service as any).executeBroadcast).not.toHaveBeenCalled();
  });
  it('stops a cancelled broadcast before its next provider call',async()=>{
    const db:any={campaignRecipient:{findMany:jest.fn().mockResolvedValue([{id:'recipient',phone:'1234567890'}])},campaign:{findUnique:jest.fn().mockResolvedValue({status:'CANCELLED'})}};
    const whatsapp={sendTemplateMessage:jest.fn()};
    const service=new MarketingService(db,whatsapp as any,{} as any);
    await (service as any).executeBroadcast('campaign',{channel:'WHATSAPP'},[]);
    expect(whatsapp.sendTemplateMessage).not.toHaveBeenCalled();
  });
});
