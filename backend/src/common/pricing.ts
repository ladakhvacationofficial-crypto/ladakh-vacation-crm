import { MarkupMode, ServiceType } from '@prisma/client';

/**
 * Pure pricing functions — no database, no Nest. Easy to reason about and
 * easy to change when your commercial policy changes.
 *
 * IMPORTANT VOCABULARY (these are different numbers):
 *   markup% = profit / COST   -> ₹10,000 cost + 20% markup = ₹12,000 sell
 *   margin% = profit / SELL   -> that same deal is a 16.7% margin
 * Treating them as interchangeable is how tour operators quietly underprice.
 *
 * GST CONVENTION:
 *   Quoted / booked totals are TAX-INCLUSIVE. What the client sees on the
 *   quotation is what they pay. On the invoice we split it into the base
 *   amount and the GST portion so they can claim ITC if applicable.
 *   Indian tour packages carry 5% GST without ITC by default; if that policy
 *   ever changes for a specific product, do the split at quote time — never
 *   layer GST on top at invoice time.
 */

export interface SettingsLike {
  defaultMarkupPercent: number;
  hotelMarkupPercent?: number | null;
  transportMarkupPercent?: number | null;
  activityMarkupPercent?: number | null;
  flightMarkupPercent?: number | null;
  guideMarkupPercent?: number | null;
  mealMarkupPercent?: number | null;
  permitMarkupPercent?: number | null;
  miscMarkupPercent?: number | null;
  minMarginPercent: number;
  monthlyOverhead?: number | null;
  filesPerMonth?: number | null;
  roundTo: number;
  /** Inclusive GST rate applied to the client-facing invoice split. */
  gstPercent?: number;
}

export interface LineLike {
  serviceType: ServiceType;
  quantity: number;
  units: number;
  unitNet: number;
  markupMode: MarkupMode;
  markupValue?: number | null;
}

/** Per-service-type default, falling back to the global default. */
export function serviceTypeMarkup(
  type: ServiceType,
  s: SettingsLike,
): number {
  const map: Record<ServiceType, number | null | undefined> = {
    HOTEL: s.hotelMarkupPercent,
    TRANSPORT: s.transportMarkupPercent,
    ACTIVITY: s.activityMarkupPercent,
    FLIGHT: s.flightMarkupPercent,
    GUIDE: s.guideMarkupPercent,
    MEAL: s.mealMarkupPercent,
    PERMIT: s.permitMarkupPercent,
    MISC: s.miscMarkupPercent,
  };
  const v = map[type];
  return v === null || v === undefined ? s.defaultMarkupPercent : v;
}

export function roundTo(value: number, nearest: number): number {
  if (!nearest || nearest <= 1) return Math.round(value);
  return Math.round(value / nearest) * nearest;
}

/**
 * Resolution chain, most specific wins:
 *   line override -> option override -> service-type default -> global default
 */
export function computeLine(
  line: LineLike,
  settings: SettingsLike,
  optionMarkupPercent?: number | null,
): { lineNet: number; lineSell: number; resolvedPercent: number } {
  const lineNet = Math.round(line.unitNet * line.quantity * line.units);

  if (line.markupMode === MarkupMode.MANUAL) {
    const lineSell = roundTo(line.markupValue ?? lineNet, settings.roundTo);
    return {
      lineNet,
      lineSell,
      resolvedPercent: lineNet > 0 ? ((lineSell - lineNet) / lineNet) * 100 : 0,
    };
  }

  if (line.markupMode === MarkupMode.FIXED) {
    const lineSell = roundTo(lineNet + (line.markupValue ?? 0), settings.roundTo);
    return {
      lineNet,
      lineSell,
      resolvedPercent: lineNet > 0 ? ((lineSell - lineNet) / lineNet) * 100 : 0,
    };
  }

  const pct =
    line.markupMode === MarkupMode.PERCENT && line.markupValue !== null && line.markupValue !== undefined
      ? line.markupValue
      : optionMarkupPercent !== null && optionMarkupPercent !== undefined
        ? optionMarkupPercent
        : serviceTypeMarkup(line.serviceType, settings);

  const lineSell = roundTo(lineNet * (1 + pct / 100), settings.roundTo);
  return { lineNet, lineSell, resolvedPercent: pct };
}

