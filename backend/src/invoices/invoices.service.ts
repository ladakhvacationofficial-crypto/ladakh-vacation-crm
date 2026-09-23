import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Actor } from '../common/access';
import { InvoiceStatus } from '@prisma/client';
import { gstBreakdown } from '../common/pricing';
import { withNumberRetry } from '../common/sequence';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LV-INV-${year}-`;
    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const n = last
      ? parseInt(last.invoiceNumber.slice(prefix.length), 10) + 1
      : 1;
    return `${prefix}${String(n).padStart(4, '0')}`;
  }

  async create(dto: CreateInvoiceDto, actor: Actor) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

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

    return withNumberRetry(async () => {
      const invoiceNumber = await this.nextInvoiceNumber();
      return this.prisma.invoice.create({
        data: {
          invoiceNumber,
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
        },
      });
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lead: { select: { name: true, email: true } },
        lineItems: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
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

  async findByLead(leadId: string) {
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
}
