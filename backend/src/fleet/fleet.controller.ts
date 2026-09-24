import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { AssignFleetDto } from './dto/assign-fleet.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Actor } from '../common/access';
import { FleetAssignmentStatus, FleetOwnership, Role, VehicleType } from '@prisma/client';

@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS, Role.SALES_MANAGER, Role.SALES_EXEC)
@Controller('fleet')
export class FleetController {
  constructor(private readonly svc: FleetService) {}

  // ---- vehicles ------------------------------------------------------------

  @Get('vehicles')
  listVehicles(
    @Query('type') type?: VehicleType,
    @Query('ownership') ownership?: FleetOwnership,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.svc.listVehicles({
      type,
      ownership,
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string) {
    return this.svc.getVehicle(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Post('vehicles')
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.svc.createVehicle(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Patch('vehicles/:id')
  updateVehicle(@Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>) {
    return this.svc.updateVehicle(id, dto);
  }

  // ---- drivers -------------------------------------------------------------

  @Get('drivers')
  listDrivers(
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('localOnly') localOnly?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.svc.listDrivers({
      verifiedOnly: verifiedOnly === 'true',
      localOnly: localOnly === 'true',
      activeOnly: activeOnly === 'true',
    });
  }

  @Get('drivers/:id')
  getDriver(@Param('id') id: string) {
    return this.svc.getDriver(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Post('drivers')
  createDriver(@Body() dto: CreateDriverDto) {
    return this.svc.createDriver(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Patch('drivers/:id')
  updateDriver(@Param('id') id: string, @Body() dto: Partial<CreateDriverDto>) {
    return this.svc.updateDriver(id, dto);
  }

  // ---- assignments & schedule ----------------------------------------------

  @Get('assignments')
  listAssignments(
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: FleetAssignmentStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.svc.listAssignments({ bookingId, status, fromDate, toDate });
  }

  @Get('schedule')
  getSchedule(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getSchedule(startDate, endDate);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Post('assignments')
  assignFleet(@Body() dto: AssignFleetDto, @CurrentUser() actor: Actor) {
    return this.svc.assignFleet(dto, actor.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.OPERATIONS)
  @Patch('assignments/:id')
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: Partial<AssignFleetDto>,
  ) {
    return this.svc.updateAssignment(id, dto);
  }
}
