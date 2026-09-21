import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private prisma: PrismaService) {}

  private async getCredentials() {
    const integration = await this.prisma.integration.findFirst({
      where: { provider: 'whatsapp_cloud', isActive: true },
    });

    if (!integration) {
      throw new BadRequestException('WhatsApp integration is not configured or active.');
    }

    const creds = JSON.parse(decryptSecret(integration.credentials));
    if (!creds.phoneNumberId || !creds.accessToken) {
      throw new BadRequestException('WhatsApp credentials are fundamentally broken.');
    }

    return creds;
  }

  /**
   * Dispatches a free-form text message via the WhatsApp Cloud API.
   * Note: In production, outside of the 24-hour service window, 
   * you must use pre-approved Message Templates instead of free-form text.
   */
  async sendMessage(phone: string, text: string): Promise<any> {
    const creds = await this.getCredentials();
    const url = `https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`;
    const cleanPhone = phone.replace(/\D/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`WhatsApp send failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(`WhatsApp API Error: ${data.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * Dispatches an approved Marketing / Utility Template message via WhatsApp Cloud API.
   * Required by Meta for all outbound marketing broadcasts.
   */
  async sendTemplateMessage(
    phone: string,
    templateName: string,
    languageCode: string = 'en',
    bodyParameters: { type: string; text: string }[] = [],
  ): Promise<{ messageId: string }> {
    const creds = await this.getCredentials();
    const url = `https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`;
    const cleanPhone = phone.replace(/\D/g, '');

    const components: any[] = [];
    if (bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters,
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      this.logger.error(`WhatsApp template send failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(`WhatsApp API Error: ${data.error?.message || 'Unknown error'}`);
    }

    const messageId = data.messages?.[0]?.id || data.id || '';
    return { messageId };
  }

  /**
   * Fetches approved message templates from Meta Business Account (WABA).
   * If WABA ID is missing or call fails, returns fallback templates for development.
   */
  async listTemplates(): Promise<any[]> {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: { provider: 'whatsapp_cloud', isActive: true },
      });

      if (!integration) return this.getDefaultTemplates();

      const creds = JSON.parse(decryptSecret(integration.credentials));
      if (!creds.wabaId || !creds.accessToken) return this.getDefaultTemplates();

      const url = `https://graph.facebook.com/v19.0/${creds.wabaId}/message_templates?limit=100`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${creds.accessToken}` },
      });

      if (!res.ok) {
        this.logger.warn(`Failed to fetch Meta templates from API, using fallback templates`);
        return this.getDefaultTemplates();
      }

      const data = await res.json();
      const approved = (data.data || []).filter((t: any) => t.status === 'APPROVED');
      return approved.length > 0 ? approved : this.getDefaultTemplates();
    } catch (err) {
      this.logger.warn(`listTemplates error: ${err}`);
      return this.getDefaultTemplates();
    }
  }

  private getDefaultTemplates() {
    return [
      {
        name: 'ladakh_seasonal_offer',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hello {{1}}, planning {{2}} this season? Our team in Leh can send you a day-by-day itinerary with permits, a private 4×4 and oxygen on board. Reply to this message and we will share it.',
          },
        ],
      },
      {
        name: 'followup_reconnect',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hi {{1}}, we noticed you were inquiring about {{2}}. Our travel specialists have refreshed itineraries available. Would you like to review them?',
          },
        ],
      },
      {
        name: 'lv_announcement',
        category: 'MARKETING',
        language: 'en',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Greetings {{1}}! Ladakh Vacation has launched new curated tours for the upcoming holiday season. Click here to check the details.',
          },
        ],
      },
    ];
  }
}
