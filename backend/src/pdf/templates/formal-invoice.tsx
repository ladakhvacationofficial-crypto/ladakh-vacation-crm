import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, pdfFonts, brand } from './theme';
import { BrandHeader, BrandFooter, GoldRule, inr, shortDate } from './primitives';

/**
 * Input shape for a formal GST invoice PDF. Mirrors the Invoice + InvoiceLineItem
 * Prisma models so the controller just maps DB rows straight through.
 */
export interface FormalInvoiceInput {
  invoiceNumber: string;
  createdAt: Date | string;
  dueDate: Date | string | null;
  notes: string | null;

  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;

  status: string; // DRAFT | PAID | CANCELLED

  lead: {
    name: string;
    email: string | null;
  };

  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

/**
 * Formal line-item GST invoice — distinct from the booking pro-forma.
 * This is attached to a Lead (not a Booking) and has explicit line items
 * with quantity × unit price breakdowns.
 */
export function FormalInvoiceDocument({ inv }: { inv: FormalInvoiceInput }) {
  return (
    <Document
      title={`Invoice ${inv.invoiceNumber}`}
      author="Ladakh Vacation"
      subject="GST Invoice"
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Tax Invoice"
          docNumber={inv.invoiceNumber}
          issuedOn={new Date(inv.createdAt)}
        />

        {/* Parties */}
        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Billed to</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {inv.lead.name}
            </Text>
            {inv.lead.email && <Text style={pdfStyles.small}>{inv.lead.email}</Text>}
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Billed from</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              Ladakh Vacation
            </Text>
            <Text style={pdfStyles.small}>Srinagar, Kashmir</Text>
            <Text style={pdfStyles.small}>ladakhvacation@gmail.com</Text>
          </View>
        </View>

        {/* Status + Due date */}
        {inv.dueDate && (
          <View style={{ marginBottom: 12 }}>
            <Text style={pdfStyles.small}>
              Due date: {shortDate(inv.dueDate)}
            </Text>
          </View>
        )}

        {/* Line items table */}
        <View style={{ marginBottom: 18 }}>
          <Text style={pdfStyles.sectionLabel}>Line items</Text>
          <GoldRule width={20} />
          <View style={pdfStyles.table}>
            <View style={pdfStyles.th}>
              <Text style={{ ...pdfStyles.thText, flex: 4 }}>Description</Text>
              <Text style={{ ...pdfStyles.thText, width: 50, textAlign: 'right' }}>Qty</Text>
              <Text style={{ ...pdfStyles.thText, width: 90, textAlign: 'right' }}>Unit Price</Text>
              <Text style={{ ...pdfStyles.thText, width: 90, textAlign: 'right' }}>Total</Text>
            </View>
            {inv.lineItems.map((item, i) => (
              <View
                key={i}
                style={
                  i === inv.lineItems.length - 1
                    ? { ...pdfStyles.tr, ...pdfStyles.trLast }
                    : pdfStyles.tr
                }
              >
                <Text style={{ ...pdfStyles.td, flex: 4 }}>{item.description}</Text>
                <Text style={{ ...pdfStyles.td, width: 50, textAlign: 'right' }}>
                  {item.quantity}
                </Text>
                <Text style={{ ...pdfStyles.td, width: 90, textAlign: 'right' }}>
                  {inr(item.unitPrice)}
                </Text>
                <Text style={{ ...pdfStyles.td, width: 90, textAlign: 'right', fontWeight: 700 }}>
                  {inr(item.total)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals block */}
        <View
          style={{
            marginBottom: 20,
            padding: 12,
            backgroundColor: brand.parchment,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: brand.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
            <Text style={pdfStyles.small}>Subtotal</Text>
            <Text style={{ ...pdfStyles.td, color: brand.text }}>{inr(inv.subtotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
            <Text style={pdfStyles.small}>GST @ {inv.gstRate}%</Text>
            <Text style={{ ...pdfStyles.td, color: brand.text }}>{inr(inv.gstAmount)}</Text>
          </View>
          <View
            style={{
              marginTop: 4,
              paddingTop: 6,
              borderTopWidth: 1,
              borderTopColor: brand.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>Total</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>{inr(inv.total)}</Text>
          </View>
        </View>

        {/* Grand total banner */}
        <View
          style={{
            marginBottom: 20,
            padding: 16,
            backgroundColor: brand.teal,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 8,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: brand.gold,
              }}
            >
              {inv.status === 'PAID' ? 'Paid' : 'Amount due'}
            </Text>
            <Text
              style={{
                fontFamily: pdfFonts.display,
                fontWeight: 700,
                fontSize: 28,
                color: '#FFFFFF',
                marginTop: 2,
                letterSpacing: -0.5,
              }}
            >
              {inr(inv.total)}
            </Text>
          </View>
        </View>

        {inv.notes && (
          <View style={{ marginTop: 4 }}>
            <Text style={pdfStyles.sectionLabel}>Notes</Text>
            <GoldRule width={20} />
            <Text style={pdfStyles.para}>{inv.notes}</Text>
          </View>
        )}

        <BrandFooter />
      </Page>
    </Document>
  );
}
