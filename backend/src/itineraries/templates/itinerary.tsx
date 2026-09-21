import * as React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles, pdfFonts, brand } from '../../pdf/templates/theme';
import { BrandHeader, BrandFooter, GoldRule, inr, shortDate } from '../../pdf/templates/primitives';

export interface ItineraryInput {
  code: string;
  title: string;
  headline: string | null;
  intro: string | null;
  totalPax: number;
  inclusions: string | null;
  exclusions: string | null;
  createdAt: Date | string;
  lead: {
    name: string;
    phone: string;
    email: string | null;
  };
  /** Priced tiers. Rendered on the cover as a price comparison block. */
  options?: {
    id: string;
    name: string;
    isRecommended: boolean;
    totalSell: number;
    perPersonSell: number;
  }[];
  /** GST rate applied inclusively — see pricing.ts. */
  gstPercent?: number;
  days: {
    id: string;
    dayNumber: number;
    date: Date | string | null;
    city: string | null;
    headline: string | null;
    summary: string | null;
    items: {
      kind: string;
      time: string | null;
      title: string;
      description: string | null;
      location: string | null;
    }[];
  }[];
}

/**
 * Day-by-day printable itinerary. Cover page → intro → per-day pages →
 * inclusions/exclusions. Deliberately no prices anywhere — that's what the
 * quotation is for. Clients often print this and carry it in their bag, so
 * the layout tolerates being read at arm's length.
 */
