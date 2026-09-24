import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ScraperPoolService } from './scraper-pool.service';
import { VendorDraftsService } from './vendor-drafts.service';
import { VendorDraftsController } from './vendor-drafts.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [VendorDraftsController],
  providers: [ScraperPoolService, VendorDraftsService],
  exports: [ScraperPoolService, VendorDraftsService],
})
export class ScrapersModule {}
