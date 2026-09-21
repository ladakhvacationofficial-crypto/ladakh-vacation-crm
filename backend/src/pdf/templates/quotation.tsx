import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, brand } from './theme';
import { BrandHeader, BrandFooter, GoldRule, inr, shortDate } from './primitives';

/**
 * Loosely-typed input so this template can live alongside the Prisma types
 * without importing them (keeps PDF templates independent of the ORM — one
 * day these might move to a worker).
 */
export interface QuotationInput {
  quoteNumber: string;
  title: string | null;
  validUntil: Date | string | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date | string;
  lead: {
    name: string;
    phone: string;
    email: string | null;
    city?: string | null;
  };
  options: {
    id: string;
    name: string;
    isRecommended: boolean;
    adults: number;
    children: number;
    nights: number;
    totalSell: number;
    perPersonSell: number;
    lines: {
      description: string;
      serviceType: string;
      quantity: number;
      units: number;
      lineSell: number;
    }[];
  }[];
}

/**
 * Client-facing quotation. Deliberately hides netRate / margin — the client
 * sees only the sell price. Internal margin lives on the CRM screen.
 *
 * Each tier gets its own boxed table with the total pinned at the bottom
 * right so the eye lands on the price the moment the page turns.
 */
export function QuotationDocument({ q }: { q: QuotationInput }) {
  const pax = (opt: QuotationInput['options'][number]) => opt.adults + opt.children;

  return (
    <Document
      title={`Quotation ${q.quoteNumber}`}
      author="Ladakh Vacation"
      subject={q.title ?? 'Travel quotation'}
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Quotation"
          docNumber={q.quoteNumber}
          issuedOn={new Date(q.createdAt)}
        />

        <View style={{ marginBottom: 18 }}>
          <Text style={pdfStyles.h1}>{q.title ?? 'Your custom itinerary'}</Text>
          <GoldRule />
          <Text style={pdfStyles.para}>
            Below are {q.options.length}{' '}
            {q.options.length === 1 ? 'option' : 'options'} tailored to your
            travel plans. Prices are all-inclusive of the services listed and
            hold until {q.validUntil ? shortDate(q.validUntil) : '30 days from issue'}.
          </Text>
        </View>

        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Prepared for</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {q.lead.name}
            </Text>
            <Text style={pdfStyles.small}>{q.lead.phone}</Text>
            {q.lead.email && <Text style={pdfStyles.small}>{q.lead.email}</Text>}
            {q.lead.city && <Text style={pdfStyles.small}>{q.lead.city}</Text>}
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Prepared by</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              Ladakh Vacation
            </Text>
            <Text style={pdfStyles.small}>Srinagar, Kashmir</Text>
            <Text style={pdfStyles.small}>ladakhvacation@gmail.com</Text>
            <Text style={pdfStyles.small}>www.ladakhvacation.in</Text>
          </View>
        </View>

        {q.options.length === 0 ? (
          <Text style={{ ...pdfStyles.para, color: brand.muted }}>
            No packages have been added to this quotation yet.
          </Text>
        ) : (
          q.options.map((opt) => (
            <View key={opt.id} style={{ marginBottom: 22 }} wrap={false}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 6,
                }}
              >
                <View>
                  <Text style={pdfStyles.h2}>{opt.name}</Text>
                  <Text style={pdfStyles.small}>
                    {pax(opt)} pax · {opt.nights} night{opt.nights === 1 ? '' : 's'}
                    {opt.isRecommended && '  ·  Recommended'}
                  </Text>
                </View>
                {opt.isRecommended && (
                  <View
                    style={{
                      backgroundColor: brand.gold,
                      color: brand.ink,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8,
                        letterSpacing: 1.2,
                        color: brand.ink,
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </Text>
                  </View>
                )}
              </View>

              <View style={pdfStyles.table}>
                <View style={pdfStyles.th}>
                  <Text style={{ ...pdfStyles.thText, flex: 3 }}>Service</Text>
                  <Text style={{ ...pdfStyles.thText, width: 60, textAlign: 'center' }}>Qty</Text>
                  <Text style={{ ...pdfStyles.thText, width: 60, textAlign: 'center' }}>Units</Text>
                  <Text style={{ ...pdfStyles.thText, width: 90, textAlign: 'right' }}>Amount</Text>
                </View>
                {opt.lines.length === 0 ? (
                  <View style={pdfStyles.tr}>
                    <Text style={{ ...pdfStyles.td, color: brand.muted, flex: 1 }}>
                      No services added.
                    </Text>
                  </View>
                ) : (
                  opt.lines.map((l, i) => (
                    <View
                      key={i}
                      style={
                        i === opt.lines.length - 1
                          ? { ...pdfStyles.tr, ...pdfStyles.trLast }
                          : pdfStyles.tr
                      }
                    >
                      <View style={{ flex: 3 }}>
                        <Text style={pdfStyles.td}>{l.description}</Text>
                        <Text style={{ ...pdfStyles.small, marginTop: 1 }}>
                          {l.serviceType.toLowerCase()}
                        </Text>
                      </View>
                      <Text style={{ ...pdfStyles.td, width: 60, textAlign: 'center' }}>
                        {l.quantity}
                      </Text>
                      <Text style={{ ...pdfStyles.td, width: 60, textAlign: 'center' }}>
                        {l.units}
                      </Text>
                      <Text
                        style={{
                          ...pdfStyles.td,
                          width: 90,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: brand.ink,
                        }}
                      >
                        {inr(l.lineSell)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View style={pdfStyles.totals}>
                {pax(opt) > 0 && (
                  <View style={pdfStyles.totalRow}>
                    <Text style={{ ...pdfStyles.small, color: brand.text }}>
                      Per person
                    </Text>
                    <Text style={{ ...pdfStyles.small, color: brand.text }}>
                      {inr(opt.perPersonSell)}
                    </Text>
                  </View>
                )}
                <View style={pdfStyles.totalGrand}>
                  <Text style={pdfStyles.totalGrandLabel}>Package total</Text>
                  <Text style={pdfStyles.totalGrandValue}>{inr(opt.totalSell)}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {q.notes && (
          <View style={{ marginTop: 6, marginBottom: 12 }}>
            <Text style={pdfStyles.sectionLabel}>Notes</Text>
            <GoldRule width={20} />
            <Text style={pdfStyles.para}>{q.notes}</Text>
          </View>
        )}

        {q.terms && (
          <View style={{ marginTop: 4 }} wrap={false}>
            <Text style={pdfStyles.sectionLabel}>Terms & conditions</Text>
            <GoldRule width={20} />
            <Text style={{ ...pdfStyles.small, lineHeight: 1.5 }}>{q.terms}</Text>
          </View>
        )}

        <BrandFooter />
      </Page>
    </Document>
  );
}
