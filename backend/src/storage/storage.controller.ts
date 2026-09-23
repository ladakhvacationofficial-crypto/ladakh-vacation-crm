import { Controller, Post, Get, Delete, Param, Body, UploadedFile, UseInterceptors, BadRequestException, NotFoundException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Actor, INTERNAL_STAFF, canSeeAllLeads } from '../common/access';

@Roles(...INTERNAL_STAFF)
@Controller('uploads')
export class StorageController {
  constructor(private readonly storage: StorageService, private readonly prisma: PrismaService) {}

  private async assertEntity(type: string | null | undefined, id: string | null | undefined, actor: Actor, uploader?: string) {
    const owner = ['OWNER', 'SUPER_ADMIN'].includes(actor.role);
    if (!type && !id) {
      if (!uploader || uploader === actor.id || owner) return;
      throw new NotFoundException('Attachment not found');
    }
    if (!type || !id) throw new BadRequestException('Both entityType and entityId are required.');
    if (type === 'employee' || type === 'interview') {
      if (!owner) throw new NotFoundException('Attachment not found');
      const row = type === 'employee' ? await this.prisma.employee.findUnique({where:{id}}) : await this.prisma.interview.findUnique({where:{id}});
      if (!row) throw new NotFoundException('Entity not found');
      return;
    }
    let leadId = id;
    if (type === 'booking' || type === 'itinerary' || type === 'invoice') {
      const row = type === 'booking' ? await this.prisma.booking.findUnique({where:{id},select:{leadId:true}}) :
        type === 'itinerary' ? await this.prisma.itinerary.findUnique({where:{id},select:{leadId:true}}) :
        await this.prisma.invoice.findUnique({where:{id},select:{leadId:true}});
      if (!row) throw new NotFoundException('Entity not found');
      leadId = row.leadId;
    } else if (type !== 'lead') throw new BadRequestException('Unsupported attachment entity.');
    const lead = await this.prisma.lead.findUnique({where:{id:leadId},select:{assignedToId:true}});
    if (!lead || (!canSeeAllLeads(actor.role) && lead.assignedToId !== actor.id)) throw new NotFoundException('Attachment not found');
  }

  private publicShape(row: any) { return { ...row, url: `/api/uploads/${row.id}/content` }; }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string,
    @Body('entityType') entityType: string | undefined, @Body('entityId') entityId: string | undefined, @CurrentUser() actor: Actor) {
    if (!file) throw new BadRequestException('File is required');
    await this.assertEntity(entityType, entityId, actor);
    const url = await this.storage.uploadPrivate(file.buffer, file.originalname);
    try {
      const row = await this.prisma.attachment.create({ data: { url, filename: file.originalname, mimeType: file.mimetype,
        sizeBytes: file.size, folder: folder || 'general', entityType: entityType || null, entityId: entityId || null, uploadedById: actor.id } });
      return this.publicShape(row);
    } catch (error) { await this.storage.remove(url); throw error; }
  }

  @Get(':id/content')
  async content(@Param('id') id: string, @CurrentUser() actor: Actor, @Res() res: Response) {
    const row = await this.prisma.attachment.findUnique({where:{id}});
    if (!row) throw new NotFoundException('Attachment not found');
    await this.assertEntity(row.entityType, row.entityId, actor, row.uploadedById);
    const bytes = await this.storage.readPrivate(row.url);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(bytes);
  }

  @Get(':entityType/:entityId')
  async listByEntity(@Param('entityType') type: string, @Param('entityId') id: string, @CurrentUser() actor: Actor) {
    await this.assertEntity(type,id,actor);
    const rows = await this.prisma.attachment.findMany({ where: { entityType:type, entityId:id }, orderBy: { createdAt:'desc' } });
    return rows.map(row => this.publicShape(row));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() actor: Actor) {
    const row = await this.prisma.attachment.findUnique({where:{id}});
    if (!row) throw new NotFoundException('Attachment not found');
    await this.assertEntity(row.entityType,row.entityId,actor,row.uploadedById);
    if (row.uploadedById !== actor.id && !['OWNER','SUPER_ADMIN'].includes(actor.role)) throw new NotFoundException('Attachment not found');
    if (row.url) await this.storage.remove(row.url);
    await this.prisma.attachment.delete({where:{id}});
    return {deleted:true,id};
  }
}