export function ItineraryDocument({ i }: { i: ItineraryInput }) {
  return (
    <Document
      title={`Itinerary ${i.code}`}
      author="Ladakh Vacation"
      subject={i.title}
      creator="Ladakh Vacation CRM"
    >
      {/* --- cover --- */}
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader
          docLabel="Itinerary"
          docNumber={i.code}
          issuedOn={new Date(i.createdAt)}
        />

        <View style={{ marginBottom: 18 }}>
          <Text style={pdfStyles.h1}>{i.title}</Text>
          <GoldRule />
          {i.headline && (
            <Text
              style={{
                fontFamily: pdfFonts.display,
                fontSize: 14,
                color: brand.teal,
                marginTop: 4,
                marginBottom: 8,
                lineHeight: 1.35,
              }}
            >
              {i.headline}
            </Text>
          )}
          {i.intro && <Text style={pdfStyles.para}>{i.intro}</Text>}
        </View>

        <View style={pdfStyles.parties}>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Prepared for</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              {i.lead.name}
            </Text>
            <Text style={pdfStyles.small}>{i.lead.phone}</Text>
            {i.lead.email && <Text style={pdfStyles.small}>{i.lead.email}</Text>}
            <Text style={{ ...pdfStyles.small, marginTop: 4 }}>
              {i.totalPax} traveller{i.totalPax === 1 ? '' : 's'} · {i.days.length} day{i.days.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={pdfStyles.partyBox}>
            <Text style={pdfStyles.sectionLabel}>Your DMC</Text>
            <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
              Ladakh Vacation
            </Text>
            <Text style={pdfStyles.small}>Srinagar, Kashmir</Text>
            <Text style={pdfStyles.small}>ladakhvacation@gmail.com</Text>
            <Text style={pdfStyles.small}>www.ladakhvacation.in</Text>
          </View>
        </View>

        {/* Priced tiers, when at least one option has a price. Skipped when
            no pricing has been entered yet so the itinerary still previews
            as a pure plan. */}
        {i.options && i.options.some((o) => o.totalSell > 0) && (
          <View style={{ marginTop: 4, marginBottom: 18 }}>
            <Text style={pdfStyles.sectionLabel}>Package options</Text>
            <GoldRule width={20} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {i.options
                .filter((o) => o.totalSell > 0)
                .map((o) => (
                  <View
                    key={o.id}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: o.isRecommended ? brand.gold : brand.border,
                      backgroundColor: o.isRecommended ? brand.parchment : '#FFFFFF',
                    }}
                  >
                    {o.isRecommended && (
                      <Text
                        style={{
                          fontSize: 7.5,
                          letterSpacing: 1.2,
                          color: brand.goldDeep,
                          fontWeight: 700,
                          marginBottom: 2,
                        }}
                      >
                        RECOMMENDED
                      </Text>
                    )}
                    <Text
                      style={{
                        fontFamily: pdfFonts.display,
                        fontWeight: 700,
                        fontSize: 12,
                        color: brand.ink,
                      }}
                    >
                      {o.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: pdfFonts.display,
                        fontWeight: 700,
                        fontSize: 18,
                        color: brand.teal,
                        marginTop: 6,
                        letterSpacing: -0.3,
                      }}
                    >
                      {inr(o.totalSell)}
                    </Text>
                    <Text style={{ ...pdfStyles.small, marginTop: 2 }}>
                      {inr(o.perPersonSell)} / person
                    </Text>
                    {typeof i.gstPercent === 'number' && i.gstPercent > 0 && (
                      <Text style={{ fontSize: 8, color: brand.muted, marginTop: 2 }}>
                        Incl. {i.gstPercent}% GST
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* At-a-glance mini timeline */}
        <View style={{ marginTop: 6 }}>
          <Text style={pdfStyles.sectionLabel}>At a glance</Text>
          <GoldRule width={20} />
          {i.days.length === 0 ? (
            <Text style={{ ...pdfStyles.small, color: brand.muted }}>
              No days added yet.
            </Text>
          ) : (
            i.days.map((d) => (
              <View
                key={d.id}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: brand.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: pdfFonts.display,
                    fontWeight: 700,
                    fontSize: 11,
                    color: brand.gold,
                    width: 60,
                  }}
                >
                  DAY {d.dayNumber}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.ink }}>
                    {d.headline ?? d.city ?? `Day ${d.dayNumber}`}
                  </Text>
                  <Text style={pdfStyles.small}>
                    {d.date ? shortDate(d.date) : 'Date to be confirmed'}
                    {d.city && `  ·  ${d.city}`}
                    {d.items.length > 0 && `  ·  ${d.items.length} activit${d.items.length === 1 ? 'y' : 'ies'}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <BrandFooter />
      </Page>

      {/* --- one page per day --- */}
      {i.days.map((d) => (
        <Page key={d.id} size="A4" style={pdfStyles.page}>
          <BrandHeader docLabel={`Day ${d.dayNumber}`} docNumber={i.code} />

          <View style={{ marginBottom: 14 }}>
            <Text
              style={{
                fontFamily: pdfFonts.display,
                fontWeight: 700,
                fontSize: 26,
                color: brand.ink,
                letterSpacing: -0.5,
              }}
            >
              Day {d.dayNumber}
              {d.city && (
                <Text style={{ color: brand.gold }}>  ·  {d.city}</Text>
              )}
            </Text>
            <GoldRule />
            {d.headline && (
              <Text style={{ ...pdfStyles.para, fontWeight: 700, color: brand.teal, marginTop: 4 }}>
                {d.headline}
              </Text>
            )}
            <Text style={pdfStyles.small}>
              {d.date ? shortDate(d.date) : 'Date to be confirmed'}
            </Text>
            {d.summary && (
              <Text style={{ ...pdfStyles.para, marginTop: 8 }}>{d.summary}</Text>
            )}
          </View>

          {d.items.length === 0 ? (
            <Text style={{ ...pdfStyles.small, color: brand.muted }}>
              Plan for this day to be added.
            </Text>
          ) : (
            <View>
              {d.items.map((it, idx) => (
                <ItemRow key={idx} item={it} />
              ))}
            </View>
          )}

          <BrandFooter />
        </Page>
      ))}

      {/* --- inclusions / exclusions on a closing page --- */}
      {(i.inclusions || i.exclusions) && (
        <Page size="A4" style={pdfStyles.page}>
          <BrandHeader docLabel="Terms" docNumber={i.code} />

          {i.inclusions && (
            <View style={{ marginBottom: 24 }}>
              <Text style={pdfStyles.h2}>What&rsquo;s included</Text>
              <GoldRule width={22} />
              {i.inclusions.split(/\n+/).filter(Boolean).map((line, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    marginTop: 4,
                    alignItems: 'flex-start',
                  }}
                >
                  <Text style={{ color: brand.teal, marginRight: 8 }}>✓</Text>
                  <Text style={{ ...pdfStyles.para, flex: 1 }}>{line.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {i.exclusions && (
            <View>
              <Text style={pdfStyles.h2}>Not included</Text>
              <GoldRule width={22} />
              {i.exclusions.split(/\n+/).filter(Boolean).map((line, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    marginTop: 4,
                    alignItems: 'flex-start',
                  }}
                >
                  <Text style={{ color: brand.loss, marginRight: 8 }}>✕</Text>
                  <Text style={{ ...pdfStyles.para, flex: 1 }}>{line.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          <BrandFooter />
        </Page>
      )}
    </Document>
  );
}

/* ------------------------------------------------------------------ */

function ItemRow({
  item,
}: {
  item: ItineraryInput['days'][number]['items'][number];
}) {
  const kindMark = KIND_MARKS[item.kind] ?? { label: 'Note', tone: brand.muted };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: brand.border,
      }}
      wrap={false}
    >
      {/* left rail — kind chip + time */}
      <View style={{ width: 92, paddingRight: 10 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 3,
            backgroundColor: kindMark.tone,
          }}
        >
          <Text
            style={{
              fontSize: 7.5,
              letterSpacing: 1.1,
              color: '#FFFFFF',
              fontWeight: 700,
            }}
          >
            {kindMark.label}
          </Text>
        </View>
        {item.time && (
          <Text
            style={{
              fontSize: 9,
              color: brand.muted,
              marginTop: 4,
              fontFamily: pdfFonts.display,
            }}
          >
            {item.time}
          </Text>
        )}
      </View>

      {/* main */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: pdfFonts.display,
            fontWeight: 700,
            fontSize: 12,
            color: brand.ink,
          }}
        >
          {item.title}
        </Text>
        {item.location && (
          <Text style={{ ...pdfStyles.small, marginTop: 1 }}>
            📍 {item.location}
          </Text>
        )}
        {item.description && (
          <Text style={{ ...pdfStyles.small, color: brand.text, marginTop: 3, lineHeight: 1.5 }}>
            {item.description}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Per-kind chip label + colour. Keeps the day pages skim-friendly. */
const KIND_MARKS: Record<string, { label: string; tone: string }> = {
  STAY:        { label: 'STAY',       tone: brand.teal },
  TRANSFER:    { label: 'TRANSFER',   tone: brand.tealMid },
  SIGHTSEEING: { label: 'SEE',        tone: brand.goldDeep },
  MEAL:        { label: 'MEAL',       tone: brand.warn },
  ACTIVITY:    { label: 'ACTIVITY',   tone: brand.healthy },
  FREE_TIME:   { label: 'FREE',       tone: brand.muted },
  NOTE:        { label: 'NOTE',       tone: brand.soft },
};
