import { GoogleAdsService } from './google-ads.service';
import { encryptSecret } from '../common/crypto';
describe('Google conversion provider acceptance',()=>{
  const originalFetch=global.fetch, originalKey=process.env.INTEGRATION_KEY;
  beforeEach(()=>{process.env.INTEGRATION_KEY='test-only-key';});
  afterEach(()=>{global.fetch=originalFetch;if(originalKey===undefined) delete process.env.INTEGRATION_KEY;else process.env.INTEGRATION_KEY=originalKey;});
  function service() {
    const credentials=encryptSecret(JSON.stringify({developerToken:'test',clientId:'client',clientSecret:'secret',refreshToken:'refresh',customerId:'1234567890',conversionActionId:'123'}));
    return new GoogleAdsService({integration:{findFirst:jest.fn().mockResolvedValue({id:'integration',credentials})}} as any);
  }
  it('refreshes OAuth and requires an accepted result for this click',async()=>{
    const fetcher=jest.fn().mockResolvedValueOnce({ok:true,text:async()=>JSON.stringify({access_token:'token'})}).mockResolvedValueOnce({ok:true,json:async()=>({results:[{gclid:'click'}]})});
    global.fetch=fetcher as any;
    await expect(service().uploadClickConversion({gclid:'click',value:50000,orderId:'LV-B-test'})).resolves.toEqual({accepted:true});
    const payload=JSON.parse(fetcher.mock.calls[1][1].body);
    expect(payload.conversions[0].conversionDateTime).toMatch(/\+00:00$/);
    expect(payload.conversions[0].orderId).toBe('LV-B-test');
  });
  it('rejects an HTTP-success response containing a partial failure',async()=>{
    global.fetch=jest.fn().mockResolvedValueOnce({ok:true,text:async()=>JSON.stringify({access_token:'token'})}).mockResolvedValueOnce({ok:true,json:async()=>({partialFailureError:{code:3},results:[{}]})}) as any;
    await expect(service().uploadClickConversion({gclid:'click',value:50000,orderId:'LV-B-test'})).rejects.toThrow('did not accept');
  });
});
