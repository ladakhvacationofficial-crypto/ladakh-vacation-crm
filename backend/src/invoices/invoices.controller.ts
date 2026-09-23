import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Header,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PdfService } from '../pdf/pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Actor } from '../common/access';
import { Role } from '@prisma/client';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdf: PdfService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS, Role.SALES_EXEC)
  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto, @CurrentUser() actor: Actor) {
    return this.invoicesService.create(createInvoiceDto, actor);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS)
  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS, Role.SALES_EXEC)
  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string, @CurrentUser() actor: Actor) {
    return this.invoicesService.findByLead(leadId, actor);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS, Role.SALES_EXEC)
  @Post('booking/:bookingId')
  createFromBooking(
    @Param('bookingId') bookingId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.invoicesService.createFromBooking(bookingId, actor);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS, Role.SALES_EXEC)
  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.invoicesService.findByBooking(bookingId);
  }

  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS)
  @Post(':id/paid')
  markAsPaid(@Param('id') id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  /**
   * Formal GST invoice PDF — line-item breakdown with tax.
   * Distinct from the booking pro-forma at GET /bookings/:id/invoice.pdf.
   */
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.SALES_MANAGER, Role.ACCOUNTS, Role.SALES_EXEC)
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() actor: Actor,
  ) {
    const [invoice, comp] = await Promise.all([
      this.invoicesService.findOne(id, actor),
      this.prisma.companyProfile.findUnique({ where: { id: 'default' } }),
    ]);
    const buf = await this.pdf.renderFormalInvoice({
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      subtotal: invoice.subtotal,
      gstRate: invoice.gstRate,
      gstAmount: invoice.gstAmount,
      total: invoice.total,
      status: invoice.status,
      companyProfile: comp,
      lead: {
        name: invoice.lead.name,
        email: invoice.lead.email,
      },
      lineItems: invoice.lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    });
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber}.pdf"`,
    );
    res.send(buf);
  }
}
