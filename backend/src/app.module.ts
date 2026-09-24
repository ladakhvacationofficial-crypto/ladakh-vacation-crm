import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { VendorsModule } from './vendors/vendors.module';
import { SettingsModule } from './settings/settings.module';
import { BookingsModule } from './bookings/bookings.module';
import { AttributionModule } from './attribution/attribution.module';
import { PdfModule } from './pdf/pdf.module';
import { HrModule } from './hr/hr.module';
import { InvoicesModule } from './invoices/invoices.module';
import { B2bPartnersModule } from './b2b-partners/b2b-partners.module';
import { SeoModule } from './seo/seo.module';
import { ItinerariesModule } from './itineraries/itineraries.module';
import { ReportsModule } from './reports/reports.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { StorageModule } from './storage/storage.module';
import { MarketingModule } from './marketing/marketing.module';
import { SocialModule } from './social/social.module';
import { MediaModule } from './media/media.module';
import { MlModule } from './ml/ml.module';
import { FleetModule } from './fleet/fleet.module';
import { PermitsModule } from './permits/permits.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global default: 60 requests / minute / IP.
    // The public capture endpoint tightens this to 10/min via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    VendorsModule,
    SettingsModule,
    BookingsModule,
    AttributionModule,
    PdfModule,
    HrModule,
    SeoModule,
    ItinerariesModule,
    ReportsModule,
    IntegrationsModule,
    StorageModule,
    InvoicesModule,
    B2bPartnersModule,
    MarketingModule,
    SocialModule,
    MediaModule,
    MlModule,
    FleetModule,
    PermitsModule,
  ],
  providers: [
    // Order: rate limit -> authenticate -> authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
