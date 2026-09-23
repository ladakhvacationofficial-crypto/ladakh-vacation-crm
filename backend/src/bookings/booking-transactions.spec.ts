import { BookingsService } from './bookings.service';
describe('Booking transaction boundaries',()=>{
  it('creates booking, lead stage and activity inside one transaction before uploading conversion',async()=>{
    const events:string[]=[];
    const tx:any={booking:{findFirst:jest.fn().mockResolvedValue(null),create:jest.fn().mockImplementation(async()=>{events.push('booking');return {id:'b',bookingNumber:'LV-B',totalSell:10000};})},lead:{update:jest.fn().mockImplementation(async()=>events.push('lead'))},activity:{create:jest.fn().mockImplementation(async()=>events.push('activity'))}};
    const db:any={lead:{findUnique:jest.fn().mockResolvedValue({id:'lead',name:'Traveller'})},$transaction:jest.fn(async(fn:any)=>{const result=await fn(tx);events.push('commit');return result;})};
    const conversion={uploadBookingConversion:jest.fn(async()=>events.push('conversion'))};
    await new BookingsService(db,conversion as any).create({leadId:'lead',totalSell:10000},{id:'owner',role:'OWNER'});
    expect(events).toEqual(['booking','lead','activity','commit','conversion']);
  });
  it('does not upload conversion if a transactional write fails',async()=>{
    const tx:any={booking:{findFirst:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue({id:'b'})},lead:{update:jest.fn().mockRejectedValue(new Error('write failed'))}};
    const db:any={lead:{findUnique:jest.fn().mockResolvedValue({id:'lead'})},$transaction:jest.fn((fn:any)=>fn(tx))};
    const conversion={uploadBookingConversion:jest.fn()};
    await expect(new BookingsService(db,conversion as any).create({leadId:'lead',totalSell:10000},{id:'owner',role:'OWNER'})).rejects.toThrow('write failed');
    expect(conversion.uploadBookingConversion).not.toHaveBeenCalled();
  });
  it('updates cancellation and its audit within the locked transaction', async () => {
    const events: string[] = [];
    const booking = { id: 'b', leadId: 'l', bookingNumber: 'LV-B', status: 'CONFIRMED' };
    const tx: any = {
      $queryRaw: jest.fn(async () => events.push('lock')),
      booking: { findUnique: jest.fn().mockResolvedValue(booking), update: jest.fn(async () => events.push('update')) },
      activity: { create: jest.fn(async () => events.push('audit')) },
      lead: { update: jest.fn(async () => events.push('lead')) },
    };
    const db: any = { booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      $transaction: jest.fn(async (fn: any) => { await fn(tx); events.push('commit'); }) };
    const service = new BookingsService(db, {} as any);
    jest.spyOn(service as any, 'assertBookingAccess').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'detail').mockResolvedValue({} as any);
    await service.update('b', { status: 'CANCELLED' } as any, { id: 'owner', role: 'OWNER' });
    expect(events).toEqual(['lock', 'update', 'audit', 'lead', 'commit']);
  });
});
