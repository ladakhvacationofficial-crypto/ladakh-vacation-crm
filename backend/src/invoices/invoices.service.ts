import { withNumberRetry } from '../common/sequence';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Actor, canSeeAllLeads } from '../common/access';
import { InvoiceStatus } from '@prisma/client';
import { gstBreakdown } from '../common/pricing';
import { withNumberRetry } from '../common/sequence';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateInvoiceNumber(): Promise<string> {
    const prefix = `LV-INV-${new Date().getUTCFullYear()}-`;
    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' }, select: { invoiceNumber: true },
    });
    const next = last ? Number(last.invoiceNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private async assertLeadAccess(leadId: string, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || (!canSeeAllLeads(actor.role) && lead.assignedToId !== actor.id)) {
      throw new NotFoundException('Lead not found');
    }
  }

  async create(dto: CreateInvoiceDto, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.assertLeadAccess(dto.leadId, actor);
    const settings = await this.prisma.pricingSettings.findFirst();
    const effectiveGstRate = dto.gstRate !== undefined ? dto.gstRate : (settings?.gstPercent ?? 5.0);

    let grossTotal = 0;
    const items = dto.lineItems.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      grossTotal += lineTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: lineTotal,
      };
    });

    // Tour totals are tax-inclusive: split total into base subtotal and GST portion
    const split = gstBreakdown(grossTotal, effectiveGstRate);
    const subtotal = split.baseAmount;
    const gstAmount = split.gstAmount;
    const total = split.total;

    return withNumberRetry(async () => this.prisma.invoice.create({
      data: {
        invoiceNumber: await this.generateInvoiceNumber(),
        leadId: dto.leadId,
        subtotal,
        gstRate: effectiveGstRate,
        gstAmount,
        total,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        createdById: actor.id,
        lineItems: {
          create: items,
        },
      },
      include: {
        lineItems: true,
      }
    }));
  }

  async findOne(id: string, actor: Actor) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lead: { select: { name: true, email: true } },
        lineItems: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.assertLeadAccess(invoice.leadId, actor);
    return invoice;
  }

  async findAll() {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true, email: true } },
      }
    });
  }

  async findByLead(leadId: string, actor: Actor) {
    await this.assertLeadAccess(leadId, actor);
    return this.prisma.invoice.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
      }
    });
  }

  async markAsPaid(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
    });
  }

  async createFromBooking(bookingId: string, actor: Actor) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertLeadAccess(booking.leadId, actor);

    const settings = await this.prisma.pricingSettings.findFirst();
    const effectiveGstRate = settings?.gstPercent ?? 5.0;

    const totalSell = booking.totalSell || 0;
    const split = gstBreakdown(totalSell, effectiveGstRate);

    const description = `${booking.packageName || 'Ladakh Tour Package'} (${booking.bookingNumber}) - ${booking.adults || 2} Adults${booking.children ? `, ${booking.children} Children` : ''} - ${booking.nights || 5} Nights`;

    return withNumberRetry(async () => {
      const invoiceNumber = await this.generateInvoiceNumber();
      return this.prisma.invoice.create({
        data: {
          invoiceNumber,
          leadId: booking.leadId,
          bookingId: booking.id,
          subtotal: split.baseAmount,
          gstRate: effectiveGstRate,
          gstAmount: split.gstAmount,
          total: split.total,
          notes: booking.notes,
          createdById: actor.id,
          lineItems: {
            create: [
              {
                description,
                quantity: 1,
                unitPrice: totalSell,
                total: totalSell,
              },
            ],
          },
        },
        include: {
          lineItems: true,
        },
      });
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.invoice.findMany({
      where: { bookingId },
      include: { lineItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
