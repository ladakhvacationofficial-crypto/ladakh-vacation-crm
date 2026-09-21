import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto';
import { HOMEPAGE_ENTRY, MANIFEST } from './seo-manifest';

export interface IndexNowCredentials {
  host: string;
  apiKey: string;
  keyLocation?: string;
}

export interface IndexNowSubmitResult {
  ok: boolean;
  submitted: number;
  statusCode: number;
  message: string;
  host: string;
  keyLocation?: string;
  timestamp: string;
}

export interface IndexNowStatus {
  configured: boolean;
  host?: string;
  keyLocation?: string;
  keyPreview?: string;
  isActive: boolean;
}

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves IndexNow credentials from database or environment.
   */
  async resolveCredentials(): Promise<IndexNowCredentials> {
    const row = await this.prisma.integration.findFirst({
      where: {
        provider: 'indexnow',
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (row?.credentials) {
      try {
        const decrypted = JSON.parse(decryptSecret(row.credentials));
        const host = String(decrypted.host ?? '').trim();
        const apiKey = String(decrypted.apiKey ?? '').trim();
        const keyLocation = decrypted.keyLocation ? String(decrypted.keyLocation).trim() : undefined;
        if (host && apiKey) {
          return { host, apiKey, keyLocation };
        }
      } catch (e: any) {
        this.logger.warn('Could not decrypt stored IndexNow credentials: ' + (e?.message ?? e));
      }
    }

    // Fallback to environment variables
    const envKey = process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY;
    if (envKey) {
      return {
        host: process.env.INDEXNOW_HOST || 'ladakhvacation.in',
        apiKey: envKey.trim(),
        keyLocation: process.env.INDEXNOW_KEY_LOCATION,
      };
    }

    throw new BadRequestException(
      'No active IndexNow integration configured. Go to Integrations → Search & analytics to set up IndexNow.',
    );
  }

  /**
   * Status of the IndexNow configuration.
   */
  async getStatus(): Promise<IndexNowStatus> {
    try {
      const creds = await this.resolveCredentials();
      return {
        configured: true,
        host: creds.host,
        keyLocation: creds.keyLocation || ('https://' + creds.host + '/' + creds.apiKey + '.txt'),
        keyPreview: creds.apiKey.slice(0, 6) + '...' + creds.apiKey.slice(-4),
        isActive: true,
      };
    } catch {
      return {
        configured: false,
        isActive: false,
      };
    }
  }

  /**
   * Submits a list of URLs to IndexNow (Bing, Yandex, Seznam, Naver).
   * Up to 10,000 URLs per request as defined by the protocol.
   */
  async submitUrls(urls: string[]): Promise<IndexNowSubmitResult> {
    const creds = await this.resolveCredentials();
    const host = creds.host;
    const apiKey = creds.apiKey;
    const keyLocation = creds.keyLocation || ('https://' + host + '/' + apiKey + '.txt');

    if (!Array.isArray(urls) || urls.length === 0) {
      throw new BadRequestException('Provide at least one URL to submit to IndexNow.');
    }

    // Normalize URLs to full canonical URLs under the configured host
    const normalizedUrls = Array.from(
      new Set(
        urls
          .map((u) => {
            const trimmed = String(u).trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
              return trimmed;
            }
            const path = trimmed.startsWith('/') ? trimmed : ('/' + trimmed);
            return 'https://' + host + path;
          })
          .filter((u): u is string => u !== null && u.includes(host)),
      ),
    );

    if (normalizedUrls.length === 0) {
      throw new BadRequestException('None of the provided URLs match host ' + host + '.');
    }

    const payload = {
      host,
      key: apiKey,
      keyLocation,
      urlList: normalizedUrls.slice(0, 10000),
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    const ts = new Date().toISOString();

    if (res.status === 200) {
      this.logger.log('IndexNow: Successfully submitted ' + payload.urlList.length + ' URLs for ' + host);
      return {
        ok: true,
        submitted: payload.urlList.length,
        statusCode: 200,
        message: 'Successfully submitted ' + payload.urlList.length + ' URLs to IndexNow.',
        host,
        keyLocation,
        timestamp: ts,
      };
    }

    if (res.status === 202) {
      this.logger.log('IndexNow: 202 Accepted for ' + payload.urlList.length + ' URLs on ' + host);
      return {
        ok: true,
        submitted: payload.urlList.length,
        statusCode: 202,
        message: 'URLs accepted by IndexNow (' + payload.urlList.length + ' URLs queued for indexing).',
        host,
        keyLocation,
        timestamp: ts,
      };
    }

    if (res.status === 400) {
      throw new BadRequestException('IndexNow rejected request (Invalid format): ' + responseText);
    }

    if (res.status === 403) {
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.errorCode === 'SiteVerificationNotCompleted') {
          throw new BadRequestException(
            'Site verification in progress with IndexNow: The key file is live at ' +
              keyLocation +
              ', and IndexNow is validating it. Bulk indexing will be active in 5-10 minutes.',
          );
        }
        if (parsed.message) {
          throw new BadRequestException('IndexNow HTTP 403: ' + parsed.message);
        }
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
      }
      throw new BadRequestException(
        'IndexNow Key Forbidden (HTTP 403): The key file at ' +
          keyLocation +
          ' was not verified. Ensure the key file is live on your domain.',
      );
    }

    if (res.status === 422) {
      throw new BadRequestException(
        'IndexNow Unprocessable Entity (HTTP 422): One or more URLs do not match the host ' + host + '.',
      );
    }

    throw new BadRequestException('IndexNow returned HTTP ' + res.status + ': ' + responseText);
  }

  /**
   * Discovers all published pages from site manifest and sitemap,
   * then pushes all of them to IndexNow.
   */
  async submitAllPages(): Promise<IndexNowSubmitResult> {
    const creds = await this.resolveCredentials();
    const urls: string[] = [HOMEPAGE_ENTRY.url];

    for (const page of MANIFEST) {
      if (page.url) {
        urls.push(page.url);
      }
    }

    this.logger.log('Submitting all ' + urls.length + ' published pages to IndexNow for ' + creds.host + '...');
    return this.submitUrls(urls);
  }
}
