import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegrationCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import {
  CampaignDaySpend,
  GOOGLE_ADS_CHANNEL,
  GOOGLE_ADS_SOURCE,
  assertIsoDate,
  campaignSpendQuery,
  flattenSearchStream,
  lookbackWindow,
  mapCampaignRow,
  normaliseCustomerId,
} from './google-ads-mapping';

/**
 * Google Ads reporting client + sync.
 *
 * Pulls campaign cost, impressions, clicks and conversions per day into
 * AdSpend, which is what turns the attribution dashboard's cost-per-lead and
 * ROAS from hand-typed guesses into measured numbers.
 *
 * Verified against the v25 REST reference (Sept 2026):
 *   POST {BASE}/{VERSION}/customers/{id}/googleAds:searchStream   body {query}
 *   GET  {BASE}/{VERSION}/customers:listAccessibleCustomers
 *   headers: Authorization: Bearer …, developer-token, login-customer-id
 *   OAuth:  POST https://www.googleapis.com/oauth2/v3/token
 *
 * searchStream returns a JSON ARRAY of chunks rather than one object, and
 * int64 fields arrive as strings — both handled in google-ads-mapping.ts.
 */

const BASE = 'https://googleads.googleapis.com';
/**
 * Google ships ~3 major versions a year and supports 3 at a time, so this WILL
 * need bumping. Symptom of an expired version is HTTP 404 on every call.
 */
const VERSION = 'v25';
const OAUTH_TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/token';

/** Access tokens last an hour; refresh a minute early to avoid edge expiry. */
const TOKEN_TTL_MS = 55 * 60 * 1000;

export interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
  customerId?: string;
  conversionActionId?: string;
}

