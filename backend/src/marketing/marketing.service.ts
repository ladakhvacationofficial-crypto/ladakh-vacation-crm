import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CampaignChannel,
  CampaignStatus,
  CampaignRecipientStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../integrations/whatsapp.service';
import { BrevoEmailService } from './brevo-email.service';
import { AudienceFilterDto } from './dto/audience-filter.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import { Actor } from '../common/access';

const WA_ESTIMATED_COST_PER_MSG = 0.72; // Average India marketing conversation rate in INR
const FREQUENCY_CAP_DAYS = 7;

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly brevo: BrevoEmailService,
  ) {}

  /**
   * Evaluates audience criteria and returns lead reachability, frequency-capped exclusions,
   * opt-outs, and cost preview.
   */
  async previewAudience(filter: AudienceFilterDto, channel: CampaignChannel = CampaignChannel.WHATSAPP) {
    const where: Prisma.LeadWhereInput = {};

    if (filter.statuses && filter.statuses.length > 0) {
      where.status = { in: filter.statuses };
    }

    if (filter.sources && filter.sources.length > 0) {
      where.source = { in: filter.sources };
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }

    if (filter.minScore !== undefined || filter.maxScore !== undefined) {
      where.score = {
        gte: filter.minScore ?? 0,
        lte: filter.maxScore ?? 100,
      };
    }

    if (filter.inactiveDays) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - filter.inactiveDays);
      where.lastContact = { lte: threshold };
    }

    if (filter.destination) {
      where.destination = { contains: filter.destination, mode: 'insensitive' };
    }

    // Must have appropriate contact channel
    if (channel === CampaignChannel.WHATSAPP) {
      where.phone = { not: '' };
    } else if (channel === CampaignChannel.EMAIL) {
      where.email = { not: null };
    }

    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        tags: true,
        destination: true,
      },
    });

    const totalMatched = leads.length;

    // 1. Opt-out check
    const nonOptOutLeads = leads.filter(
      (l) => !l.tags || !l.tags.includes('MARKETING_OPT_OUT'),
    );
    const optOutCount = totalMatched - nonOptOutLeads.length;

    // 2. Frequency cap check (no broadcast in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - FREQUENCY_CAP_DAYS);

    const leadIds = nonOptOutLeads.map((l) => l.id);
    const recentlyMessagedRecipients = await this.prisma.campaignRecipient.findMany({
      where: {
        leadId: { in: leadIds },
        sentAt: { gte: sevenDaysAgo },
        status: { in: [CampaignRecipientStatus.SENT, CampaignRecipientStatus.DELIVERED, CampaignRecipientStatus.READ] },
      },
      select: { leadId: true },
    });

    const recentlyMessagedSet = new Set(
      recentlyMessagedRecipients.map((r) => r.leadId),
    );

    const eligibleLeads = nonOptOutLeads.filter(
      (l) => !recentlyMessagedSet.has(l.id),
    );
    const frequencyCappedCount = nonOptOutLeads.length - eligibleLeads.length;

    const estimatedCost =
      channel === CampaignChannel.WHATSAPP
        ? Number((eligibleLeads.length * WA_ESTIMATED_COST_PER_MSG).toFixed(2))
        : 0.0;

    return {
      totalMatched,
      optOutCount,
      frequencyCappedCount,
      eligibleCount: eligibleLeads.length,
      estimatedCost,
      sampleLeads: eligibleLeads.slice(0, 5).map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        destination: l.destination,
      })),
    };
  }

  /**
   * Creates a draft or scheduled campaign and pre-populates recipients.
   */
  async createCampaign(dto: CreateCampaignDto, actor: Actor) {
    const preview = await this.previewAudience(dto.audienceFilter, dto.channel);

    const status = dto.scheduledAt
      ? CampaignStatus.SCHEDULED
      : CampaignStatus.DRAFT;

    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        channel: dto.channel,
        status,
        audienceFilter: dto.audienceFilter as any,
        targetCount: preview.eligibleCount,
        estimatedCost: preview.estimatedCost,
        templateName: dto.templateName,
        templateLang: dto.templateLang || 'en',
        templateParams: (dto.templateParams as any) || {},
        emailSubject: dto.emailSubject,
        emailHtml: dto.emailHtml,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById: actor.id,
      },
    });

    return campaign;
  }

  /**
   * Lists campaigns with aggregate metrics and creator name.
   */
  async findAll(q: QueryCampaignsDto) {
    const where: Prisma.CampaignWhereInput = {};
    if (q.channel) where.channel = q.channel;
    if (q.status) where.status = q.status;
    if (q.search) {
      where.name = { contains: q.search, mode: 'insensitive' };
    }

    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Retrieves full campaign details and recipient delivery statistics.
   */
  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        recipients: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const counts = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { status: true },
    });

    const statusMap: Record<string, number> = {};
    for (const c of counts) {
      statusMap[c.status] = c._count.status;
    }

    return {
      ...campaign,
      metrics: {
        pending: statusMap[CampaignRecipientStatus.PENDING] || 0,
        sent: statusMap[CampaignRecipientStatus.SENT] || 0,
        delivered: statusMap[CampaignRecipientStatus.DELIVERED] || 0,
        read: statusMap[CampaignRecipientStatus.READ] || 0,
        failed: statusMap[CampaignRecipientStatus.FAILED] || 0,
        bounced: statusMap[CampaignRecipientStatus.BOUNCED] || 0,
        unsubscribed: statusMap[CampaignRecipientStatus.UNSUBSCRIBED] || 0,
      },
    };
  }

  /**
   * Triggers the immediate execution of a campaign.
   */
  async sendCampaign(id: string, actor: Actor) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException(`Campaign is already in status ${campaign.status}`);
    }

    // Resolve active audience
    const filter = campaign.audienceFilter as AudienceFilterDto;
    const preview = await this.previewAudience(filter, campaign.channel);

    // Fetch matching eligible leads
    const where: Prisma.LeadWhereInput = {};
    if (filter.statuses && filter.statuses.length > 0) where.status = { in: filter.statuses };
    if (filter.sources && filter.sources.length > 0) where.source = { in: filter.sources };
    if (filter.tags && filter.tags.length > 0) where.tags = { hasSome: filter.tags };
    if (filter.destination) where.destination = { contains: filter.destination, mode: 'insensitive' };
    if (campaign.channel === CampaignChannel.WHATSAPP) where.phone = { not: '' };
    if (campaign.channel === CampaignChannel.EMAIL) where.email = { not: null };

    const leads = await this.prisma.lead.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true, tags: true, destination: true },
    });

    const eligibleLeads = leads.filter(
      (l) => !l.tags || !l.tags.includes('MARKETING_OPT_OUT'),
    );

    // Create recipient records
    await this.prisma.campaignRecipient.deleteMany({ where: { campaignId: id } });

    const recipientData = eligibleLeads.map((lead) => ({
      campaignId: id,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      status: CampaignRecipientStatus.PENDING,
    }));

    if (recipientData.length > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: recipientData,
      });
    }

    // Mark as SENDING
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SENDING,
        startedAt: new Date(),
        targetCount: recipientData.length,
      },
    });

    // Execute in background
    this.executeBroadcast(id, campaign, eligibleLeads).catch((err) => {
      this.logger.error(`Broadcast execution error for campaign ${id}: ${err.message}`, err.stack);
    });

    return {
      message: `Broadcast started for ${recipientData.length} recipients.`,
      campaignId: id,
    };
  }

  /**
   * Internal async batch dispatcher.
   */
  private async executeBroadcast(campaignId: string, campaign: any, leads: any[]) {
    let sentCount = 0;
    let failedCount = 0;

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
    });

    const leadMap = new Map(leads.map((l) => [l.id, l]));

    for (const recipient of recipients) {
      const lead = recipient.leadId ? leadMap.get(recipient.leadId) : null;
      const leadName = recipient.name || 'Traveler';
      const destination = lead?.destination || 'Kashmir';

      try {
        if (campaign.channel === CampaignChannel.WHATSAPP && recipient.phone) {
          // Prepare parameters for template (e.g. {{1}} = Name, {{2}} = Destination)
          const params = [
            { type: 'text', text: leadName },
            { type: 'text', text: destination },
          ];

          const res = await this.whatsapp.sendTemplateMessage(
            recipient.phone,
            campaign.templateName || 'kashmir_seasonal_offer',
            campaign.templateLang || 'en',
            params,
          );

          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: CampaignRecipientStatus.SENT,
              externalId: res.messageId,
              sentAt: new Date(),
            },
          });
          sentCount++;
        } else if (campaign.channel === CampaignChannel.EMAIL && recipient.email) {
          const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/marketing/unsubscribe/${recipient.unsubscribeToken}`;

          const res = await this.brevo.sendEmail({
            toEmail: recipient.email,
            toName: leadName,
            subject: campaign.emailSubject || 'Special Offer from Ladakh Vacation',
            htmlContent: campaign.emailHtml || `<p>Hello ${leadName}, discover new holiday packages for ${destination}.</p>`,
            unsubscribeUrl,
          });

          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: CampaignRecipientStatus.SENT,
              externalId: res.messageId,
              sentAt: new Date(),
            },
          });
          sentCount++;
        }
      } catch (err: any) {
        this.logger.warn(`Failed sending to recipient ${recipient.id}: ${err.message}`);
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.FAILED,
            errorMessage: err.message || 'Send failure',
          },
        });
        failedCount++;
      }

      // Small throttling delay to adhere to rate limits (50ms per item)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Complete campaign
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.SENT,
        completedAt: new Date(),
        totalSent: sentCount,
        totalFailed: failedCount,
      },
    });

    this.logger.log(`Campaign ${campaignId} finished. Sent: ${sentCount}, Failed: ${failedCount}`);
  }

  /**
   * Cancels a scheduled or draft campaign.
   */
  async cancelCampaign(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }

  /**
   * Processes opt-out when recipient clicks unsubscribe in an email.
   */
  async handleUnsubscribe(token: string) {
    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!recipient) throw new NotFoundException('Invalid unsubscribe link');

    await this.prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: CampaignRecipientStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      },
    });

    if (recipient.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: recipient.leadId },
        select: { tags: true },
      });

      if (lead) {
        const currentTags = lead.tags || [];
        if (!currentTags.includes('MARKETING_OPT_OUT')) {
          await this.prisma.lead.update({
            where: { id: recipient.leadId },
            data: { tags: [...currentTags, 'MARKETING_OPT_OUT'] },
          });
        }
      }
    }

    return { message: 'You have been successfully unsubscribed from Ladakh Vacation marketing broadcasts.' };
  }

  /**
   * Cron job checking for scheduled campaigns ready to run.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledCampaigns() {
    const now = new Date();
    const readyCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
    });

    for (const c of readyCampaigns) {
      this.logger.log(`Auto-triggering scheduled campaign ${c.id} (${c.name})`);
      try {
        await this.sendCampaign(c.id, { id: c.createdById, role: 'SUPER_ADMIN' } as any);
      } catch (err: any) {
        this.logger.error(`Error launching scheduled campaign ${c.id}: ${err.message}`);
      }
    }
  }
}
