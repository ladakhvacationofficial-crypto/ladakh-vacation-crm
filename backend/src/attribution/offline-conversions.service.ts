import { GoogleAdsService } from './google-ads.service';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';

export interface BookingConversionPayload {
  bookingId: string;
  bookingNumber: string;
  totalSell: number;
  lead: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    gclid?: string | null;
    fbclid?: string | null;
  };
}

@Injectable()
export class OfflineConversionsService {
  private readonly logger = new Logger(OfflineConversionsService.name);

  constructor(private readonly prisma: PrismaService, private readonly googleAds: GoogleAdsService = new GoogleAdsService(prisma)) {}

  private hashSha256(val: string): string {
    return createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
  }

  /**
   * Uploads offline conversion data to Google Ads and Meta Ads CAPI
   * when a high-value package booking is confirmed.
   */
  async uploadBookingConversion(payload: BookingConversionPayload): Promise<{
    googleUploaded: boolean;
    metaUploaded: boolean;
    summary: string;
  }> {
    const { bookingNumber, totalSell, lead } = payload;
    let googleUploaded = false;
    let metaUploaded = false;
    const actionsTaken: string[] = [];

    // 1. Google Ads Click Conversion Upload (via GCLID)
    if (lead.gclid) {
      try {
        await this.googleAds.uploadClickConversion({gclid:lead.gclid,value:totalSell,orderId:bookingNumber});
        googleUploaded = true;
        actionsTaken.push('Google Ads: accepted');
      } catch (err: any) {
        actionsTaken.push('Google Ads: not uploaded (check integration settings and provider diagnostics)');
        this.logger.warn('Google Ads conversion was not accepted.');
      }
    }

    // 2. Meta Conversions API (CAPI) Upload (via FBCLID)
    if (lead.fbclid) {
      try {
        const metaIntegration = await this.prisma.integration.findFirst({
          where: { provider: 'meta_ads', isActive: true },
        });

        if (metaIntegration) {
          const creds = JSON.parse(decryptSecret(metaIntegration.credentials));
          if (creds.pixelId && creds.accessToken) {
            const url = `https://graph.facebook.com/v19.0/${creds.pixelId}/events`;
            const capiPayload = {
              data: [
                {
                  event_name: 'Purchase',
                  event_id: payload.bookingId,
                  event_time: Math.floor(Date.now() / 1000),
                  event_source_url: 'https://ladakhvacation.in',
                  action_source: 'website',
                  user_data: {
                    fbc: `fb.1.${Date.now()}.${lead.fbclid}`,
                    ...(lead.phone ? { ph: [this.hashSha256(lead.phone.replace(/\D/g, ''))] } : {}),
                    ...(lead.email ? { em: [this.hashSha256(lead.email)] } : {}),
                  },
                  custom_data: {
                    currency: 'INR',
                    value: totalSell,
                    order_id: bookingNumber,
                  },
                },
              ],
            };

            const res = await fetch(url, {
              method: 'POST',
              signal: AbortSignal.timeout(15000),
              headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(capiPayload),
            });

            if (res.ok) {
              const result = await res.json();
              if (result.events_received !== 1) throw new Error('Meta did not acknowledge the conversion.');
              metaUploaded = true;
              actionsTaken.push(`Meta CAPI (FBCLID: ${lead.fbclid.slice(0, 8)}...)`);
            } else {
              const errBody = await res.text();
              this.logger.warn(`Meta CAPI upload returned status ${res.status}: ${errBody}`);
            }
          }
        }

        if (!metaUploaded) {
          actionsTaken.push('Meta CAPI: not uploaded (unconfigured or rejected by provider)');
        }
      } catch (err: any) {
        actionsTaken.push('Meta CAPI: not uploaded (provider failure)');
        this.logger.warn('Meta conversion was not accepted.');
      }
    }

    const summary =
      actionsTaken.length > 0
        ? `Offline conversion outcome: ${actionsTaken.join(' & ')} for ₹${totalSell.toLocaleString('en-IN')}`
        : 'No ad click identifiers (gclid/fbclid) associated with this lead';

    // Record activity on the lead timeline
    if (actionsTaken.length > 0) {
      try {
        await this.prisma.activity.create({
          data: {
            leadId: lead.id,
            type: ActivityType.SYSTEM,
            content: `[Closed-Loop Attribution] ${summary} (Order #${bookingNumber}).`,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to record attribution activity: ${err?.message || err}`);
      }
    }

    return { googleUploaded, metaUploaded, summary };
  }
}