export interface SyncResult {
  from: string;
  to: string;
  customerId: string;
  currency: string;
  /** Rows returned by Google after the impressions filter. */
  rowsFetched: number;
  created: number;
  updated: number;
  /** Whole currency units across every synced row. */
  totalAmount: number;
}

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);

  /** provider-row id -> cached access token. */
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Credentials
  // ==========================================================================

  /**
   * Highest-priority active Google Ads integration, decrypted.
   * Throws with an actionable message rather than returning null — every
   * caller here is useless without credentials.
   */
  async resolveCredentials(): Promise<{ id: string; creds: GoogleAdsCredentials }> {
    const row = await this.prisma.integration.findFirst({
      where: {
        category: IntegrationCategory.ADS,
        provider: GOOGLE_ADS_SOURCE,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!row) {
      throw new BadRequestException(
        'No active Google Ads integration. Add one under Integrations → Ads platforms first.',
      );
    }

    let creds: GoogleAdsCredentials;
    try {
      creds = JSON.parse(decryptSecret(row.credentials)) as GoogleAdsCredentials;
    } catch {
      throw new BadRequestException(
        'Stored Google Ads credentials could not be decrypted. Re-enter them under Integrations → Ads platforms.',
      );
    }

    for (const key of ['developerToken', 'clientId', 'clientSecret', 'refreshToken'] as const) {
      if (!creds[key]) {
        throw new BadRequestException(`Google Ads integration is missing ${key}.`);
      }
    }

    return { id: row.id, creds };
  }

  // ==========================================================================
  // Transport
  // ==========================================================================

  /** Exchange the long-lived refresh token for a short-lived access token. */
  private async getAccessToken(cacheKey: string, creds: GoogleAdsCredentials): Promise<string> {
    const hit = this.tokenCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.token;

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = await res.text();
    if (!res.ok) {
      // Surface Google's own reason — "invalid_grant" almost always means the
      // refresh token was revoked or the OAuth client was rebuilt.
      throw new BadRequestException(
        `Google OAuth refused the refresh token (HTTP ${res.status}): ${body.slice(0, 300)}`,
      );
    }

    let token: string | undefined;
    try {
      token = JSON.parse(body).access_token;
    } catch {
      throw new BadRequestException('Google OAuth returned a response that was not JSON.');
    }
    if (!token) throw new BadRequestException('Google OAuth response carried no access_token.');

    this.tokenCache.set(cacheKey, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
    return token;
  }

  private headers(token: string, creds: GoogleAdsCredentials): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'developer-token': creds.developerToken,
      'Content-Type': 'application/json',
    };
    // Only meaningful when the credentials belong to a manager (MCC) account.
    const login = normaliseCustomerId(creds.loginCustomerId ?? '');
    if (login) h['login-customer-id'] = login;
    return h;
  }

  /** Legacy offline uploads, for accounts that are eligible for this endpoint.
   * https://developers.google.com/google-ads/api/samples/upload-offline-conversion
   * Provider acceptance is checked independently from HTTP status.
   */
  async uploadClickConversion(input: { gclid: string; value: number; orderId: string }) {
    const { id, creds } = await this.resolveCredentials();
    const customerId = normaliseCustomerId(creds.customerId ?? '');
    if (!customerId || !creds.conversionActionId || !/^\d+$/.test(creds.conversionActionId)) {
      throw new BadRequestException('Set the conversion customer ID and conversion action ID in Google Ads integration settings.');
    }
    const token = await this.getAccessToken(id, creds);
    const response = await fetch(`${BASE}/${VERSION}/customers/${customerId}:uploadClickConversions`, {
      method: 'POST', headers: this.headers(token, creds), signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ partialFailure: true, conversions: [{
        gclid: input.gclid, conversionAction: `customers/${customerId}/conversionActions/${creds.conversionActionId}`,
        conversionDateTime: new Date().toISOString().slice(0,19).replace('T',' ') + '+00:00',
        conversionValue: input.value, currencyCode: 'INR', orderId: input.orderId,
      }] }),
    });
    const body = await response.json();
    if (!response.ok || body.partialFailureError || !body.results?.some((r: any) => r.gclid === input.gclid)) {
      throw new BadRequestException('Google Ads did not accept the conversion. Check conversion action, account eligibility and provider diagnostics.');
    }
    return { accepted: true };
  }

  /** Run a GAQL query and return the flattened rows. */
  private async searchStream(
    cacheKey: string,
    creds: GoogleAdsCredentials,
    customerId: string,
    query: string,
  ): Promise<Record<string, any>[]> {
    const id = normaliseCustomerId(customerId);
    if (!id) throw new BadRequestException('A Google Ads customer ID is required.');

    const token = await this.getAccessToken(cacheKey, creds);
    const res = await fetch(`${BASE}/${VERSION}/customers/${id}/googleAds:searchStream`, {
      method: 'POST',
      headers: this.headers(token, creds),
      body: JSON.stringify({ query }),
      // Reporting over a wide window is slow; well above a normal response.
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `Google Ads API error (HTTP ${res.status}) for customer ${id}: ${text.slice(0, 500)}`,
      );
    }

    try {
      return flattenSearchStream(JSON.parse(text));
    } catch {
      throw new BadRequestException('Google Ads returned a response that was not valid JSON.');
    }
  }

  // ==========================================================================
  // Reads
  // ==========================================================================

  /**
   * Accounts these credentials can reach, so the operator picks from a list
   * instead of typing a 10-digit customer ID.
   */
  async listAccessibleCustomers(): Promise<{ customerIds: string[] }> {
    const { id: cacheKey, creds } = await this.resolveCredentials();
    const token = await this.getAccessToken(cacheKey, creds);

    const res = await fetch(`${BASE}/${VERSION}/customers:listAccessibleCustomers`, {
      headers: this.headers(token, creds),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `Google Ads API error (HTTP ${res.status}): ${text.slice(0, 500)}`,
      );
    }

    // resourceNames look like "customers/1234567890".
    const names: string[] = JSON.parse(text).resourceNames ?? [];
    return { customerIds: names.map((n) => n.split('/').pop() ?? n).filter(Boolean) };
  }

  /** The account's reporting currency — cost is denominated in it, not INR. */
  private async fetchCurrency(
    cacheKey: string,
    creds: GoogleAdsCredentials,
    customerId: string,
  ): Promise<string> {
    try {
      const rows = await this.searchStream(
        cacheKey,
        creds,
        customerId,
        'SELECT customer.currency_code FROM customer LIMIT 1',
      );
      return rows[0]?.customer?.currencyCode ?? 'INR';
    } catch (e: any) {
      // Not worth failing a whole sync over; the dashboard shows INR by default.
      this.logger.warn(`Could not read currency for ${customerId}: ${e?.message}`);
      return 'INR';
    }
  }

  /** Campaign spend per day, already converted to whole currency units. */
  async fetchCampaignSpend(
    customerId: string,
    from: string,
    to: string,
  ): Promise<{ rows: CampaignDaySpend[]; currency: string }> {
    const { id: cacheKey, creds } = await this.resolveCredentials();
    assertIsoDate(from);
    assertIsoDate(to);

    const raw = await this.searchStream(
      cacheKey,
      creds,
      customerId,
      campaignSpendQuery(from, to),
    );
    const id = normaliseCustomerId(customerId);
    const rows = raw
      .map((r) => mapCampaignRow(r, id))
      .filter((r): r is CampaignDaySpend => r !== null);

    const currency = await this.fetchCurrency(cacheKey, creds, customerId);
    return { rows, currency };
  }

  // ==========================================================================
  // Sync
  // ==========================================================================

  /**
   * Pull a date window into AdSpend.
   *
   * Idempotent: rows are keyed on (externalSource, externalId), so re-running
   * the same window updates rather than duplicates. That matters because
   * Google restates recent cost data for several days after the fact — the
   * scheduled job deliberately re-pulls a window it has already seen.
   *
   * Manual rows carry externalSource = null and are never touched.
   */
  async syncCampaignSpend(customerId: string, from: string, to: string): Promise<SyncResult> {
    assertIsoDate(from);
    assertIsoDate(to);
    if (from > to) {
      throw new BadRequestException(`'from' (${from}) is after 'to' (${to}).`);
    }

    const id = normaliseCustomerId(customerId);
    const { rows, currency } = await this.fetchCampaignSpend(id, from, to);

    let created = 0;
    let updated = 0;
    let totalAmount = 0;

    for (const row of rows) {
      totalAmount += row.amount;

      // spendDate is stored as midnight UTC to match dayKey() elsewhere.
      const spendDate = new Date(`${row.date}T00:00:00.000Z`);
      const data = {
        spendDate,
        channel: GOOGLE_ADS_CHANNEL,
        campaign: row.campaignName,
        amount: row.amount,
        currency,
        impressions: row.impressions,
        clicks: row.clicks,
        syncedAt: new Date(),
      };

      const existing = await this.prisma.adSpend.findUnique({
        where: {
          externalSource_externalId: {
            externalSource: GOOGLE_ADS_SOURCE,
            externalId: row.externalId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.adSpend.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.adSpend.create({
          data: {
            ...data,
            externalSource: GOOGLE_ADS_SOURCE,
            externalId: row.externalId,
          },
        });
        created++;
      }
    }

    this.logger.log(
      `Google Ads sync ${from}..${to} customer=${id}: ${rows.length} rows (${created} new, ${updated} updated), ${currency} ${totalAmount}`,
    );

    return {
      from,
      to,
      customerId: id,
      currency,
      rowsFetched: rows.length,
      created,
      updated,
      totalAmount,
    };
  }

  /**
   * Sync every reachable account over a recent window.
   * Used by the scheduled job, where no operator is present to pick an account.
   */
  async syncAllAccounts(lookbackDays: number): Promise<SyncResult[]> {
    const { from, to } = lookbackWindow(lookbackDays);
    const { customerIds } = await this.listAccessibleCustomers();

    const results: SyncResult[] = [];
    for (const customerId of customerIds) {
      try {
        results.push(await this.syncCampaignSpend(customerId, from, to));
      } catch (e: any) {
        // One inaccessible account must not abort the rest. A manager account
        // commonly lists children the credentials cannot report on.
        this.logger.warn(`Google Ads sync skipped ${customerId}: ${e?.message}`);
      }
    }
    return results;
  }
}
