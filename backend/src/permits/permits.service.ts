import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PermitStatus, PermitType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermitDto, CreatePermitTravellerDto } from './dto/create-permit.dto';
import { UpdatePermitDto } from './dto/update-permit.dto';
import { toDateOrNull } from '../common/dates';

@Injectable()
export class PermitsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate statutory government fees per LAHDC / DC Office Leh regulations:
   *   - Environmental / Green Fee: ₹400 / pax
   *   - Red Cross Fund: ₹100 / pax
   *   - Wildlife Protection Fee: ₹20 / pax / day
   */
  calculateStatutoryFees(paxCount: number, from: Date, to: Date) {
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const validPax = Math.max(0, paxCount);

    const environmentalFee = 400 * validPax;
    const redCrossFee = 100 * validPax;
    const wildlifeFee = 20 * days * validPax;
    const totalFee = environmentalFee + redCrossFee + wildlifeFee;

    return {
      days,
      paxCount: validPax,
      environmentalFee,
      redCrossFee,
      wildlifeFee,
      totalFee,
    };
  }

  async createPermit(dto: CreatePermitDto, createdById?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { id: true, bookingNumber: true, leadId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const from = new Date(dto.validFrom);
    const to = new Date(dto.validTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid permit validity dates');
    }
    if (from > to) {
      throw new BadRequestException('validFrom cannot be after validTo');
    }

    const travellers = dto.travellers || [];
    const fees = this.calculateStatutoryFees(travellers.length, from, to);

    const permit = await this.prisma.permitApplication.create({
      data: {
        bookingId: dto.bookingId,
        permitType: dto.permitType ?? PermitType.ILP_DOMESTIC,
        status: dto.status ?? (travellers.length > 0 ? PermitStatus.DOCS_VERIFIED : PermitStatus.PENDING_DOCS),
        sectors: dto.sectors,
        validFrom: from,
        validTo: to,
        dcOfficeRef: dto.dcOfficeRef ?? null,
        environmentalFee: fees.environmentalFee,
        wildlifeFee: fees.wildlifeFee,
        redCrossFee: fees.redCrossFee,
        totalFee: fees.totalFee,
        notes: dto.notes ?? null,
        createdById: createdById ?? null,
        travellers: {
          create: travellers.map((t) => ({
            fullName: t.fullName.trim(),
            age: t.age ?? null,
            gender: t.gender ?? null,
            nationality: t.nationality ?? 'Indian',
            stateOrCountry: t.stateOrCountry ?? null,
            idType: t.idType ?? 'AADHAAR',
            idNumber: t.idNumber.trim(),
            idDocumentUrl: t.idDocumentUrl ?? null,
            passportIssueDate: toDateOrNull(t.passportIssueDate),
            passportExpiryDate: toDateOrNull(t.passportExpiryDate),
            visaNumber: t.visaNumber?.trim() ?? null,
            visaExpiryDate: toDateOrNull(t.visaExpiryDate),
          })),
        },
      },
      include: {
        travellers: true,
        booking: { select: { bookingNumber: true, packageName: true } },
      },
    });

    if (booking.leadId) {
      await this.prisma.activity.create({
        data: {
          leadId: booking.leadId,
          type: 'NOTE',
          content: `Generated ${permit.permitType === PermitType.ILP_DOMESTIC ? 'Inner Line Permit (ILP)' : 'Protected Area Permit (PAP)'} application for ${travellers.length} travelers (Sectors: ${dto.sectors.join(', ')} | Fees: ₹${fees.totalFee.toLocaleString('en-IN')})`,
        },
      });
    }

    return permit;
  }

  async listPermits(params?: {
    bookingId?: string;
    status?: PermitStatus;
    fromDate?: string;
    toDate?: string;
  }) {
    const where: Prisma.PermitApplicationWhereInput = {};
    if (params?.bookingId) where.bookingId = params.bookingId;
    if (params?.status) where.status = params.status;
    if (params?.fromDate) {
      const from = new Date(params.fromDate);
      if (!isNaN(from.getTime())) where.validTo = { gte: from };
    }
    if (params?.toDate) {
      const to = new Date(params.toDate);
      if (!isNaN(to.getTime())) where.validFrom = { lte: to };
    }

    return this.prisma.permitApplication.findMany({
      where,
      orderBy: { validFrom: 'desc' },
      include: {
        booking: { select: { id: true, bookingNumber: true, packageName: true, lead: { select: { name: true, phone: true } } } },
        travellers: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async getPermit(id: string) {
    const permit = await this.prisma.permitApplication.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            packageName: true,
            travelStartDate: true,
            travelEndDate: true,
            lead: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        travellers: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!permit) throw new NotFoundException('Permit application not found');
    return permit;
  }

  async updatePermit(id: string, dto: UpdatePermitDto) {
    const existing = await this.getPermit(id);

    return this.prisma.permitApplication.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.permitNumber !== undefined ? { permitNumber: dto.permitNumber.trim() } : {}),
        ...(dto.dcOfficeRef !== undefined ? { dcOfficeRef: dto.dcOfficeRef.trim() } : {}),
        ...(dto.issuedAt !== undefined ? { issuedAt: toDateOrNull(dto.issuedAt) } : {}),
        ...(dto.environmentalFee !== undefined ? { environmentalFee: dto.environmentalFee } : {}),
        ...(dto.wildlifeFee !== undefined ? { wildlifeFee: dto.wildlifeFee } : {}),
        ...(dto.redCrossFee !== undefined ? { redCrossFee: dto.redCrossFee } : {}),
        ...(dto.totalFee !== undefined ? { totalFee: dto.totalFee } : {}),
        ...(dto.feeReceiptNumber !== undefined ? { feeReceiptNumber: dto.feeReceiptNumber.trim() } : {}),
        ...(dto.documentScanUrl !== undefined ? { documentScanUrl: dto.documentScanUrl } : {}),
        ...(dto.rejectedReason !== undefined ? { rejectedReason: dto.rejectedReason } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        travellers: true,
        booking: { select: { bookingNumber: true } },
      },
    });
  }

  async addTraveller(permitId: string, dto: CreatePermitTravellerDto) {
    const permit = await this.getPermit(permitId);

    const traveller = await this.prisma.permitTraveller.create({
      data: {
        permitApplicationId: permitId,
        fullName: dto.fullName.trim(),
        age: dto.age ?? null,
        gender: dto.gender ?? null,
        nationality: dto.nationality ?? 'Indian',
        stateOrCountry: dto.stateOrCountry ?? null,
        idType: dto.idType ?? 'AADHAAR',
        idNumber: dto.idNumber.trim(),
        idDocumentUrl: dto.idDocumentUrl ?? null,
        passportIssueDate: toDateOrNull(dto.passportIssueDate),
        passportExpiryDate: toDateOrNull(dto.passportExpiryDate),
        visaNumber: dto.visaNumber?.trim() ?? null,
        visaExpiryDate: toDateOrNull(dto.visaExpiryDate),
      },
    });

    // Recompute statutory fees
    const newPaxCount = permit.travellers.length + 1;
    const fees = this.calculateStatutoryFees(newPaxCount, permit.validFrom, permit.validTo);
    await this.prisma.permitApplication.update({
      where: { id: permitId },
      data: {
        environmentalFee: fees.environmentalFee,
        wildlifeFee: fees.wildlifeFee,
        redCrossFee: fees.redCrossFee,
        totalFee: fees.totalFee,
      },
    });

    return traveller;
  }

  async removeTraveller(permitId: string, travellerId: string) {
    const permit = await this.getPermit(permitId);
    await this.prisma.permitTraveller.delete({ where: { id: travellerId } });

    // Recompute statutory fees
    const newPaxCount = Math.max(0, permit.travellers.length - 1);
    const fees = this.calculateStatutoryFees(newPaxCount, permit.validFrom, permit.validTo);
    await this.prisma.permitApplication.update({
      where: { id: permitId },
      data: {
        environmentalFee: fees.environmentalFee,
        wildlifeFee: fees.wildlifeFee,
        redCrossFee: fees.redCrossFee,
        totalFee: fees.totalFee,
      },
    });

    return { deleted: true, travellerId };
  }
}
