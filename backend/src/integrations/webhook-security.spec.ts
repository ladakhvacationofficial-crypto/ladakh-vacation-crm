jest.mock('./webhooks.service',()=>({WebhooksService:class {}}));
import { WebhooksController } from './webhooks.controller';
import { createHmac } from 'crypto';
describe('Meta webhook authentication',()=>{
  const oldSecret=process.env.META_APP_SECRET, oldToken=process.env.META_VERIFY_TOKEN;
  afterEach(()=>{if(oldSecret===undefined) delete process.env.META_APP_SECRET;else process.env.META_APP_SECRET=oldSecret;if(oldToken===undefined) delete process.env.META_VERIFY_TOKEN;else process.env.META_VERIFY_TOKEN=oldToken;});
  it('rejects missing verification setup and the wrong verification token',()=>{
    const controller=new WebhooksController({} as any);
    delete process.env.META_VERIFY_TOKEN;
    expect(()=>controller.verifyMetaWebhook('subscribe','challenge','token')).toThrow();
    process.env.META_VERIFY_TOKEN='correct';
    expect(()=>controller.verifyMetaWebhook('subscribe','challenge','wrong')).toThrow();
    expect(controller.verifyMetaWebhook('subscribe','challenge','correct')).toBe('challenge');
  });
  it('requires a valid signature before invoking business logic',()=>{
    const service={processMetaWebhook:jest.fn()}; const controller=new WebhooksController(service as any);
    const rawBody=Buffer.from('{}');
    delete process.env.META_APP_SECRET;
    expect(()=>controller.receiveMetaWebhook({} as any,'',{rawBody} as any)).toThrow();
    process.env.META_APP_SECRET='test-secret';
    expect(()=>controller.receiveMetaWebhook({} as any,'wrong',{rawBody} as any)).toThrow();
    expect(service.processMetaWebhook).not.toHaveBeenCalled();
    const signature='sha256='+createHmac('sha256','test-secret').update(rawBody).digest('hex');
    controller.receiveMetaWebhook({} as any,signature,{rawBody} as any);
    expect(service.processMetaWebhook).toHaveBeenCalledTimes(1);
  });
});
