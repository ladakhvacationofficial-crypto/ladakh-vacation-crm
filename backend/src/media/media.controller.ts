import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor, INTERNAL_STAFF } from '../common/access';

const MEDIA_WRITE: Role[] = [Role.SUPER_ADMIN, Role.OWNER, Role.MARKETING];

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Roles(...INTERNAL_STAFF)
  @Get('pages')
  getPages() {
    return this.mediaService.getWebsitePages();
  }

  @Roles(...MEDIA_WRITE)
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.mediaService.upload(file, dto, actor);
  }

  @Roles(...INTERNAL_STAFF)
  @Get()
  findAll(
    @Query('pageSlug') pageSlug?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    return this.mediaService.findAll({ pageSlug, tag, search });
  }

  @Roles(...INTERNAL_STAFF)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Roles(...MEDIA_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Roles(...MEDIA_WRITE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
