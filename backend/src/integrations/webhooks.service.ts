import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { decryptSecret } from '../common/crypto';
import { ActivityType, CampaignRecipientStatus, LeadSource, LeadStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LeadsService))
    private leads: LeadsService,
  ) {}

  async processMetaWebhook(body: any) {
    this.logger.log(`Received Meta Webhook: object=${body.object}`);

    if (body.object === 'page') {
      // ── Meta Ads Leadgen Ingestion ─────────────────────────────────────────
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            await this.fetchAndCreateMetaLead(leadgenId);
          }
        }
      }
    } else if (body.object === 'whatsapp_business_account') {
      // ── WhatsApp Two-Way Inbound Messages & Delivery Receipts ──────────────
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const val = change.value;
          if (!val) continue;

          // 1. Process Inbound Messages from Travelers
          if (val.messages && Array.isArray(val.messages)) {
            const contactName = val.contacts?.[0]?.profile?.name || 'WhatsApp Traveler';
            for (const msg of val.messages) {
              await this.handleInboundWhatsAppMessage(msg, contactName);
            }
          }

          // 2. Process Message Status Updates (Delivered, Read, Failed)
          if (val.statuses && Array.isArray(val.statuses)) {
            for (const st of val.statuses) {
              await this.handleWhatsAppStatusReceipt(st);
            }
          }
        }
      }
    }

    return { received: true };
  }

  /**
   * Matches incoming WhatsApp messages to existing leads and logs to timeline,
   * or auto-creates a new lead if the phone number is unrecognized.
   */
  private async handleInboundWhatsAppMessage(msg: any, contactName: string) {
    const rawPhone = String(msg.from || '');
    if (!rawPhone) return;

    // Normalise phone to 10 digits
    const digits = rawPhone.replace(/\D/g, '');
    const phoneKey = digits.length > 10 ? digits.slice(-10) : digits;

    let messageText = '';
    if (msg.type === 'text') {
      messageText = msg.text?.body || '';
    } else if (msg.type === 'button') {
      messageText = msg.button?.text || '[Button Clicked]';
    } else if (msg.type === 'interactive') {
      messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive Reply]';
    } else {
      messageText = `[Received ${msg.type || 'media'} message]`;
    }

    this.logger.log(`Inbound WhatsApp message from ${rawPhone}: "${messageText.slice(0, 60)}"`);

    // Check if lead already exists in CRM
    const existingLead = await this.prisma.lead.findFirst({
      where: { phoneKey },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLead) {
      // 1. Log activity to lead timeline
      await this.prisma.activity.create({
        data: {
          leadId: existingLead.id,
          type: ActivityType.WHATSAPP,
          content: `[Inbound WhatsApp] ${messageText}`,
        },
      });

      // 2. Update lead status & SLA
      const updateData: any = {
        lastContact: new Date(),
        slaBreachAt: null, // clear overdue flag upon receiving client reply
        enquiryCount: existingLead.enquiryCount + 1,
      };

      if (existingLead.status === LeadStatus.NEW) {
        updateData.status = LeadStatus.CONTACTED;
      }

      await this.prisma.lead.update({
        where: { id: existingLead.id },
        data: updateData,
      });

      this.logger.log(`Matched inbound WhatsApp to existing Lead ${existingLead.id} (${existingLead.name})`);
    } else {
      // Auto-create new inbound lead
      this.logger.log(`New contact via WhatsApp (${rawPhone}) — auto-capturing lead.`);
      await this.leads.captureFromWebhook({
        name: contactName,
        phone: rawPhone,
        message: messageText,
        source: LeadSource.OTHER,
        externalId: msg.id || rawPhone,
        externalSource: 'whatsapp_inbound',
      });
    }
  }

  /**
   * Updates CampaignRecipient status when WhatsApp reports delivery or read receipts.
   */
  private async handleWhatsAppStatusReceipt(st: any) {
    const messageId = st.id;
    if (!messageId) return;

    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: { externalId: messageId },
    });

    if (!recipient) return;

    const eventTime = st.timestamp ? new Date(parseInt(st.timestamp) * 1000) : new Date();

    if (st.status === 'delivered') {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: CampaignRecipientStatus.DELIVERED,
          deliveredAt: eventTime,
        },
      });

      await this.prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { totalDelivered: { increment: 1 } },
      });
    } else if (st.status === 'read') {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: CampaignRecipientStatus.READ,
          readAt: eventTime,
        },
      });

      await this.prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { totalRead: { increment: 1 } },
      });
    } else if (st.status === 'failed') {
      const errorMsg = st.errors?.[0]?.title || st.errors?.[0]?.message || 'WhatsApp delivery failed';
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: CampaignRecipientStatus.FAILED,
          errorMessage: errorMsg,
        },
      });

      await this.prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { totalFailed: { increment: 1 } },
      });
    }
  }

  private async fetchAndCreateMetaLead(leadgenId: string) {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: { provider: 'meta_ads', isActive: true },
      });

      if (!integration) {
        this.logger.error('Received Meta webhook but no active meta_ads integration found.');
        return;
      }

      const creds = JSON.parse(decryptSecret(integration.credentials));
      const accessToken = creds.accessToken;
      if (!accessToken) {
        this.logger.error('Meta ads integration is missing accessToken.');
        return;
      }

      const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.text();
        this.logger.error(`Failed to fetch Meta lead ${leadgenId}: ${errorData}`);
        return;
      }

      const leadData = await res.json();

      let name = 'Unknown Lead';
      let email = null;
      let phone = '';

      for (const field of leadData.field_data || []) {
        const val = field.values?.[0];
        if (!val) continue;

        switch (field.name) {
          case 'full_name': name = val; break;
          case 'email': email = val; break;
          case 'phone_number': phone = val; break;
        }
      }

      if (!phone) {
        this.logger.warn(`Meta lead ${leadgenId} has no phone number, skipping.`);
        return;
      }

      await this.leads.captureFromWebhook({
        name,
        email,
        phone,
        externalId: leadgenId,
        externalSource: 'meta_ads',
      });

      this.logger.log(`Successfully ingested Meta lead ${leadgenId}`);
    } catch (e) {
      this.logger.error(`Exception while processing Meta lead ${leadgenId}`, e);
    }
  }
}
