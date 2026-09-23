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

  constructor(private readonly prisma: PrismaService) {}

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
        const googleAdsIntegration = await this.prisma.integration.findFirst({
          where: { provider: 'google_ads', isActive: true },
        });

        if (googleAdsIntegration) {
          const creds = JSON.parse(decryptSecret(googleAdsIntegration.credentials));
          if (creds.customerId && creds.developerToken && creds.accessToken) {
            const customerId = creds.customerId.replace(/-/g, '');
            const url = `https://googleads.googleapis.com/v16/customers/${customerId}:uploadClickConversions`;
            
            const conversionPayload = {
              conversions: [
                {
                  gclid: lead.gclid,
                  conversionAction: creds.conversionActionId
                    ? `customers/${customerId}/conversionActions/${creds.conversionActionId}`
                    : undefined,
                  conversionDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19) + '+05:30',
                  conversionValue: totalSell,
                  currencyCode: 'INR',
                  orderId: bookingNumber,
                },
              ],
              partialFailure: true,
            };

            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'developer-token': creds.developerToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(conversionPayload),
            });

            if (res.ok) {
              googleUploaded = true;
              actionsTaken.push(`Google Ads (GCLID: ${lead.gclid.slice(0, 8)}...)`);
            } else {
              const errBody = await res.text();
              this.logger.warn(`Google Ads conversion upload returned status ${res.status}: ${errBody}`);
              actionsTaken.push(`Google Ads failed (HTTP ${res.status})`);
            }
          } else {
            this.logger.warn('Google Ads integration missing required credentials');
            actionsTaken.push('Google Ads skipped (incomplete credentials)');
          }
        } else {
          this.logger.log(
            `Google Ads integration unconfigured; skipping offline conversion for GCLID=${lead.gclid}`,
          );
          actionsTaken.push(`Google Ads unconfigured (GCLID: ${lead.gclid.slice(0, 8)}...)`);
        }
      } catch (err: any) {
        this.logger.warn(`Google Ads conversion error: ${err?.message || err}`);
        actionsTaken.push('Google Ads error');
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
              headers: {
                'Authorization': `Bearer ${creds.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(capiPayload),
            });

            if (res.ok) {
              metaUploaded = true;
              actionsTaken.push(`Meta CAPI (FBCLID: ${lead.fbclid.slice(0, 8)}...)`);
            } else {
              const errBody = await res.text();
              this.logger.warn(`Meta CAPI upload returned status ${res.status}: ${errBody}`);
              actionsTaken.push(`Meta CAPI failed (HTTP ${res.status})`);
            }
          } else {
            this.logger.warn('Meta Ads integration missing required credentials');
            actionsTaken.push('Meta CAPI skipped (incomplete credentials)');
          }
        } else {
          this.logger.log(
            `Meta Ads integration unconfigured; skipping offline conversion for FBCLID=${lead.fbclid}`,
          );
          actionsTaken.push(`Meta CAPI unconfigured (FBCLID: ${lead.fbclid.slice(0, 8)}...)`);
        }
      } catch (err: any) {
        this.logger.warn(`Meta CAPI conversion error: ${err?.message || err}`);
        actionsTaken.push('Meta CAPI error');
      }
    }

    const summary =
      actionsTaken.length > 0
        ? `Offline conversion posted to ${actionsTaken.join(' & ')} for ₹${totalSell.toLocaleString('en-IN')}`
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
