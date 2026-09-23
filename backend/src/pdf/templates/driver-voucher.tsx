import * as React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles, brand } from './theme';
import { BrandHeader, BrandFooter, GoldRule, shortDate } from './primitives';

export interface DriverVoucherDay {
  dayNumber: number;
  date?: Date | string | null;
  routeTitle: string;
  nightHalt?: string | null;
  sightseeing?: string | null;
}

export interface DriverVoucherInput {
  voucherNumber: string;
  bookingNumber: string;
  createdAt: Date | string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  totalPax: number;
  adults: number;
  children: number;
  vehicleType: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  transporterName?: string | null;
  reportingDate: Date | string;
  reportingTime?: string | null;
  reportingLocation: string;
  circuitDays: DriverVoucherDay[];
  inclusions?: string | null;
  specialInstructions?: string | null;
  emergencyContact?: string;
}

const driverStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAF8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  value: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1917',
  },
  valueHighlight: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: brand.teal,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D6D3D1',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#E7E5E4',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colDay: { width: 50 },
  colDate: { width: 75 },
  colRoute: { flex: 1, paddingRight: 6 },
  colHalt: { width: 90, textAlign: 'right' },
  disclaimer: {
    backgroundColor: '#FEF3C720',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#44403C',
    lineHeight: 1.3,
  },
});

export function DriverVoucherDocument({ d }: { d: DriverVoucherInput }) {
  const helpline = d.emergencyContact ?? '+91 94191 78901 / ops@ladakhvacation.in';
  const inclusionsText =
    d.inclusions ??
    'Private Vehicle with dedicated driver. Includes fuel, driver daily allowance (DA), parking fees, state road tax, and local high-altitude transit charges as per Ladakh Taxi Union tariff rules. AC is switched off on steep mountain passes.';

  return (
    <Document
      title={`Driver Duty Slip ${d.voucherNumber}`}
      author="Ladakh Vacation"
      subject={`Transport Duty Slip for ${d.guestName} - ${d.vehicleType}`}
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Transport Voucher & Duty Slip"
          docNumber={d.voucherNumber}
          issuedOn={new Date(d.createdAt)}
        />

        <View style={{ marginBottom: 10 }}>
          <Text style={pdfStyles.h1}>Driver Duty & Circuit Slip</Text>
          <GoldRule />
          <Text style={pdfStyles.para}>
            Designated vehicle allocation for booking{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{d.bookingNumber}</Text>
          </Text>
        </View>

        {/* Primary Information Columns */}
        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Vehicle & Crew Allocation</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.teal }}>
              {d.vehicleType}
            </Text>
            {d.vehicleNumber && (
              <Text style={pdfStyles.small}>Reg. No: {d.vehicleNumber}</Text>
            )}
            <Text style={pdfStyles.small}>
              Driver: {d.driverName ?? 'Assigned at Leh Dispatch Desk'}
            </Text>
            {d.driverPhone && <Text style={pdfStyles.small}>Driver Phone: {d.driverPhone}</Text>}
            {d.transporterName && (
              <Text style={pdfStyles.small}>Fleet Vendor: {d.transporterName}</Text>
            )}
          </View>

          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Guest & Group Details</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {d.guestName}
            </Text>
            <Text style={pdfStyles.small}>Contact: {d.guestPhone}</Text>
            {d.guestEmail && <Text style={pdfStyles.small}>Email: {d.guestEmail}</Text>}
            <Text style={{ ...pdfStyles.small, marginTop: 2 }}>
              Group Size: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{d.totalPax} Pax</Text> (
              {d.adults} Adults{d.children > 0 ? `, ${d.children} Children` : ''})
            </Text>
          </View>
        </View>

        {/* Reporting Details Card */}
        <View style={driverStyles.card}>
          <View style={driverStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={driverStyles.label}>Reporting Date & Time</Text>
              <Text style={driverStyles.valueHighlight}>
                {shortDate(d.reportingDate)}{d.reportingTime ? ` @ ${d.reportingTime}` : ' (On Arrival)'}
              </Text>
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={driverStyles.label}>Reporting / Pickup Location</Text>
              <Text style={driverStyles.value}>{d.reportingLocation}</Text>
            </View>
          </View>
        </View>

        {/* Day-by-Day Circuit / Route Schedule */}
        <View style={{ marginBottom: 8 }}>
          <Text style={pdfStyles.sectionLabel}>Designated Route & Daily Circuit</Text>
          <View style={driverStyles.tableHeader}>
            <Text style={{ ...driverStyles.label, ...driverStyles.colDay }}>Day</Text>
            <Text style={{ ...driverStyles.label, ...driverStyles.colDate }}>Date</Text>
            <Text style={{ ...driverStyles.label, ...driverStyles.colRoute }}>Route / Sightseeing Circuit</Text>
            <Text style={{ ...driverStyles.label, ...driverStyles.colHalt }}>Night Halt</Text>
          </View>

          {d.circuitDays.map((day) => (
            <View key={day.dayNumber} style={driverStyles.tableRow}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', ...driverStyles.colDay }}>
                Day {day.dayNumber}
              </Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica', color: '#57534E', ...driverStyles.colDate }}>
                {shortDate(day.date)}
              </Text>
              <View style={driverStyles.colRoute}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1C1917' }}>
                  {day.routeTitle}
                </Text>
                {day.sightseeing && (
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica', color: '#78716C', marginTop: 1 }}>
                    {day.sightseeing}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: brand.teal, ...driverStyles.colHalt }}>
                {day.nightHalt ?? 'Leh'}
              </Text>
            </View>
          ))}
        </View>

        {/* Transport Terms */}
        <View style={driverStyles.disclaimer}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400E', marginBottom: 1 }}>
            Driver Duty Protocol & Inclusions:
          </Text>
          <Text style={driverStyles.disclaimerText}>{inclusionsText}</Text>
          {d.specialInstructions && (
            <Text style={{ ...driverStyles.disclaimerText, marginTop: 2, fontFamily: 'Helvetica-Bold' }}>
              Note: {d.specialInstructions}
            </Text>
          )}
        </View>

        {/* Operational Safety & Union Guidelines */}
        <View style={{ marginBottom: 8 }}>
          <Text style={pdfStyles.sectionLabel}>Important Guidelines for High Passes</Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica', color: '#78716C', lineHeight: 1.35 }}>
            • Mountain passes (Khardung La, Chang La) are subject to Border Roads Organisation (BRO) and traffic police timings.
          </Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica', color: '#78716C', lineHeight: 1.35 }}>
            • Drivers are instructed not to halt for more than 15-20 minutes at high pass summits to prevent Acute Mountain Sickness (AMS).
          </Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica', color: '#78716C', lineHeight: 1.35 }}>
            • 24/7 Fleet Dispatch Helpline: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{helpline}</Text>.
          </Text>
        </View>

        <BrandFooter />
      </Page>
    </Document>
  );
}
