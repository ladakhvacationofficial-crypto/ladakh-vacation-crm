import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { B2bPartnersService } from './b2b-partners.service';
import { CreateB2bPartnerDto } from './dto/create-b2b-partner.dto';
import { UpdateB2bPartnerDto } from './dto/update-b2b-partner.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Actor, INTERNAL_STAFF } from '../common/access';

@Roles(...INTERNAL_STAFF)
@Controller('b2b-partners')
export class B2bPartnersController {
  constructor(private readonly b2bPartnersService: B2bPartnersService) {}

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.OPERATIONS)
  @Post()
  create(@Body() createB2bPartnerDto: CreateB2bPartnerDto, @CurrentUser() actor: Actor) {
    return this.b2bPartnersService.create(createB2bPartnerDto, actor);
  }

  @Get()
  findAll() {
    return this.b2bPartnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.b2bPartnersService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.OPERATIONS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateB2bPartnerDto: UpdateB2bPartnerDto) {
    return this.b2bPartnersService.update(id, updateB2bPartnerDto);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.b2bPartnersService.remove(id);
  }
}
