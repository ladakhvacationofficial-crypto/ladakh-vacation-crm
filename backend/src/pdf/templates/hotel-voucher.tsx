import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles, brand } from './theme';
import { BrandHeader, BrandFooter, GoldRule, shortDate } from './primitives';

export interface HotelVoucherInput {
  voucherNumber: string;
  bookingNumber: string;
  createdAt: Date | string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  totalPax: number;
  adults: number;
  children: number;
  hotelName: string;
  hotelCity: string;
  hotelAddress?: string | null;
  hotelPhone?: string | null;
  hotelContactPerson?: string | null;
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  roomVariant: string;
  roomCount: number;
  mealPlan: string;
  inclusions?: string | null;
  specialRequests?: string | null;
  confirmationCode?: string | null;
  billingInstruction?: string;
  emergencyContact?: string;
}

const voucherStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAF8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 12,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1917',
  },
  valueLarge: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: brand.teal,
  },
  tag: {
    backgroundColor: '#F59E0B20',
    color: '#B45309',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#F59E0B40',
  },
  clauseBox: {
    backgroundColor: '#FEF3C720',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  clauseText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#44403C',
    lineHeight: 1.35,
  },
  instructionsText: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#78716C',
    lineHeight: 1.4,
  },
});

export function HotelVoucherDocument({ v }: { v: HotelVoucherInput }) {
  const billingNote =
    v.billingInstruction ??
    'Direct Billing to Ladakh Vacation as per approved B2B supplier contract. All personal extras (laundry, room heaters, oxygen cylinders, beverages, room service) must be settled directly by the guest upon checkout.';
  const helpline = v.emergencyContact ?? '+91 94191 78901 / ops@ladakhvacation.in';

  return (
    <Document
      title={`Hotel Voucher ${v.voucherNumber}`}
      author="Ladakh Vacation"
      subject={`Accommodation Voucher for ${v.guestName} at ${v.hotelName}`}
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Hotel Confirmation Voucher"
          docNumber={v.voucherNumber}
          issuedOn={new Date(v.createdAt)}
        />

        <View style={{ marginBottom: 14 }}>
          <Text style={pdfStyles.h1}>Accommodation Confirmation</Text>
          <GoldRule />
          <Text style={pdfStyles.para}>
            Official Service Voucher issued for booking{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{v.bookingNumber}</Text>
            {v.confirmationCode ? ` · Supplier Ref: ${v.confirmationCode}` : ''}
          </Text>
        </View>

        {/* Primary Parties */}
        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Hotel / Camp Supplier</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.teal }}>
              {v.hotelName}
            </Text>
            <Text style={pdfStyles.small}>
              {v.hotelAddress ? `${v.hotelAddress}, ` : ''}{v.hotelCity}
            </Text>
            {v.hotelContactPerson && (
              <Text style={pdfStyles.small}>Attn: {v.hotelContactPerson}</Text>
            )}
            {v.hotelPhone && <Text style={pdfStyles.small}>Tel: {v.hotelPhone}</Text>}
          </View>

          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Primary Guest Details</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {v.guestName}
            </Text>
            <Text style={pdfStyles.small}>Phone: {v.guestPhone}</Text>
            {v.guestEmail && <Text style={pdfStyles.small}>Email: {v.guestEmail}</Text>}
            <Text style={{ ...pdfStyles.small, marginTop: 3 }}>
              Total Group: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{v.totalPax} Pax</Text> (
              {v.adults} Adults{v.children > 0 ? `, ${v.children} Children` : ''})
            </Text>
          </View>
        </View>

        {/* Stay Parameters */}
        <View style={voucherStyles.card}>
          <View style={voucherStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={voucherStyles.label}>Check-In Date</Text>
              <Text style={voucherStyles.valueLarge}>{shortDate(v.checkIn)}</Text>
              <Text style={voucherStyles.instructionsText}>Standard Check-in: 12:00 PM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={voucherStyles.label}>Check-Out Date</Text>
              <Text style={voucherStyles.valueLarge}>{shortDate(v.checkOut)}</Text>
              <Text style={voucherStyles.instructionsText}>Standard Check-out: 10:00 AM</Text>
            </View>
            <View style={{ width: 80, alignItems: 'flex-end' }}>
              <Text style={voucherStyles.label}>Duration</Text>
              <Text style={voucherStyles.valueLarge}>
                {v.nights} Night{v.nights === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#E7E5E4', marginVertical: 8 }} />

          <View style={voucherStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={voucherStyles.label}>Room Category</Text>
              <Text style={voucherStyles.value}>{v.roomVariant}</Text>
            </View>
            <View style={{ width: 100 }}>
              <Text style={voucherStyles.label}>Rooms Booked</Text>
              <Text style={voucherStyles.value}>
                {v.roomCount} Room{v.roomCount === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={{ width: 120, alignItems: 'flex-end' }}>
              <Text style={voucherStyles.label}>Meal Plan</Text>
              <Text style={voucherStyles.tag}>{v.mealPlan}</Text>
            </View>
          </View>

          {v.specialRequests && (
            <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#E7E5E4' }}>
              <Text style={voucherStyles.label}>Special Instructions / Notes</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica', color: '#1C1917' }}>
                {v.specialRequests}
              </Text>
            </View>
          )}
        </View>

        {/* Inclusions & Billing Protocol */}
        <View style={voucherStyles.clauseBox}>
          <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#92400E', marginBottom: 2 }}>
            Billing & Settlement Terms:
          </Text>
          <Text style={voucherStyles.clauseText}>{billingNote}</Text>
        </View>

        {/* Operational Guidelines for Ladakh */}
        <View style={{ marginTop: 4, marginBottom: 12 }}>
          <Text style={pdfStyles.sectionLabel}>Important Check-In Guidelines</Text>
          <Text style={voucherStyles.instructionsText}>
            • Valid Government-issued Photo ID (Aadhaar / Passport / Voter ID) is mandatory for all adult guests at check-in.
          </Text>
          <Text style={voucherStyles.instructionsText}>
            • In Ladakh's high-altitude environment, hot water timings and central heating may be limited to designated morning and evening hours as per property guidelines.
          </Text>
          <Text style={voucherStyles.instructionsText}>
            • For emergency check-in assistance, room changes, or weather delays, contact Ladakh Vacation 24/7 Operations Desk at{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{helpline}</Text>.
          </Text>
        </View>

        <BrandFooter />
      </Page>
    </Document>
  );
}
