import { InvoicesService } from './invoices.service';
describe('Invoice ownership', () => {
  const actor={id:'sales-1',role:'SALES_EXEC'} as const;
  it('denies another salesperson invoice and list before disclosure', async () => {
    const db={lead:{findUnique:jest.fn().mockResolvedValue({assignedToId:'sales-2'})},invoice:{findUnique:jest.fn().mockResolvedValue({id:'invoice',leadId:'lead-2'}),findMany:jest.fn()}};
    const service=new InvoicesService(db as any);
    await expect(service.findOne('invoice',actor)).rejects.toThrow('Lead not found');
    await expect(service.findByLead('lead-2',actor)).rejects.toThrow('Lead not found');
    expect(db.invoice.findMany).not.toHaveBeenCalled();
  });
  it('allows the assigned salesperson to read their invoice', async () => {
    const db={lead:{findUnique:jest.fn().mockResolvedValue({assignedToId:actor.id})},invoice:{findUnique:jest.fn().mockResolvedValue({id:'invoice',leadId:'lead-1'})}};
    await expect(new InvoicesService(db as any).findOne('invoice',actor)).resolves.toMatchObject({id:'invoice'});
  });
});
