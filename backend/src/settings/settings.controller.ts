import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { AssignmentService, UpdateRoutingSettingsDto } from '../leads/assignment.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly assignment: AssignmentService,
  ) {}

  /** Staff need to read markup policy to understand quote prices. */
  @Get('pricing')
  getPricing() {
    return this.settings.getPricing();
  }

  /** Only the owner sets commercial policy. */
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @Patch('pricing')
  updatePricing(@Body() dto: UpdatePricingDto) {
    return this.settings.updatePricing(dto);
  }

  /** Lead Routing & Performance Assignment Settings */
  @Roles(Role.OWNER, Role.SUPER_ADMIN, Role.SALES_MANAGER)
  @Get('routing')
  async getRouting() {
    const [settings, stats] = await Promise.all([
      this.assignment.getRoutingSettings(),
      this.assignment.getStaffPerformanceStats(),
    ]);
    return { settings, stats };
  }

  @Roles(Role.OWNER, Role.SUPER_ADMIN, Role.SALES_MANAGER)
  @Patch('routing')
  updateRouting(@Body() dto: UpdateRoutingSettingsDto) {
    return this.assignment.updateRoutingSettings(dto);
  }

  /** Company profile for invoices, receipts, and vouchers. */
  @Get('company-profile')
  getCompanyProfile() {
    return this.settings.getCompanyProfile();
  }

  @Roles(Role.OWNER, Role.SUPER_ADMIN, Role.ACCOUNTS)
  @Patch('company-profile')
  updateCompanyProfile(@Body() dto: any) {
    return this.settings.updateCompanyProfile(dto);
  }
}
