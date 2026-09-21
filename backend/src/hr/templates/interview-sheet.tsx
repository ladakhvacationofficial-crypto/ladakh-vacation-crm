import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, pdfFonts, brand } from '../../pdf/templates/theme';
import { BrandHeader, BrandFooter, GoldRule, shortDate } from '../../pdf/templates/primitives';

export interface InterviewSheetInput {
  interview: {
    candidateName: string;
    candidatePhone: string;
    candidateEmail: string | null;
    role: string;
    scheduledAt: Date | string;
    durationMinutes: number | null;
    interviewerName: string | null;
    interviewer: { fullName: string } | null;
    questionnaire: { question: string; answer?: string; rating?: number }[];
    overallRating: number | null;
    strengths: string | null;
    concerns: string | null;
    outcome: string;
    outcomeNote: string | null;
  };
}

/**
 * Interview sheet — the interviewer's structured scorecard. Doubles as a
 * printed form (blank questionnaire, hand-filled) OR a rendered record of
 * a completed session. The layout works for both.
 */
export function InterviewSheetDocument({ interview: i }: InterviewSheetInput) {
  const interviewerName = i.interviewer?.fullName ?? i.interviewerName ?? '—';

  return (
    <Document
      title={`Interview — ${i.candidateName} — ${i.role}`}
      author="Ladakh Vacation"
      creator="Ladakh Vacation CRM"
    >
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader docLabel="Interview sheet" docNumber={shortDate(i.scheduledAt)} />

        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.h1}>{i.candidateName}</Text>
          <GoldRule />
          <Text style={pdfStyles.para}>
            Candidate for {i.role}
            {i.durationMinutes && `  ·  ${i.durationMinutes} minute session`}
          </Text>
        </View>

        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Candidate</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {i.candidateName}
            </Text>
            <Text style={pdfStyles.small}>{i.candidatePhone}</Text>
            {i.candidateEmail && <Text style={pdfStyles.small}>{i.candidateEmail}</Text>}
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Interviewer</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {interviewerName}
            </Text>
            <Text style={pdfStyles.small}>
              {new Date(i.scheduledAt).toLocaleString('en-IN', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionLabel}>Questions & responses</Text>
        <GoldRule width={20} />

        {i.questionnaire.length === 0 ? (
          <View
            style={{
              padding: 12,
              backgroundColor: brand.cream,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: brand.border,
              minHeight: 220,
            }}
          >
            <Text style={{ ...pdfStyles.small, color: brand.muted }}>
              No questions were recorded. Blank space provided for a hand-filled
              interview sheet.
            </Text>
          </View>
        ) : (
          i.questionnaire.map((qa, idx) => (
            <View
              key={idx}
              style={{
                marginBottom: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: brand.border,
                borderRadius: 6,
              }}
              wrap={false}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink, flex: 1 }}>
                  {idx + 1}. {qa.question}
                </Text>
                {qa.rating !== undefined && qa.rating !== null && (
                  <Text style={{ ...pdfStyles.small, color: brand.teal, fontWeight: 700 }}>
                    {'★'.repeat(qa.rating)}{'☆'.repeat(5 - qa.rating)}
                  </Text>
                )}
              </View>
              <Text style={{ ...pdfStyles.small, color: brand.text, lineHeight: 1.5 }}>
                {qa.answer ?? '—'}
              </Text>
            </View>
          ))
        )}

        <View style={{ marginTop: 14, flexDirection: 'row', gap: 12 }}>
          <View style={{ ...pdfStyles.partyBox, flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>Strengths</Text>
            <Text style={pdfStyles.small}>{i.strengths ?? '—'}</Text>
          </View>
          <View style={{ ...pdfStyles.partyBox, flex: 1 }}>
            <Text style={pdfStyles.sectionLabel}>Concerns</Text>
            <Text style={pdfStyles.small}>{i.concerns ?? '—'}</Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            padding: 14,
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
              Recommendation
            </Text>
            <Text
              style={{
                fontFamily: pdfFonts.display,
                fontWeight: 700,
                fontSize: 20,
                color: '#FFFFFF',
                marginTop: 2,
                textTransform: 'capitalize',
              }}
            >
              {i.outcome.replace(/_/g, ' ').toLowerCase()}
            </Text>
            {i.outcomeNote && (
              <Text style={{ fontSize: 9, color: brand.tealLight, marginTop: 3 }}>
                {i.outcomeNote}
              </Text>
            )}
          </View>
          {i.overallRating !== null && (
            <Text style={{ fontSize: 18, color: brand.gold }}>
              {'★'.repeat(i.overallRating)}
              <Text style={{ color: brand.tealLight }}>
                {'☆'.repeat(5 - i.overallRating)}
              </Text>
            </Text>
          )}
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ borderTopWidth: 1, borderTopColor: brand.border, width: 180, paddingTop: 4 }}>
            <Text style={pdfStyles.small}>Interviewer signature</Text>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: brand.border, width: 180, paddingTop: 4 }}>
            <Text style={pdfStyles.small}>HR signature</Text>
          </View>
        </View>

        <BrandFooter />
      </Page>
    </Document>
  );
}
