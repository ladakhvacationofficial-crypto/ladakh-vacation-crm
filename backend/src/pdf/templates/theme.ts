/**
 * Shared brand theme for every PDF the CRM emits — quotations, invoices,
 * salary slips, offer letters, interview sheets. Change once, change
 * everywhere.
 *
 * Font strategy:
 *   Prefer Cormorant Garamond + Plus Jakarta Sans (the Ladakh Vacation brand
 *   pairing, as on the website and landers). Fall back to the built-in
 *   PDF-14 fonts (Times-Roman + Helvetica) when the .ttf files aren't
 *   present. See src/pdf/fonts/README.md for the two-minute upgrade.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Font, StyleSheet } from '@react-pdf/renderer';

const FONTS_DIR = path.resolve(__dirname, '..', 'fonts');

interface FontResolution {
  display: string; // used for headings + hero numbers
  body: string;    // used for everything else
}

/** Register bundled fonts if the files are present. */
function resolveFonts(): FontResolution {
  const has = (name: string) => fs.existsSync(path.join(FONTS_DIR, name));

  const hasFraunces =
    has('CormorantGaramond-Regular.ttf') && has('CormorantGaramond-Bold.ttf');
  const hasInter =
    has('PlusJakartaSans-Regular.ttf') && has('PlusJakartaSans-Bold.ttf');

  if (hasFraunces) {
    Font.register({
      family: 'Cormorant Garamond',
      fonts: [
        { src: path.join(FONTS_DIR, 'CormorantGaramond-Regular.ttf'), fontWeight: 400 },
        { src: path.join(FONTS_DIR, 'CormorantGaramond-Bold.ttf'),    fontWeight: 700 },
      ],
    });
  }
  if (hasInter) {
    Font.register({
      family: 'Plus Jakarta Sans',
      fonts: [
        { src: path.join(FONTS_DIR, 'PlusJakartaSans-Regular.ttf'), fontWeight: 400 },
        { src: path.join(FONTS_DIR, 'PlusJakartaSans-Bold.ttf'),    fontWeight: 700 },
      ],
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `[pdf] fonts: display=${hasFraunces ? 'Cormorant Garamond' : 'Times-Roman'}, ` +
    `body=${hasInter ? 'Plus Jakarta Sans' : 'Helvetica'}`,
  );

  return {
    display: hasFraunces ? 'Cormorant Garamond' : 'Times-Roman',
    body:    hasInter    ? 'Plus Jakarta Sans' : 'Helvetica',
  };
}

const F = resolveFonts();

/**
 * Palette pulled straight from the Ladakh Vacation logo. Kept here (not
 * imported from the frontend's globals.css) because the two apps deploy
 * independently. Key names are inherited from the Glitz templates: `teal*`
 * is the brand blue, `gold*` the accent.
 */
export const brand = {
  gold:      '#C9A961',
  goldDeep:  '#A8842F',
  teal:      '#16294F',
  tealMid:   '#1E4FA8',
  tealLight: '#6FA0F5',
  cream:     '#F6F4EF',
  parchment: '#EFECE4',
  border:    '#E2DDD1',
  ink:       '#070F1F',
  text:      '#1C2A42',
  muted:     '#5B6880',
  soft:      '#43506A',
  healthy:   '#2E7D5B',
  warn:      '#B87116',
  loss:      '#B84A37',
} as const;

/** Exported so templates that write inline styles can reach for them too. */
export const pdfFonts = F;

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: F.body,
    fontSize: 10,
    color: brand.text,
    backgroundColor: '#FFFFFF',
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },

  // ---- header -----------------------------------------------------------
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  brandGold: {
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: 20,
    color: brand.gold,
    letterSpacing: -0.3,
  },
  brandTeal: {
    fontFamily: F.body,
    fontWeight: 700,
    fontSize: 10,
    color: brand.teal,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  brandTagline: {
    marginTop: 4,
    fontSize: 8.5,
    color: brand.muted,
    letterSpacing: 0.4,
  },
  docMeta: { textAlign: 'right' },
  docLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: brand.muted,
    marginBottom: 2,
  },
  docNumber: {
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: 15,
    color: brand.ink,
    letterSpacing: -0.2,
  },
  docDate: { marginTop: 3, fontSize: 9, color: brand.soft },

  // ---- generic display --------------------------------------------------
  h1: {
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: 22,
    color: brand.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  h2: {
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: 13,
    color: brand.ink,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: brand.muted,
    marginBottom: 4,
  },
  para: { fontSize: 10, lineHeight: 1.55, color: brand.text },
  small: { fontSize: 9, color: brand.muted },

  // ---- two-column parties block -----------------------------------------
  parties: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 22,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: brand.cream,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.border,
  },

  // ---- tables -----------------------------------------------------------
  table: { marginTop: 6, borderWidth: 1, borderColor: brand.border, borderRadius: 6 },
  th: {
    flexDirection: 'row',
    backgroundColor: brand.parchment,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  thText: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: brand.muted,
    fontWeight: 700,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  trLast: { borderBottomWidth: 0 },
  td: { fontSize: 9.5, color: brand.text },

  // ---- totals -----------------------------------------------------------
  totals: {
    marginTop: 12,
    marginLeft: 'auto',
    width: '55%',
    padding: 12,
    backgroundColor: brand.cream,
    borderRadius: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalGrand: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalGrandLabel: { fontFamily: F.display, fontWeight: 700, fontSize: 12, color: brand.ink },
  totalGrandValue: {
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: 15,
    color: brand.teal,
  },

  // ---- footer -----------------------------------------------------------
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: brand.muted },

  // ---- small utility markers -------------------------------------------
  goldAccent: { width: 34, height: 3, backgroundColor: brand.gold, marginBottom: 10 },
});
