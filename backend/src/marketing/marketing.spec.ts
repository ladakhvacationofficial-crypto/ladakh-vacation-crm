jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_MINUTE: '* * * * *',
  },
}));

import { CampaignChannel } from '@prisma/client';
import { MarketingService } from './marketing.service';
import { BrevoEmailService } from './brevo-email.service';

describe('Marketing Module', () => {
  describe('BrevoEmailService', () => {
    it('generates email payload with unsubscribe footer in test mode', async () => {
      const configServiceMock = {
        get: jest.fn().mockReturnValue(''), // no API key -> test mode
      };
      const brevo = new BrevoEmailService(configServiceMock as any);

      const res = await brevo.sendEmail({
        toEmail: 'traveler@example.com',
        toName: 'Rohan Sharma',
        subject: 'Autumn in Kashmir Promo',
        htmlContent: '<p>Special package discount</p>',
        unsubscribeUrl: 'https://ladakh-vacation-crm.vercel.app/api/marketing/unsubscribe/token-123',
      });

      expect(res.messageId).toContain('mock-brevo-');
    });
  });

  describe('Marketing Audience & Guardrails', () => {
    it('calculates audience cost and frequency capping correctly', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          name: 'Aamir',
          phone: '+919906000001',
          email: 'aamir@example.com',
          tags: ['kashmir'],
          destination: 'Srinagar',
        },
        {
          id: 'lead-2',
          name: 'Priya',
          phone: '+919906000002',
          email: 'priya@example.com',
          tags: ['MARKETING_OPT_OUT'], // should be excluded
          destination: 'Gulmarg',
        },
        {
          id: 'lead-3',
          name: 'Vikram',
          phone: '+919906000003',
          email: 'vikram@example.com',
          tags: [],
          destination: 'Pahalgam',
        },
      ];

      // lead-3 was messaged 2 days ago -> frequency capped
      const mockRecentRecipients = [{ leadId: 'lead-3' }];

      const prismaMock = {
        lead: {
          findMany: jest.fn().mockResolvedValue(mockLeads),
        },
        campaignRecipient: {
          findMany: jest.fn().mockResolvedValue(mockRecentRecipients),
        },
      };

      const whatsappMock = {
        sendTemplateMessage: jest.fn(),
      };

      const brevoMock = {
        sendEmail: jest.fn(),
      };

      const service = new MarketingService(
        prismaMock as any,
        whatsappMock as any,
        brevoMock as any,
      );

      const preview = await service.previewAudience(
        { tags: ['kashmir'] },
        CampaignChannel.WHATSAPP,
      );

      expect(preview.totalMatched).toBe(3);
      expect(preview.optOutCount).toBe(1); // lead-2
      expect(preview.frequencyCappedCount).toBe(1); // lead-3
      expect(preview.eligibleCount).toBe(1); // lead-1
      expect(preview.estimatedCost).toBe(0.72); // 1 * 0.72 INR
    });
  });
});
