import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateB2bPartnerDto } from './dto/create-b2b-partner.dto';
import { Actor } from '../common/access';

@Injectable()
export class B2bPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateB2bPartnerDto, actor: Actor) {
    const existing = await this.prisma.b2bPartner.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException('A B2B Partner with this phone number is already registered.');
    }

    return this.prisma.b2bPartner.create({
      data: {
        ...dto,
        assignedToId: actor.id,
      },
    });
  }

  async findAll() {
    return this.prisma.b2bPartner.findMany({
      orderBy: { agencyName: 'asc' },
      include: {
        assignedTo: { select: { name: true, email: true } },
        _count: { select: { leads: true } },
      }
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.b2bPartner.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { name: true } },
        leads: {
          select: { id: true, name: true, status: true, budget: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }
      }
    });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async update(id: string, dto: Partial<CreateB2bPartnerDto>) {
    await this.findOne(id);
    if (dto.phone) {
      const existing = await this.prisma.b2bPartner.findUnique({
        where: { phone: dto.phone },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Another partner with this phone number already exists.');
      }
    }
    return this.prisma.b2bPartner.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const partner = await this.findOne(id);
    const leadCount = await this.prisma.lead.count({ where: { b2bPartnerId: id } });
    if (leadCount > 0) {
      throw new ConflictException(`Cannot delete partner with ${leadCount} associated leads. Reassign leads before deleting.`);
    }
    return this.prisma.b2bPartner.delete({
      where: { id },
    });
  }
}
