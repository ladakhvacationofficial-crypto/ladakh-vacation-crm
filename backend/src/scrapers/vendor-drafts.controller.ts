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
import { Role, ScrapeDraftStatus } from '@prisma/client';
import { VendorDraftsService } from './vendor-drafts.service';
import { ExtractDraftDto } from './dto/extract-draft.dto';
import { BatchExtractDto } from './dto/batch-extract.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VENDOR_READ_ACCESS, VENDOR_WRITE_ACCESS } from '../common/access';

@Roles(...VENDOR_READ_ACCESS)
@Controller('vendors/drafts')
export class VendorDraftsController {
  constructor(private readonly draftsService: VendorDraftsService) {}

  @Get()
  list(
    @Query('status') status?: ScrapeDraftStatus,
    @Query('city') city?: string,
    @Query('sourceProvider') sourceProvider?: string,
    @Query('q') q?: string,
  ) {
    return this.draftsService.list({ status, city, sourceProvider, q });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.draftsService.findById(id);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Post('extract')
  extract(@Body() dto: ExtractDraftDto, @CurrentUser('id') userId: string) {
    return this.draftsService.extractAndSave(dto, userId);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Post('batch-extract')
  batchExtract(@Body() dto: BatchExtractDto, @CurrentUser('id') userId: string) {
    return this.draftsService.batchExtractAndSave(dto, userId);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.draftsService.update(id, dto, userId);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.draftsService.approve(id, userId);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('notes') notes?: string,
  ) {
    return this.draftsService.reject(id, userId, notes);
  }

  @Roles(...VENDOR_WRITE_ACCESS)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.draftsService.delete(id);
  }
}