export interface OptionTotals {
  totalNet: number;
  totalSell: number;
  totalMargin: number;
  /** profit / sell */
  marginPercent: number;
  /** profit / cost */
  markupPercentEffective: number;
  perPersonSell: number;
}

export function computeOptionTotals(
  lines: { lineNet: number; lineSell: number }[],
  pax: number,
): OptionTotals {
  const totalNet = lines.reduce((a, l) => a + l.lineNet, 0);
  const totalSell = lines.reduce((a, l) => a + l.lineSell, 0);
  const totalMargin = totalSell - totalNet;

  return {
    totalNet,
    totalSell,
    totalMargin,
    marginPercent: totalSell > 0 ? (totalMargin / totalSell) * 100 : 0,
    markupPercentEffective: totalNet > 0 ? (totalMargin / totalNet) * 100 : 0,
    perPersonSell: pax > 0 ? Math.round(totalSell / pax) : totalSell,
  };
}

/**
 * Split a GST-inclusive total into base + tax portions.
 * Rounded to whole rupees; any half-rupee difference lands on the base so
 * the two components always add back to the input.
 */
export interface GstBreakdown {
  /** GST-inclusive total the client pays (identity return). */
  total: number;
  /** Portion attributable to GST at the given rate. */
  gstAmount: number;
  /** Pre-tax base amount. base + gstAmount === total. */
  baseAmount: number;
  gstPercent: number;
}

export function gstBreakdown(total: number, gstPercent: number): GstBreakdown {
  if (gstPercent <= 0 || total <= 0) {
    return { total, gstAmount: 0, baseAmount: total, gstPercent };
  }
  // base * (1 + gst/100) = total  =>  base = total / (1 + gst/100)
  const base = Math.round(total / (1 + gstPercent / 100));
  return {
    total,
    baseAmount: base,
    gstAmount: total - base,
    gstPercent,
  };
}

export interface Advisory {
  breakEvenPerFile: number | null;
  minSellForPolicy: number;
  minSellForBreakEven: number | null;
  suggestedMinSell: number;
  shortfall: number;
  ok: boolean;
  warnings: string[];
}

/**
 * "What is the least I can sell this at?"
 *
 * Two independent floors:
 *   1. Policy floor  — your minimum margin %.
 *   2. Break-even    — monthlyOverhead / filesPerMonth must be covered by
 *                      this file's gross profit, or the file loses money once
 *                      overheads are counted.
 * The suggestion is the higher of the two. Break-even is only computed if you
 * have entered real overhead numbers in settings — otherwise it is skipped
 * rather than invented.
 */
