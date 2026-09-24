import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PermitsService } from './permits.service';
import { CreatePermitDto, CreatePermitTravellerDto } from './dto/create-permit.dto';
import { UpdatePermitDto } from './dto/update-permit.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Actor } from '../common/access';
import { PermitStatus, Role } from '@prisma/client';

@Roles(
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.OPERATIONS,
  Role.SALES_MANAGER,
  Role.SALES_EXEC,
)
@Controller('permits')
export class PermitsController {
  constructor(private readonly svc: PermitsService) {}

  @Get('fee-estimate')
  calculateEstimate(
    @Query('pax') pax: string,
    @Query('validFrom') validFrom: string,
    @Query('validTo') validTo: string,
  ) {
    const from = new Date(validFrom);
    const to = new Date(validTo);
    return this.svc.calculateStatutoryFees(parseInt(pax, 10) || 1, from, to);
  }

  @Get()
  listPermits(
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: PermitStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.svc.listPermits({ bookingId, status, fromDate, toDate });
  }

  @Get(':id')
  getPermit(@Param('id') id: string) {
    return this.svc.getPermit(id);
  }

  @Post()
  createPermit(@Body() dto: CreatePermitDto, @CurrentUser() actor: Actor) {
    return this.svc.createPermit(dto, actor.id);
  }

  @Patch(':id')
  updatePermit(@Param('id') id: string, @Body() dto: UpdatePermitDto) {
    return this.svc.updatePermit(id, dto);
  }

  @Post(':id/travellers')
  addTraveller(
    @Param('id') id: string,
    @Body() dto: CreatePermitTravellerDto,
  ) {
    return this.svc.addTraveller(id, dto);
  }

  @Delete(':id/travellers/:travellerId')
  removeTraveller(
    @Param('id') id: string,
    @Param('travellerId') travellerId: string,
  ) {
    return this.svc.removeTraveller(id, travellerId);
  }
}
