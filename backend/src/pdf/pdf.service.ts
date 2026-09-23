import * as React from 'react';
import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotationDocument, QuotationInput } from './templates/quotation';
import { InvoiceDocument, InvoiceInput } from './templates/invoice';
import { FormalInvoiceDocument, FormalInvoiceInput } from './templates/formal-invoice';
import { HotelVoucherDocument, HotelVoucherInput } from './templates/hotel-voucher';
import { DriverVoucherDocument, DriverVoucherInput } from './templates/driver-voucher';

export { HotelVoucherInput, DriverVoucherInput };

/**
 * PDF rendering service. Pure: it takes a DTO shape and returns bytes.
 * Doesn't know about Prisma; that mapping happens in whichever controller
 * calls it. That keeps templates independent of the ORM and makes them
 * trivial to unit-test with hand-written fixtures.
 *
 * Variants:
 *   renderQuotation       – quotation PDF for prospective clients
 *   renderProFormaInvoice – booking-based payment summary
 *   renderFormalInvoice   – line-item GST invoice from the Invoice model
 *   renderHotelVoucher    – accommodation voucher for hotels/camps
 *   renderDriverVoucher   – transport duty slip and day-by-day circuit sheet
 */
@Injectable()
export class PdfService {
  async renderQuotation(input: QuotationInput): Promise<Buffer> {
    return renderToBuffer(
      React.createElement(QuotationDocument, { q: input }) as any,
    );
  }

  /**
   * Pro-forma invoice — generated from a Booking. Shows package total,
   * payments received, balance due. No line-item breakdown.
   * @deprecated Use renderProFormaInvoice() — kept for backward compat.
   */
  async renderInvoice(input: InvoiceInput): Promise<Buffer> {
    return this.renderProFormaInvoice(input);
  }

  /** Pro-forma invoice from a Booking. */
  async renderProFormaInvoice(input: InvoiceInput): Promise<Buffer> {
    return renderToBuffer(
      React.createElement(InvoiceDocument, { b: input }) as any,
    );
  }

  /** Formal GST invoice from the Invoice model (line items + tax). */
  async renderFormalInvoice(input: FormalInvoiceInput): Promise<Buffer> {
    return renderToBuffer(
      React.createElement(FormalInvoiceDocument, { inv: input }) as any,
    );
  }

  /** Hotel / Camp confirmation voucher. */
  async renderHotelVoucher(input: HotelVoucherInput): Promise<Buffer> {
    return renderToBuffer(
      React.createElement(HotelVoucherDocument, { v: input }) as any,
    );
  }

  /** Driver duty slip and transport voucher. */
  async renderDriverVoucher(input: DriverVoucherInput): Promise<Buffer> {
    return renderToBuffer(
      React.createElement(DriverVoucherDocument, { d: input }) as any,
    );
  }
}