export function advise(
  totalNet: number,
  totalSell: number,
  s: SettingsLike,
): Advisory {
  const warnings: string[] = [];

  // sell such that (sell - net)/sell = minMargin  =>  sell = net / (1 - m)
  const m = Math.min(0.95, Math.max(0, s.minMarginPercent / 100));
  const minSellForPolicy = m > 0 ? roundTo(totalNet / (1 - m), s.roundTo) : totalNet;

  let breakEvenPerFile: number | null = null;
  let minSellForBreakEven: number | null = null;
  if (s.monthlyOverhead && s.filesPerMonth && s.filesPerMonth > 0) {
    breakEvenPerFile = Math.round(s.monthlyOverhead / s.filesPerMonth);
    minSellForBreakEven = roundTo(totalNet + breakEvenPerFile, s.roundTo);
  } else {
    warnings.push(
      'Break-even not calculated — set monthlyOverhead and filesPerMonth in pricing settings.',
    );
  }

  const suggestedMinSell = Math.max(
    minSellForPolicy,
    minSellForBreakEven ?? 0,
  );

  const marginPct = totalSell > 0 ? ((totalSell - totalNet) / totalSell) * 100 : 0;
  if (marginPct < s.minMarginPercent) {
    warnings.push(
      `Margin ${marginPct.toFixed(1)}% is below your minimum of ${s.minMarginPercent}%.`,
    );
  }
  if (breakEvenPerFile !== null && totalSell - totalNet < breakEvenPerFile) {
    warnings.push(
      `Gross profit does not cover your break-even of ${breakEvenPerFile} per file.`,
    );
  }

  const shortfall = Math.max(0, suggestedMinSell - totalSell);

  return {
    breakEvenPerFile,
    minSellForPolicy,
    minSellForBreakEven,
    suggestedMinSell,
    shortfall,
    ok: warnings.filter((w) => !w.startsWith('Break-even not')).length === 0,
    warnings,
  };
}

export interface OccupancyPricerInput {
  /** Double/Twin sharing net room cost per night across hotels */
  roomCostPerNight: number;
  /** Net extra bed cost per night for an adult (/AwEB) */
  extraBedAdultPerNight?: number;
  /** Net extra bed cost per night for a child (/CwEB) */
  extraBedChildPerNight?: number;
  /** Net cost per night for child sharing bed (/CNB) - usually 0 */
  childNoBedPerNight?: number;
  /** Total nights of stay */
  nights: number;
  /** Total double/twin rooms required (defaults to ceil(adultsDoubleSharing / 2)) */
  numberOfRooms?: number;

  /** Total vehicle / transport net cost for the entire group */
  totalTransportCost?: number;
  /** Shared fixed costs (guide fees, oxygen cylinder rental, driver batta) */
  sharedFixedCost?: number;

  /** Activity / entry net cost per adult (monasteries, rafting, camel safari, etc.) */
  adultActivityCostPerPerson?: number;
  /** Activity / entry net cost per child */
  childActivityCostPerPerson?: number;
  /** Ladakh Inner Line Permit & environmental fee per person */
  permitCostPerPerson?: number;

  // --- Pax composition ---
  /** Count of adults in standard double / twin sharing (e.g. 2, 4, 6) */
  adultsDoubleSharing: number;
  /** Count of adults on extra bed (/AwEB) */
  adultsExtraBed?: number;
  /** Count of children with extra bed (/CwEB) */
  childrenExtraBed?: number;
  /** Count of children without bed (/CNB) */
  childrenNoBed?: number;
  /** Count of single occupancy rooms / solo adults */
  singleRooms?: number;

  // --- Commercial rules ---
  /** Target markup percentage (e.g. 20 for 20%) */
  markupPercent: number;
  /** Inclusive GST percentage (defaults to 5% for Indian tour packages) */
  gstPercent?: number;
  /** Nearest integer to round per-person prices to (defaults to 100 for clean client-facing quotes) */
  roundToNearest?: number;
}

export interface OccupancyCategoryQuote {
  paxCount: number;
  perPersonNet: number;
  perPersonSell: number;
  perPersonBase: number;
  perPersonGst: number;
  categoryNet: number;
  categorySell: number;
}

export interface BedWiseOccupancyResult {
  pax: {
    adultDouble: OccupancyCategoryQuote;
    adultExtraBed: OccupancyCategoryQuote;
    childExtraBed: OccupancyCategoryQuote;
    childNoBed: OccupancyCategoryQuote;
    single: OccupancyCategoryQuote;
  };
  totalPax: number;
  totalRooms: number;
  totalNet: number;
  totalSell: number;
  totalMargin: number;
  marginPercent: number;
  markupPercentEffective: number;
  gstBreakdown: GstBreakdown;
  rateCard: {
    perAdultDouble: number;
    perAwEB: number;
    perCwEB: number;
    perCNB: number;
    perSingle: number;
  };
}

