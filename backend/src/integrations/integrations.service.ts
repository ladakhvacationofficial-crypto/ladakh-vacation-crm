import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntegrationCategory, IntegrationTestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';
import { decryptSecret, encryptSecret } from '../common/crypto';
import { getProvider, publicProviderCatalog } from './providers';
import { runProbe } from './probes';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** For the frontend's Add-integration dialog. */
  catalog() {
    return publicProviderCatalog();
  }

  /**
   * List rows the operator can see. Never returns decrypted credentials —
   * only "has credentials" flag + the field keys so the UI knows what to
   * pre-populate when editing.
   */
  async list(category?: IntegrationCategory) {
    const rows = await this.prisma.integration.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.publicShape(r));
  }

  async findOne(id: string) {
    const row = await this.prisma.integration.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Integration not found');
    return this.publicShape(row);
  }

  async create(dto: UpsertIntegrationDto) {
    const spec = getProvider(dto.provider);
    if (!spec) throw new BadRequestException(`Unknown provider: ${dto.provider}`);
    this.validateCreds(spec.fields, dto.credentials);

    let encrypted: string;
    try {
      encrypted = encryptSecret(JSON.stringify(dto.credentials));
    } catch (e: any) {
      throw new BadRequestException(`Credential encryption error: ${e?.message ?? String(e)}`);
    }

    const row = await this.prisma.integration.create({
      data: {
        provider: spec.id,
        category: spec.category,
        label: dto.label ?? spec.label,
        credentials: encrypted,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      },
    });
    return this.publicShape(row);
  }

  async update(id: string, dto: Partial<UpsertIntegrationDto>) {
    const exists = await this.prisma.integration.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Integration not found');
    const spec = getProvider(exists.provider);
    if (!spec) throw new BadRequestException(`Registry lost provider: ${exists.provider}`);

    const data: Record<string, unknown> = {};
    if (dto.label !== undefined) data.label = dto.label ?? spec.label;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.credentials !== undefined) {
      // Merge with existing so a partial edit doesn't lose fields the UI
      // deliberately omitted (blank password inputs on edit).
      let current: Record<string, unknown> = {};
      try {
        current = JSON.parse(decryptSecret(exists.credentials)) as Record<string, unknown>;
      } catch {
        current = {};
      }
      const merged: Record<string, unknown> = { ...current };
      for (const [k, v] of Object.entries(dto.credentials)) {
        if (typeof v === 'string' && v === '') continue; // blank = keep old
        merged[k] = v;
      }
      this.validateCreds(spec.fields, merged);
      try {
        data.credentials = encryptSecret(JSON.stringify(merged));
      } catch (e: any) {
        throw new BadRequestException(`Credential encryption error: ${e?.message ?? String(e)}`);
      }
      // Any credential change invalidates a prior OK test.
      data.lastTestStatus = IntegrationTestStatus.UNTESTED;
      data.lastTestMessage = null;
      data.lastTestedAt = null;
    }

    const row = await this.prisma.integration.update({ where: { id }, data });
    return this.publicShape(row);
  }

  async remove(id: string) {
    const exists = await this.prisma.integration.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Integration not found');
    await this.prisma.integration.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Run the provider's test probe and persist the result. */
  async test(id: string) {
    const row = await this.prisma.integration.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Integration not found');

    let creds: Record<string, unknown>;
    try {
      creds = JSON.parse(decryptSecret(row.credentials)) as Record<string, unknown>;
    } catch (e: any) {
      const failMsg = `Could not decrypt stored credentials: ${e?.message ?? String(e)}`;
      await this.prisma.integration.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: IntegrationTestStatus.FAILED,
          lastTestMessage: failMsg.slice(0, 500),
        },
      });
      return {
        ...this.publicShape(row),
        lastTestStatus: IntegrationTestStatus.FAILED,
        lastTestMessage: failMsg,
        testResult: { ok: false, message: failMsg },
      };
    }

    const result = await runProbe(row.provider, creds);
    const updated = await this.prisma.integration.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.ok
          ? IntegrationTestStatus.OK
          : IntegrationTestStatus.FAILED,
        lastTestMessage: result.message.slice(0, 500),
      },
    });
    return { ...this.publicShape(updated), testResult: result };
  }

  /**
   * Failover helper for AI callers. Returns the highest-priority ACTIVE AI
   * integration's provider + decrypted creds so a caller can try it, and if
   * it fails, call again with `excludeProvider` to get the next best.
   */
  async pickAI(excludeProvider?: string[]) {
    const rows = await this.prisma.integration.findMany({
      where: {
        category: IntegrationCategory.AI,
        isActive: true,
        ...(excludeProvider?.length
          ? { provider: { notIn: excludeProvider } }
          : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 1,
    });
    const pick = rows[0];
    if (!pick) return null;
    return {
      id: pick.id,
      provider: pick.provider,
      credentials: JSON.parse(decryptSecret(pick.credentials)) as Record<string, unknown>,
    };
  }

  /**
   * Failover helper for web scrapers & intelligence engines.
   * Returns the highest-priority active SCRAPING integration's provider + decrypted credentials.
   */
  async pickScraper(excludeProvider?: string[]) {
    const rows = await this.prisma.integration.findMany({
      where: {
        category: IntegrationCategory.SCRAPING,
        isActive: true,
        ...(excludeProvider?.length
          ? { provider: { notIn: excludeProvider } }
          : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 1,
    });
    const pick = rows[0];
    if (!pick) return null;
    return {
      id: pick.id,
      provider: pick.provider,
      credentials: JSON.parse(decryptSecret(pick.credentials)) as Record<string, unknown>,
    };
  }

  /**
   * Returns all active scraping integrations ordered by priority for multi-provider swarm / concurrency.
   */
  async listActiveScrapers() {
    const rows = await this.prisma.integration.findMany({
      where: {
        category: IntegrationCategory.SCRAPING,
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      label: r.label,
      priority: r.priority,
      credentials: JSON.parse(decryptSecret(r.credentials)) as Record<string, unknown>,
    }));
  }

  // ---- helpers ------------------------------------------------------------

  private validateCreds(
    fields: { key: string; required?: boolean }[],
    creds: Record<string, unknown>,
  ) {
    for (const f of fields) {
      if (f.required && !creds[f.key]) {
        throw new BadRequestException(`Missing required field: ${f.key}`);
      }
    }
  }

  private publicShape(row: {
    id: string;
    category: IntegrationCategory;
    provider: string;
    label: string | null;
    isActive: boolean;
    priority: number;
    lastTestedAt: Date | null;
    lastTestStatus: IntegrationTestStatus;
    lastTestMessage: string | null;
    credentials: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    // Return which credential keys are set so the edit form knows what to
    // show as "on file" (password fields render blank + placeholder).
    let keysOnFile: string[] = [];
    try {
      const obj = JSON.parse(decryptSecret(row.credentials)) as Record<string, unknown>;
      keysOnFile = Object.keys(obj).filter((k) => obj[k] !== '' && obj[k] != null);
    } catch {
      // If decrypt fails (missing / rotated key), we still want the row visible
      // so the operator can delete or re-enter it.
      keysOnFile = [];
    }
    return {
      id: row.id,
      category: row.category,
      provider: row.provider,
      label: row.label,
      isActive: row.isActive,
      priority: row.priority,
      keysOnFile,
      lastTestedAt: row.lastTestedAt,
      lastTestStatus: row.lastTestStatus,
      lastTestMessage: row.lastTestMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
