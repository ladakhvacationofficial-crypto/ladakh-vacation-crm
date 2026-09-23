import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, pdfFonts, brand } from './theme';
import { BrandHeader, BrandFooter, GoldRule, SellerIdentity, inr, shortDate } from './primitives';

export interface InvoiceInput {
  bookingNumber: string;
  packageName: string | null;
  travelStartDate: Date | string | null;
  travelEndDate: Date | string | null;
  adults: number;
  children: number;
  nights: number;
  totalSell: number;
  totalReceived: number;
  /** Effective GST rate (%). Zero or omitted → hide the tax split. */
  gstPercent?: number;
  createdAt: Date | string;
  notes: string | null;
  lead: {
    name: string;
    phone: string;
    email: string | null;
  };
  payments: {
    receivedAt: Date | string;
    amount: number;
    mode: string;
    reference: string | null;
    isRefund: boolean;
  }[];
}

/**
 * Booking invoice — what the client sees. VENDOR COSTS AND MARGIN are never
 * present in this document; a client should never learn what Ladakh Vacation pays a
 * hotel. Only the sell price, what has been received, and what remains due.
 */
export function InvoiceDocument({ b }: { b: InvoiceInput }) {
  const balance = Math.max(0, b.totalSell - b.totalReceived);
  const balanceLabel =
    balance === 0
      ? 'Paid in full'
      : b.totalReceived > 0
        ? 'Balance due'
        : 'Amount due';

  // Package total is GST-inclusive. Split it so the client can claim ITC
  // if their GSTIN allows. See quotes/pricing.ts for the policy comment.
  const gstPct = b.gstPercent ?? 0;
  const gstBase = gstPct > 0 ? Math.round(b.totalSell / (1 + gstPct / 100)) : b.totalSell;
  const gstAmount = b.totalSell - gstBase;

  return (
    <Document
      title={`Invoice ${b.bookingNumber}`}
      author="Ladakh Vacation"
      subject={b.packageName ?? 'Booking invoice'}
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Invoice"
          docNumber={b.bookingNumber}
          issuedOn={new Date(b.createdAt)}
        />

        <View style={{ marginBottom: 18 }}>
          <Text style={pdfStyles.h1}>{b.packageName ?? 'Travel booking'}</Text>
          <GoldRule />
          {b.travelStartDate && (
            <Text style={pdfStyles.para}>
              Travel dates: {shortDate(b.travelStartDate)}
              {b.travelEndDate && `  –  ${shortDate(b.travelEndDate)}`}
              {b.nights > 0 && `  ·  ${b.nights} night${b.nights === 1 ? '' : 's'}`}
              {'  ·  '}
              {b.adults + b.children} pax
            </Text>
          )}
        </View>

        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Billed to</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {b.lead.name}
            </Text>
            <Text style={pdfStyles.small}>{b.lead.phone}</Text>
            {b.lead.email && <Text style={pdfStyles.small}>{b.lead.email}</Text>}
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Billed from</Text>
            <SellerIdentity />
          </View>
        </View>

        {/* Tax breakdown row — invoice-style summary. Skipped when GST is
            zero (rare but happens for tax-exempt segments). */}
        {gstPct > 0 && (
          <View
            style={{
              marginBottom: 10,
              padding: 12,
              backgroundColor: brand.parchment,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: brand.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 2,
              }}
            >
              <Text style={pdfStyles.small}>Package base</Text>
              <Text style={{ ...pdfStyles.td, color: brand.text }}>
                {inr(gstBase)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 2,
              }}
            >
              <Text style={pdfStyles.small}>GST @ {gstPct}% (inclusive)</Text>
              <Text style={{ ...pdfStyles.td, color: brand.text }}>
                {inr(gstAmount)}
              </Text>
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
              <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
                Package total
              </Text>
              <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
                {inr(b.totalSell)}
              </Text>
            </View>
          </View>
        )}

        {/* Amount block — the number that matters, big and centred. */}
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
              {balanceLabel}
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
              {inr(balance === 0 ? b.totalSell : balance)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: brand.tealLight }}>
              Package total {inr(b.totalSell)}
            </Text>
            {b.totalReceived > 0 && (
              <Text style={{ fontSize: 9, color: brand.tealLight, marginTop: 2 }}>
                Received so far {inr(b.totalReceived)}
              </Text>
            )}
          </View>
        </View>

        {b.payments.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={pdfStyles.sectionLabel}>Payments received</Text>
            <GoldRule width={20} />
            <View style={pdfStyles.table}>
              <View style={pdfStyles.th}>
                <Text style={{ ...pdfStyles.thText, flex: 2 }}>Date</Text>
                <Text style={{ ...pdfStyles.thText, flex: 2 }}>Mode</Text>
                <Text style={{ ...pdfStyles.thText, flex: 3 }}>Reference</Text>
                <Text style={{ ...pdfStyles.thText, width: 90, textAlign: 'right' }}>
                  Amount
                </Text>
              </View>
              {b.payments.map((p, i) => (
                <View
                  key={i}
                  style={
                    i === b.payments.length - 1
                      ? { ...pdfStyles.tr, ...pdfStyles.trLast }
                      : pdfStyles.tr
                  }
                >
                  <Text style={{ ...pdfStyles.td, flex: 2 }}>
                    {shortDate(p.receivedAt)}
                  </Text>
                  <Text style={{ ...pdfStyles.td, flex: 2 }}>
                    {p.mode.replace(/_/g, ' ').toLowerCase()}
                    {p.isRefund && '  (refund)'}
                  </Text>
                  <Text style={{ ...pdfStyles.td, flex: 3, color: brand.muted }}>
                    {p.reference ?? '—'}
                  </Text>
                  <Text
                    style={{
                      ...pdfStyles.td,
                      width: 90,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: p.isRefund ? brand.loss : brand.ink,
                    }}
                  >
                    {inr(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {b.notes && (
          <View style={{ marginTop: 4 }}>
            <Text style={pdfStyles.sectionLabel}>Notes</Text>
            <GoldRule width={20} />
            <Text style={pdfStyles.para}>{b.notes}</Text>
          </View>
        )}

        {balance > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={pdfStyles.sectionLabel}>How to pay</Text>
            <GoldRule width={20} />
            <Text style={pdfStyles.para}>
              Pay directly via UPI, bank transfer, or through the payment link
              your agent shares. Please quote invoice {b.bookingNumber} on any
              transfer.
            </Text>
          </View>
        )}

        <BrandFooter />
      </Page>
    </Document>
  );
}
