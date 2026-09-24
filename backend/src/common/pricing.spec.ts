import {
  serviceTypeMarkup,
  roundTo,
  computeLine,
  computeOptionTotals,
  gstBreakdown,
  advise,
  computeBedWiseOccupancy,
} from './pricing';
import { MarkupMode, ServiceType } from '@prisma/client';

describe('pricing', () => {
  const mockSettings = {
    defaultMarkupPercent: 20,
    hotelMarkupPercent: 15,
    minMarginPercent: 10,
    roundTo: 10,
  };

  it('serviceTypeMarkup falls back to default if specific is not set', () => {
    expect(serviceTypeMarkup(ServiceType.HOTEL, mockSettings as any)).toBe(15);
    expect(serviceTypeMarkup(ServiceType.TRANSPORT, mockSettings as any)).toBe(20);
  });

  it('roundTo rounds correctly', () => {
    expect(roundTo(1234, 10)).toBe(1230);
    expect(roundTo(1235, 10)).toBe(1240);
    expect(roundTo(1235, 0)).toBe(1235);
  });

  it('computeLine calculates net and sell correctly with PERCENT', () => {
    const line = {
      serviceType: ServiceType.TRANSPORT,
      quantity: 2,
      units: 3,
      unitNet: 1000,
      markupMode: MarkupMode.PERCENT,
    };
    // net = 2 * 3 * 1000 = 6000
    // default transport markup is 20% -> 6000 * 1.2 = 7200
    const result = computeLine(line, mockSettings as any);
    expect(result.lineNet).toBe(6000);
    expect(result.lineSell).toBe(7200);
    expect(result.resolvedPercent).toBe(20);
  });

  it('computeLine handles FIXED and MANUAL modes', () => {
    const line1 = {
      serviceType: ServiceType.HOTEL,
      quantity: 1,
      units: 1,
      unitNet: 5000,
      markupMode: MarkupMode.FIXED,
      markupValue: 500, // 500 fixed markup
    };
    const res1 = computeLine(line1, mockSettings as any);
    expect(res1.lineNet).toBe(5000);
    expect(res1.lineSell).toBe(5500); // 5000 + 500

    const line2 = {
      serviceType: ServiceType.HOTEL,
      quantity: 1,
      units: 1,
      unitNet: 5000,
      markupMode: MarkupMode.MANUAL,
      markupValue: 6000, // force sell price to 6000
    };
    const res2 = computeLine(line2, mockSettings as any);
    expect(res2.lineSell).toBe(6000);
    expect(res2.resolvedPercent).toBe(20); // (6000-5000)/5000 = 20%
  });

  it('computeOptionTotals aggregates lines correctly', () => {
    const lines = [
      { lineNet: 1000, lineSell: 1500 },
      { lineNet: 2000, lineSell: 2500 },
    ];
    // totals: net 3000, sell 4000. margin: 1000.
    // margin % = 1000 / 4000 = 25%
    // markup % = 1000 / 3000 = 33.33%
    const totals = computeOptionTotals(lines, 2);
    expect(totals.totalNet).toBe(3000);
    expect(totals.totalSell).toBe(4000);
    expect(totals.totalMargin).toBe(1000);
    expect(totals.marginPercent).toBeCloseTo(25);
    expect(totals.markupPercentEffective).toBeCloseTo(33.33);
    expect(totals.perPersonSell).toBe(2000);
  });

  it('gstBreakdown calculates tax correctly', () => {
    const result = gstBreakdown(1050, 5);
    // 1050 is 105% of 1000
    expect(result.baseAmount).toBe(1000);
    expect(result.gstAmount).toBe(50);
  });

  it('advise flags policy shortfall', () => {
    const settings = { minMarginPercent: 20, roundTo: 10 };
    // To get 20% margin on 1000, sell must be 1250 (profit 250 / 1250 = 20%).
    // If we sell at 1100, we fall short.
    const adv = advise(1000, 1100, settings as any);
    expect(adv.ok).toBe(false);
    expect(adv.minSellForPolicy).toBe(1250);
    expect(adv.shortfall).toBe(150);
  });

  describe('computeBedWiseOccupancy', () => {
    it('calculates bed-wise occupancy with markup, GST split, and zero rounding drift', () => {
      // 5 nights Ladakh trip:
      // Room cost per night: 4,000 (double sharing = 2,000 per adult per night -> 10,000 stay net)
      // Extra bed adult per night: 1,500 (7,500 stay net)
      // Extra bed child per night: 1,000 (5,000 stay net)
      // Child no bed per night: 0
      // Vehicle cost: 30,000 for Innova Crysta
      // Activities: 2,000 per adult, 1,000 per child
      // Permit: 600 per head (LAHDC + wildlife)
      // Group: 2 adults double sharing + 1 adult AwEB + 1 child CwEB + 1 child CNB = 5 pax
      // Shared transport per head = 30,000 / 5 = 6,000
      const result = computeBedWiseOccupancy({
        roomCostPerNight: 4000,
        extraBedAdultPerNight: 1500,
        extraBedChildPerNight: 1000,
        childNoBedPerNight: 0,
        nights: 5,
        totalTransportCost: 30000,
        adultActivityCostPerPerson: 2000,
        childActivityCostPerPerson: 1000,
        permitCostPerPerson: 600,
        adultsDoubleSharing: 2,
        adultsExtraBed: 1,
        childrenExtraBed: 1,
        childrenNoBed: 1,
        markupPercent: 20,
        gstPercent: 5,
        roundToNearest: 100,
      });

      expect(result.totalPax).toBe(5);

      // Verify category rates are rounded to nearest 100
      expect(result.rateCard.perAdultDouble % 100).toBe(0);
      expect(result.rateCard.perAwEB % 100).toBe(0);
      expect(result.rateCard.perCwEB % 100).toBe(0);
      expect(result.rateCard.perCNB % 100).toBe(0);

      // Verify strict sum of category line items equals totalSell
      const expectedTotalSell =
        2 * result.rateCard.perAdultDouble +
        1 * result.rateCard.perAwEB +
        1 * result.rateCard.perCwEB +
        1 * result.rateCard.perCNB;

      expect(result.totalSell).toBe(expectedTotalSell);

      // Adult double net = 10,000 (room) + 6,000 (transport) + 2,000 (activity) + 600 (permit) = 18,600
      expect(result.pax.adultDouble.perPersonNet).toBe(18600);

      // With 20% markup: 18,600 * 1.2 = 22,320 -> rounded to nearest 100 = 22,300
      expect(result.rateCard.perAdultDouble).toBe(22300);

      // Check GST split is computed on rounded sell
      expect(result.pax.adultDouble.perPersonBase + result.pax.adultDouble.perPersonGst).toBe(22300);

      // Check gross profit and effective margin
      expect(result.totalMargin).toBe(result.totalSell - result.totalNet);
      expect(result.marginPercent).toBeGreaterThan(15);
    });

    it('handles single room solo supplement correctly', () => {
      const result = computeBedWiseOccupancy({
        roomCostPerNight: 5000,
        nights: 4,
        totalTransportCost: 20000,
        adultsDoubleSharing: 0,
        singleRooms: 1,
        markupPercent: 25,
        roundToNearest: 100,
      });

      expect(result.totalPax).toBe(1);
      expect(result.totalRooms).toBe(1);
      // Single room pays full room cost (20,000) + full transport (20,000) = 40,000 net
      expect(result.pax.single.perPersonNet).toBe(40000);
      // 40,000 * 1.25 = 50,000 sell
      expect(result.rateCard.perSingle).toBe(50000);
      expect(result.totalSell).toBe(50000);
    });
  });
});
