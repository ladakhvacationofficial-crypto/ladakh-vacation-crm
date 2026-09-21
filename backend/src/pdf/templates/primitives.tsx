import * as React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles, brand } from './theme';

/**
 * Indian numbering — lakh/crore grouping matches how the client already
 * reads money in the app. ₹12,45,000 not ₹1,245,000.
 */
export function inr(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return sign + '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(abs);
}

export function shortDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Every document header. LADAKH VACATION in serif gold, HOLIDAYS in caps teal.
 * Right side carries the document label + number + issue date.
 */
export function BrandHeader({
  docLabel,
  docNumber,
  issuedOn = new Date(),
  tagline = 'Kashmir · Ladakh · Himachal — since 2011',
}: {
  docLabel: string;
  docNumber: string;
  issuedOn?: Date;
  tagline?: string;
}) {
  return (
    <View style={pdfStyles.header}>
      <View>
        <View style={pdfStyles.brandRow}>
          <Text style={pdfStyles.brandGold}>Ladakh Vacation</Text>
          <Text style={pdfStyles.brandTeal}>Holidays</Text>
        </View>
        <Text style={pdfStyles.brandTagline}>{tagline}</Text>
      </View>
      <View style={pdfStyles.docMeta}>
        <Text style={pdfStyles.docLabel}>{docLabel}</Text>
        <Text style={pdfStyles.docNumber}>{docNumber}</Text>
        <Text style={pdfStyles.docDate}>Issued {shortDate(issuedOn)}</Text>
      </View>
    </View>
  );
}

export function BrandFooter({
  page,
  totalPages,
}: {
  page?: number;
  totalPages?: number;
}) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        Ladakh Vacation  ·  Srinagar, Kashmir  ·  ladakhvacation.in
      </Text>
      {typeof page === 'number' && typeof totalPages === 'number' ? (
        <Text style={pdfStyles.footerText}>
          Page {page} of {totalPages}
        </Text>
      ) : (
        <Text style={pdfStyles.footerText}>Thank you for choosing Ladakh Vacation.</Text>
      )}
    </View>
  );
}

/** Slim gold rule under a section header. Used to add warmth without noise. */
export function GoldRule({ width = 34 }: { width?: number }) {
  return <View style={{ ...pdfStyles.goldAccent, width }} />;
}

/** Colour re-export for callers building bespoke sections. */
export { brand };
