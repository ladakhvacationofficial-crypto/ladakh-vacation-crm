import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, pdfFonts, brand } from '../../pdf/templates/theme';
import { BrandHeader, BrandFooter, GoldRule, inr, shortDate } from '../../pdf/templates/primitives';

export interface SalarySlipInput {
  employee: {
    code: string;
    fullName: string;
    designation: string;
    department: string | null;
    joinedOn: Date | string;
    bankName: string | null;
    accountNumber: string | null;
    pan: string | null;
  };
  slip: {
    periodMonth: Date | string;
    daysWorked: number | null;
    daysInMonth: number | null;
    lop: number | null;
    basic: number;
    hra: number;
    allowances: number;
    bonus: number;
    arrears: number;
    pf: number;
    esi: number;
    tax: number;
    otherDed: number;
    grossPay: number;
    totalDed: number;
    netPay: number;
    paidOn: Date | string | null;
    reference: string | null;
  };
}

/**
 * Monthly salary slip. Two-column earnings vs deductions, big net-pay strip.
 * Structure mirrors an Indian payslip that FnF / EPFO would accept.
 */
export function SalarySlipDocument({ employee: e, slip: s }: SalarySlipInput) {
  const monthLabel = new Date(s.periodMonth).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const earnings: [string, number][] = [
    ['Basic',      s.basic],
    ['HRA',        s.hra],
    ['Allowances', s.allowances],
    ['Bonus',      s.bonus],
    ['Arrears',    s.arrears],
  ];
  const deductions: [string, number][] = [
    ['Provident Fund', s.pf],
    ['ESI',            s.esi],
    ['Tax (TDS)',      s.tax],
    ['Other',          s.otherDed],
  ];

  return (
    <Document
      title={`Salary slip — ${e.fullName} — ${monthLabel}`}
      author="Ladakh Vacation"
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader docLabel="Salary slip" docNumber={monthLabel} />

        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.h1}>{e.fullName}</Text>
          <GoldRule />
          <Text style={pdfStyles.para}>
            {e.designation}
            {e.department && ` · ${e.department}`}
            {'  ·  '}Employee code {e.code}
          </Text>
          <Text style={pdfStyles.small}>Joined {shortDate(e.joinedOn)}</Text>
        </View>

        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Pay period</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {monthLabel}
            </Text>
            {s.daysWorked !== null && s.daysInMonth !== null && (
              <Text style={pdfStyles.small}>
                {s.daysWorked} of {s.daysInMonth} days
                {s.lop ? `  ·  LOP ${s.lop}` : ''}
              </Text>
            )}
            {s.paidOn && (
              <Text style={pdfStyles.small}>Paid on {shortDate(s.paidOn)}</Text>
            )}
            {s.reference && (
              <Text style={pdfStyles.small}>Ref {s.reference}</Text>
            )}
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Bank</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {e.bankName ?? '—'}
            </Text>
            {e.accountNumber && (
              <Text style={pdfStyles.small}>A/C {e.accountNumber}</Text>
            )}
            {e.pan && <Text style={pdfStyles.small}>PAN {e.pan}</Text>}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <SlipColumn title="Earnings" rows={earnings} total={s.grossPay} totalLabel="Gross pay" />
          <SlipColumn title="Deductions" rows={deductions} total={s.totalDed} totalLabel="Total deductions" />
        </View>

        {/* Net pay strip — the number the employee actually cares about. */}
        <View
          style={{
            padding: 16,
            backgroundColor: brand.teal,
            borderRadius: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
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
              Net pay
            </Text>
            <Text
              style={{
                fontFamily: pdfFonts.display,
                fontWeight: 700,
                fontSize: 28,
                color: '#FFFFFF',
                marginTop: 2,
              }}
            >
              {inr(s.netPay)}
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: brand.tealLight, textAlign: 'right' }}>
            in words:{'\n'}
            {inWords(s.netPay)}
          </Text>
        </View>

        <Text style={pdfStyles.small}>
          This is a system-generated payslip. No signature required. Any
          discrepancy should be reported to HR within 7 days of receipt.
        </Text>

        <BrandFooter />
      </Page>
    </Document>
  );
}

function SlipColumn({
  title,
  rows,
  total,
  totalLabel,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  totalLabel: string;
}) {
  return (
    <View style={{ ...pdfStyles.table, flex: 1 }}>
      <View style={pdfStyles.th}>
        <Text style={{ ...pdfStyles.thText, flex: 1 }}>{title}</Text>
        <Text style={{ ...pdfStyles.thText, textAlign: 'right' }}>Amount</Text>
      </View>
      {rows.map(([label, value], i) => (
        <View
          key={label}
          style={i === rows.length - 1 ? { ...pdfStyles.tr, ...pdfStyles.trLast } : pdfStyles.tr}
        >
          <Text style={{ ...pdfStyles.td, flex: 1 }}>{label}</Text>
          <Text
            style={{
              ...pdfStyles.td,
              textAlign: 'right',
              color: value > 0 ? brand.ink : brand.muted,
              fontWeight: value > 0 ? 700 : 400,
            }}
          >
            {inr(value)}
          </Text>
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 10,
          borderTopWidth: 1,
          borderTopColor: brand.border,
          backgroundColor: brand.parchment,
        }}
      >
        <Text style={{ ...pdfStyles.td, fontWeight: 700, color: brand.ink }}>
          {totalLabel}
        </Text>
        <Text
          style={{
            ...pdfStyles.td,
            fontFamily: pdfFonts.display,
            fontWeight: 700,
            fontSize: 12,
            color: brand.teal,
          }}
        >
          {inr(total)}
        </Text>
      </View>
    </View>
  );
}

/** Rupees in words — Indian numbering. Small enough not to justify a dep. */
function inWords(n: number): string {
  if (n < 0) return 'minus ' + inWords(-n);
  if (n === 0) return 'zero rupees only';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const under100 = (x: number): string => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  };
  const under1000 = (x: number): string => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    return (h ? ones[h] + ' hundred' + (r ? ' ' : '') : '') + (r ? under100(r) : '');
  };
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore)    parts.push(under1000(crore)   + ' crore');
  if (lakh)     parts.push(under1000(lakh)    + ' lakh');
  if (thousand) parts.push(under1000(thousand) + ' thousand');
  if (n)        parts.push(under1000(n));
  return parts.join(' ') + ' rupees only';
}