/**
 * Bed-wise occupancy pricing with strict order of operations:
 *   1. Calculate base net cost per category (/Adult, /AwEB, /CwEB, /CNB, /Single).
 *   2. Apply markup percentage to arrive at taxable unrounded sell.
 *   3. If tax-inclusive (GST), calculate unrounded tax split.
 *   4. Round per-person rates to the nearest ₹100 (or roundToNearest).
 *   5. Recompute the package total as the EXACT sum of rounded category line items:
 *      Total = (adults * rateAdult) + (aweb * rateAwEB) + (cweb * rateCwEB) + (cnb * rateCNB) + (single * rateSingle)
 *
 * This guarantees 0 penny-drift between the per-person rate sheet and the total invoice.
 */
export function computeBedWiseOccupancy(
  input: OccupancyPricerInput,
): BedWiseOccupancyResult {
  const adultsDouble = Math.max(0, input.adultsDoubleSharing || 0);
  const adultsExtra = Math.max(0, input.adultsExtraBed || 0);
  const childrenExtra = Math.max(0, input.childrenExtraBed || 0);
  const childrenNoBed = Math.max(0, input.childrenNoBed || 0);
  const singleCount = Math.max(0, input.singleRooms || 0);

  const totalPax = adultsDouble + adultsExtra + childrenExtra + childrenNoBed + singleCount;
  const payingPax = Math.max(1, totalPax);

  const nights = Math.max(1, input.nights || 1);
  const totalRooms =
    input.numberOfRooms !== undefined && input.numberOfRooms > 0
      ? input.numberOfRooms
      : Math.ceil(adultsDouble / 2) + singleCount;

  // Shared costs per head
  const totalTransport = input.totalTransportCost || 0;
  const totalShared = input.sharedFixedCost || 0;
  const sharedPerPerson = (totalTransport + totalShared) / payingPax;

  const adultActivity = input.adultActivityCostPerPerson || 0;
  const childActivity = input.childActivityCostPerPerson || 0;
  const permit = input.permitCostPerPerson || 0;

  const roundNearest = input.roundToNearest !== undefined ? input.roundToNearest : 100;
  const markupPct = Math.max(0, input.markupPercent || 0);
  const gstPct = input.gstPercent !== undefined ? input.gstPercent : 5;

  // 1. Calculate Base Net Cost per Category
  // Double sharing: 1 room is shared by 2 adults, so half room cost per adult per night
  const doubleRoomPerPaxNet = (input.roomCostPerNight / 2) * nights;
  const netDouble = Math.round(doubleRoomPerPaxNet + sharedPerPerson + adultActivity + permit);

  // AwEB: Extra bed for adult
  const awebExtraNet = (input.extraBedAdultPerNight || 0) * nights;
  const netAwEB = Math.round(awebExtraNet + sharedPerPerson + adultActivity + permit);

  // CwEB: Extra bed for child
  const cwebExtraNet = (input.extraBedChildPerNight || 0) * nights;
  const netCwEB = Math.round(cwebExtraNet + sharedPerPerson + childActivity + permit);

  // CNB: Child No Bed (sharing parents' bed)
  const cnbExtraNet = (input.childNoBedPerNight || 0) * nights;
  const netCNB = Math.round(cnbExtraNet + sharedPerPerson + childActivity + permit);

  // Single: 1 full room per adult
  const singleRoomNet = input.roomCostPerNight * nights;
  const netSingle = Math.round(singleRoomNet + sharedPerPerson + adultActivity + permit);

  // Helper for step 2, 3, 4
  function priceCategory(netCost: number, count: number): OccupancyCategoryQuote {
    if (count <= 0) {
      // Still compute quote rate card for 0 pax so sales exec can see the rate sheet
      const unroundedSell = netCost * (1 + markupPct / 100);
      const perPersonSell = roundTo(unroundedSell, roundNearest);
      const gst = gstBreakdown(perPersonSell, gstPct);
      return {
        paxCount: 0,
        perPersonNet: netCost,
        perPersonSell,
        perPersonBase: gst.baseAmount,
        perPersonGst: gst.gstAmount,
        categoryNet: 0,
        categorySell: 0,
      };
    }

    // Step 2: Apply markup
    const unroundedSell = netCost * (1 + markupPct / 100);

    // Step 4: Round per person to nearest ₹100
    const perPersonSell = roundTo(unroundedSell, roundNearest);

    // Step 3: GST split
    const gst = gstBreakdown(perPersonSell, gstPct);

    return {
      paxCount: count,
      perPersonNet: netCost,
      perPersonSell,
      perPersonBase: gst.baseAmount,
      perPersonGst: gst.gstAmount,
      categoryNet: netCost * count,
      categorySell: perPersonSell * count,
    };
  }

  const adultDoubleQuote = priceCategory(netDouble, adultsDouble);
  const adultAwEBQuote = priceCategory(netAwEB, adultsExtra);
  const childCwEBQuote = priceCategory(netCwEB, childrenExtra);
  const childCNBQuote = priceCategory(netCNB, childrenNoBed);
  const singleQuote = priceCategory(netSingle, singleCount);

  // Step 5: Recompute package total as strict sum of category line items
  const totalSell =
    adultDoubleQuote.categorySell +
    adultAwEBQuote.categorySell +
    childCwEBQuote.categorySell +
    childCNBQuote.categorySell +
    singleQuote.categorySell;

  const totalNet =
    adultDoubleQuote.categoryNet +
    adultAwEBQuote.categoryNet +
    childCwEBQuote.categoryNet +
    childCNBQuote.categoryNet +
    singleQuote.categoryNet;

  const totalMargin = totalSell - totalNet;
  const marginPercent = totalSell > 0 ? (totalMargin / totalSell) * 100 : 0;
  const markupPercentEffective = totalNet > 0 ? (totalMargin / totalNet) * 100 : 0;
  const overallGst = gstBreakdown(totalSell, gstPct);

  return {
    pax: {
      adultDouble: adultDoubleQuote,
      adultExtraBed: adultAwEBQuote,
      childExtraBed: childCwEBQuote,
      childNoBed: childCNBQuote,
      single: singleQuote,
    },
    totalPax,
    totalRooms,
    totalNet,
    totalSell,
    totalMargin,
    marginPercent,
    markupPercentEffective,
    gstBreakdown: overallGst,
    rateCard: {
      perAdultDouble: adultDoubleQuote.perPersonSell,
      perAwEB: adultAwEBQuote.perPersonSell,
      perCwEB: childCwEBQuote.perPersonSell,
      perCNB: childCNBQuote.perPersonSell,
      perSingle: singleQuote.perPersonSell,
    },
  };
}

// ── Multi-Currency Foreign Exchange Engine ──────────────────────────────────
export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export const DEFAULT_FX_RATES: Record<SupportedCurrency, number> = {
  INR: 1.0,
  USD: 84.50,
  EUR: 91.20,
  GBP: 108.50,
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function convertFromInr(
  inrAmount: number,
  targetCurrency: SupportedCurrency = 'INR',
  fxRate?: number,
): number {
  if (targetCurrency === 'INR') return inrAmount;
  const rate = fxRate && fxRate > 0 ? fxRate : (DEFAULT_FX_RATES[targetCurrency] || 1);
  return Math.round(inrAmount / rate);
}

export function formatWithCurrency(
  amount: number,
  currency: SupportedCurrency = 'INR',
  fxRate?: number,
): string {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  if (currency === 'INR') {
    return `${sym}${amount.toLocaleString('en-IN')}`;
  }
  const converted = convertFromInr(amount, currency, fxRate);
  return `${sym}${converted.toLocaleString('en-US')}`;
}

