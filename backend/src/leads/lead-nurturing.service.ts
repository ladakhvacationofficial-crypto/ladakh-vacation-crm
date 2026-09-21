import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../integrations/whatsapp.service';

export interface NurtureLeadPayload {
  id: string;
  name: string;
  phone: string;
  destination?: string | null;
  score?: number | null;
  source?: string | null;
  adults?: number | null;
  children?: number | null;
  travelDate?: Date | null;
}

@Injectable()
export class LeadNurturingService {
  private readonly logger = new Logger(LeadNurturingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Dispatches instant welcome acknowledgment and digital brochure link
   * within seconds of lead capture (< 1 minute speed-to-lead).
   */
  async dispatchInstantAcknowledgment(
    lead: NurtureLeadPayload,
  ): Promise<{ dispatched: boolean; reason: string }> {
    if (!lead.phone) {
      return { dispatched: false, reason: 'No phone number provided' };
    }

    const cleanPhone = lead.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return { dispatched: false, reason: 'Invalid phone number format' };
    }

    const dest = lead.destination || 'Ladakh';
    const firstName = lead.name?.split(' ')[0] || 'Traveler';

    const message =
      `Julley ${firstName}! 🏔️ Thank you for enquiring with Ladakh Vacation about your ${dest} trip.\n\n` +
      `A planner in our Leh office has your details and is putting together your day-by-day itinerary. ` +
      `You can also browse our packages here: https://ladakhvacation.in/packages\n\n` +
      `If you have dates, flight times or must-see places (Nubra, Pangong, Hanle, Turtuk), just reply to this message.`;

    // Check if WhatsApp integration is active
    let isConfigured = false;
    try {
      const integration = await this.prisma.integration.findFirst({
        where: { provider: 'whatsapp_cloud', isActive: true },
      });
      isConfigured = Boolean(integration);
    } catch {
      isConfigured = false;
    }

    if (isConfigured) {
      try {
        await this.whatsapp.sendMessage(lead.phone, message);
        await this.prisma.activity.create({
          data: {
            leadId: lead.id,
            type: ActivityType.WHATSAPP,
            content: `[Automated Speed-to-Lead] Instant WhatsApp welcome message dispatched to +${cleanPhone}`,
          },
        });
        return { dispatched: true, reason: 'Dispatched via WhatsApp Cloud API' };
      } catch (err: any) {
        this.logger.warn(`WhatsApp dispatch error for lead ${lead.id}: ${err?.message || err}`);
        await this.prisma.activity.create({
          data: {
            leadId: lead.id,
            type: ActivityType.SYSTEM,
            content: `[Automated Speed-to-Lead] WhatsApp dispatch queued/failed: ${err?.message || 'Check WhatsApp API configuration'}`,
          },
        });
        return { dispatched: false, reason: err?.message || 'Send error' };
      }
    } else {
      // Graceful fallback for staging / development / unconfigured environments
      this.logger.log(
        `[Speed-to-Lead Simulator] WhatsApp welcome prepared for lead ${lead.id} (+${cleanPhone}): ${dest}`,
      );
      await this.prisma.activity.create({
        data: {
          leadId: lead.id,
          type: ActivityType.SYSTEM,
          content: `[Automated Speed-to-Lead] Welcome acknowledgment prepared for ${dest} inquiry (+${cleanPhone}). WhatsApp Cloud integration inactive.`,
        },
      });
      return { dispatched: true, reason: 'Recorded in simulated speed-to-lead pipeline' };
    }
  }
}
