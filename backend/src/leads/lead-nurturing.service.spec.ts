import { LeadNurturingService } from './lead-nurturing.service';

describe('LeadNurturingService', () => {
  let service: LeadNurturingService;
  let mockPrisma: any;
  let mockWhatsApp: any;

  beforeEach(() => {
    mockPrisma = {
      integration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      activity: {
        create: jest.fn().mockResolvedValue({ id: 'act-1' }),
      },
    };
    mockWhatsApp = {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };
    service = new LeadNurturingService(mockPrisma, mockWhatsApp);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects invalid or missing phone numbers gracefully', async () => {
    const res1 = await service.dispatchInstantAcknowledgment({
      id: 'l-1',
      name: 'John Doe',
      phone: '',
    });
    expect(res1.dispatched).toBe(false);

    const res2 = await service.dispatchInstantAcknowledgment({
      id: 'l-2',
      name: 'John Doe',
      phone: '123',
    });
    expect(res2.dispatched).toBe(false);
  });

  it('reports no dispatch when WhatsApp integration is inactive', async () => {
    const res = await service.dispatchInstantAcknowledgment({
      id: 'l-3',
      name: 'Aamir Khan',
      phone: '+91 9876543210',
      destination: 'Gulmarg',
      score: 85,
    });

    expect(res.dispatched).toBe(false);
    expect(mockPrisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'l-3',
          content: expect.stringContaining('Gulmarg'),
        }),
      }),
    );
  });

  it('dispatches via WhatsApp Cloud API when integration is active', async () => {
    mockPrisma.integration.findFirst.mockResolvedValueOnce({
      id: 'int-1',
      provider: 'whatsapp_cloud',
      isActive: true,
    });

    const res = await service.dispatchInstantAcknowledgment({
      id: 'l-4',
      name: 'Priya Sharma',
      phone: '+91 9811122233',
      destination: 'Kashmir',
    });

    expect(res.dispatched).toBe(true);
    expect(mockWhatsApp.sendMessage).toHaveBeenCalledWith(
      '+91 9811122233',
      expect.stringContaining('Priya'),
    );
  });
});
