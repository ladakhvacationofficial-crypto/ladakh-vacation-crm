import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor } from '../common/access';

/**
 * Generic file-upload endpoint. Any module that needs file storage
 * (HR docs, voucher scans, itinerary images) uploads through here.
 *
 * POST /uploads
 *   multipart: file + folder (string) + optional entityType + entityId
 *   → saves to Supabase Storage, creates an Attachment row, returns it.
 *
 * GET /uploads/:entityType/:entityId
 *   → lists all attachments for a given entity.
 *
 * DELETE /uploads/:id
 *   → soft-deletes (nulls the URL) — actual S3 cleanup is a future cron.
 */
@Controller('uploads')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Body('entityType') entityType: string | undefined,
    @Body('entityId') entityId: string | undefined,
    @CurrentUser() actor: Actor,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!this.storage.isConfigured) {
      throw new BadRequestException(
        'File storage is not configured. Ask your admin to set the Neon storage keys (AWS_ENDPOINT_URL_S3).',
      );
    }

    const targetFolder = folder || 'general';
    const url = await this.storage.upload(file.buffer, file.originalname, targetFolder);

    const attachment = await this.prisma.attachment.create({
      data: {
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        folder: targetFolder,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedById: actor.id,
      },
    });

    return attachment;
  }

  @Get(':entityType/:entityId')
  async listByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new BadRequestException('Attachment not found');

    // Soft-delete: null out the URL. Actual S3 cleanup can be a periodic job.
    return this.prisma.attachment.update({
      where: { id },
      data: { url: '' },
    });
  }
}
