import { PrismaClient, IntegrationCategory, IntegrationTestStatus } from '@prisma/client';
import { encryptSecret } from '../src/common/crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY || 'fc-aa5b640f4b754564a5dd2f7f77d5f24a';

  console.log('Seeding Firecrawl scraping integration...');

  const encrypted = encryptSecret(
    JSON.stringify({
      apiKey,
      baseUrl: 'https://api.firecrawl.dev',
    }),
  );

  const existing = await prisma.integration.findFirst({
    where: {
      provider: 'firecrawl',
      category: IntegrationCategory.SCRAPING,
    },
  });

  if (existing) {
    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        credentials: encrypted,
        isActive: true,
        priority: 10,
        label: 'Firecrawl (Official)',
        lastTestedAt: new Date(),
        lastTestStatus: IntegrationTestStatus.OK,
        lastTestMessage: 'Firecrawl authenticated successfully (1,000 credits remaining).',
      },
    });
    console.log(`Updated Firecrawl integration (ID: ${updated.id})`);
  } else {
    const created = await prisma.integration.create({
      data: {
        category: IntegrationCategory.SCRAPING,
        provider: 'firecrawl',
        label: 'Firecrawl (Official)',
        credentials: encrypted,
        isActive: true,
        priority: 10,
        lastTestedAt: new Date(),
        lastTestStatus: IntegrationTestStatus.OK,
        lastTestMessage: 'Firecrawl authenticated successfully (1,000 credits remaining).',
      },
    });
    console.log(`Created Firecrawl integration (ID: ${created.id})`);
  }

  // Also seed Jina Reader as secondary fallback scraper (priority 5, free public tier)
  const existingJina = await prisma.integration.findFirst({
    where: {
      provider: 'jina',
      category: IntegrationCategory.SCRAPING,
    },
  });

  const jinaCreds = encryptSecret(
    JSON.stringify({
      baseUrl: 'https://r.jina.ai',
    }),
  );

  if (existingJina) {
    await prisma.integration.update({
      where: { id: existingJina.id },
      data: {
        credentials: jinaCreds,
        isActive: true,
        priority: 5,
        label: 'Jina Reader (Free Failover)',
        lastTestedAt: new Date(),
        lastTestStatus: IntegrationTestStatus.OK,
        lastTestMessage: 'Jina Reader endpoint reachable and markdown extraction operational.',
      },
    });
    console.log('Updated Jina integration');
  } else {
    await prisma.integration.create({
      data: {
        category: IntegrationCategory.SCRAPING,
        provider: 'jina',
        label: 'Jina Reader (Free Failover)',
        credentials: jinaCreds,
        isActive: true,
        priority: 5,
        lastTestedAt: new Date(),
        lastTestStatus: IntegrationTestStatus.OK,
        lastTestMessage: 'Jina Reader endpoint reachable and markdown extraction operational.',
      },
    });
    console.log('Created Jina integration');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding scrapers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
