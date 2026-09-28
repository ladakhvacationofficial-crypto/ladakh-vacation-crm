/**
 * Test suppliers and contract rates, so the itinerary builder and the costing
 * screens have something to price against.
 *
 *   npm run seed:rates          insert (or refresh) the test data
 *   npm run seed:rates -- clean remove it and stop
 *
 * Everything written here is tagged in `notes` with SEED_TAG and every supplier
 * name ends in "(Test)". Nothing touches suppliers you entered yourself. Real
 * property names are deliberately NOT used: a fabricated rate under a real
 * hotel's name is the kind of row someone later quotes a live customer from.
 *
 * The rates below are plausible 2026 Ladakh net figures spanning every
 * RateBasis the quote engine handles, two seasons, three meal plans, and the
 * occupancy fields the bed-wise pricer reads.
 */
import { PrismaClient, VendorType, Season, MealPlan, RateBasis } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_TAG = '[SEED:test-rates]';

/** A rate line as it is typed on a contract. */
type Rate = {
  variant: string;
  netRate: number;
  rateBasis?: RateBasis;
  season?: Season;
  mealPlan?: MealPlan;
  extraBedRate?: number;
  childRate?: number;
  maxOccupancy?: number;
  validFrom?: string;
  validTo?: string;
};

type Supplier = {
  name: string;
  type: VendorType;
  city?: string;
  area?: string;
  starRating?: number;
  unionZone?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: string[];
  note: string;
  rates: Rate[];
};

const PEAK = Season.PEAK;
const SHOULDER = Season.SHOULDER;

const SUPPLIERS: Supplier[] = [
  {
    name: 'Leh Valley Inn (Test)',
    type: VendorType.HOTEL,
    city: 'Leh',
    area: 'Changspa',
    starRating: 3,
    checkInTime: '12:00',
    checkOutTime: '10:00',
    amenities: ['Central Heating', 'Hot Water', 'Wifi', 'Oxygen Cylinder'],
    note: 'Night one and two, walking distance from the market.',
    rates: [
      { variant: 'Deluxe', mealPlan: MealPlan.MAP, season: PEAK, netRate: 4200, extraBedRate: 1100, childRate: 750, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Deluxe', mealPlan: MealPlan.MAP, season: SHOULDER, netRate: 3100, extraBedRate: 900, childRate: 600, maxOccupancy: 3, validFrom: '2026-04-01', validTo: '2026-04-30' },
      { variant: 'Deluxe', mealPlan: MealPlan.CP, season: PEAK, netRate: 3600, extraBedRate: 900, childRate: 600, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Premium', mealPlan: MealPlan.MAP, season: PEAK, netRate: 5400, extraBedRate: 1400, childRate: 900, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
  {
    name: 'Indus Heritage Leh (Test)',
    type: VendorType.HOTEL,
    city: 'Leh',
    area: 'Skara',
    starRating: 4,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    amenities: ['Central Heating', 'Restaurant', 'Doctor on Call', 'Elevator'],
    note: 'Upsell option for the Leh nights.',
    rates: [
      { variant: 'Luxury Room', mealPlan: MealPlan.MAP, season: PEAK, netRate: 7800, extraBedRate: 1800, childRate: 1200, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Luxury Room', mealPlan: MealPlan.MAP, season: SHOULDER, netRate: 5900, extraBedRate: 1500, childRate: 1000, maxOccupancy: 3, validFrom: '2026-04-01', validTo: '2026-04-30' },
      { variant: 'Suite', mealPlan: MealPlan.MAP, season: PEAK, netRate: 12500, extraBedRate: 2600, childRate: 1800, maxOccupancy: 4, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
  {
    name: 'Hunder Dunes Camp (Test)',
    type: VendorType.CAMP,
    city: 'Nubra',
    area: 'Hunder',
    checkInTime: '12:00',
    checkOutTime: '09:00',
    amenities: ['Electric Blanket', 'Running Hot Water', 'Bonfire', 'Generator Backup'],
    note: 'Seasonal. Closes with the first heavy snow on the pass.',
    rates: [
      { variant: 'Deluxe Tent', mealPlan: MealPlan.MAP, season: PEAK, netRate: 4800, extraBedRate: 1300, childRate: 900, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Deluxe Tent', mealPlan: MealPlan.MAP, season: SHOULDER, netRate: 3600, extraBedRate: 1000, childRate: 700, maxOccupancy: 3, validFrom: '2026-04-15', validTo: '2026-04-30' },
      { variant: 'Super Deluxe Tent', mealPlan: MealPlan.MAP, season: PEAK, netRate: 6200, extraBedRate: 1500, childRate: 1000, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
  {
    name: 'Spangmik Lakeview Camp (Test)',
    type: VendorType.CAMP,
    city: 'Pangong',
    area: 'Spangmik',
    checkInTime: '13:00',
    checkOutTime: '09:00',
    amenities: ['Electric Blanket', 'Attached Washroom', 'Lake Facing'],
    note: 'Seasonal. Grid power in the evening only, generator otherwise.',
    rates: [
      { variant: 'Deluxe Tent', mealPlan: MealPlan.MAP, season: PEAK, netRate: 5200, extraBedRate: 1400, childRate: 950, maxOccupancy: 3, validFrom: '2026-05-15', validTo: '2026-10-05' },
      { variant: 'Lake Facing Tent', mealPlan: MealPlan.MAP, season: PEAK, netRate: 6800, extraBedRate: 1600, childRate: 1100, maxOccupancy: 3, validFrom: '2026-05-15', validTo: '2026-10-05' },
    ],
  },
  {
    name: 'Hanle Skywatch Stay (Test)',
    type: VendorType.CAMP,
    city: 'Hanle',
    area: 'Hanle village',
    checkInTime: '13:00',
    checkOutTime: '09:00',
    amenities: ['Bukhari Heating', 'Home Cooked Meals', 'Dark Sky Location'],
    note: 'Homestay. Full board, because there is nowhere else to eat.',
    rates: [
      { variant: 'Standard Room', mealPlan: MealPlan.AP, season: PEAK, netRate: 3200, extraBedRate: 900, childRate: 600, maxOccupancy: 3, validFrom: '2026-05-01', validTo: '2026-10-10' },
    ],
  },
  {
    name: 'Leh Taxi Union Fleet (Test)',
    type: VendorType.TRANSPORT,
    city: 'Leh',
    unionZone: 'Leh',
    note: 'Union rates, per vehicle per day, driver and fuel included.',
    rates: [
      { variant: 'Innova Crysta', rateBasis: RateBasis.PER_VEHICLE_DAY, season: PEAK, netRate: 5500, maxOccupancy: 6, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Innova Crysta', rateBasis: RateBasis.PER_VEHICLE_DAY, season: SHOULDER, netRate: 4800, maxOccupancy: 6, validFrom: '2026-04-01', validTo: '2026-04-30' },
      { variant: 'Xylo / Scorpio', rateBasis: RateBasis.PER_VEHICLE_DAY, season: PEAK, netRate: 4200, maxOccupancy: 6, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Tempo Traveller 12 seat', rateBasis: RateBasis.PER_VEHICLE_DAY, season: PEAK, netRate: 8500, maxOccupancy: 12, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Airport transfer', rateBasis: RateBasis.PER_TRANSFER, season: PEAK, netRate: 1200, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
  {
    name: 'Ladakh Guide Pool (Test)',
    type: VendorType.GUIDE,
    city: 'Leh',
    note: 'Accompanying guide, charged per day regardless of party size.',
    rates: [
      { variant: 'English speaking, per day', rateBasis: RateBasis.PER_UNIT, season: PEAK, netRate: 3000, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Monastery specialist, per day', rateBasis: RateBasis.PER_UNIT, season: PEAK, netRate: 4000, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
  {
    name: 'Nubra Activities Desk (Test)',
    type: VendorType.ACTIVITY,
    city: 'Nubra',
    note: 'Charged per head, settled on the day.',
    rates: [
      { variant: 'Double hump camel ride, 30 min', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 500, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'ATV ride, 20 min', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 1200, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Hanle astronomy session', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 1500, validFrom: '2026-05-01', validTo: '2026-10-10' },
    ],
  },
  {
    name: 'Ladakh Permits and Fees (Test)',
    type: VendorType.OTHER,
    city: 'Leh',
    note: 'Statutory, zero margin. Pass through at cost.',
    rates: [
      { variant: 'Environmental fee, Indian national', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 400, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Inner Line Permit', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 500, validFrom: '2026-05-01', validTo: '2026-10-15' },
      { variant: 'Wildlife fee, per person per day', rateBasis: RateBasis.PER_PERSON, season: PEAK, netRate: 300, validFrom: '2026-05-01', validTo: '2026-10-15' },
    ],
  },
];

/** Removes everything a previous run of this script created. */
async function clean() {
  const tagged = await prisma.vendor.findMany({
    where: { notes: { contains: SEED_TAG } },
    select: { id: true, name: true },
  });
  if (tagged.length === 0) {
    console.log('Nothing to clean: no suppliers carry the seed tag.');
    return 0;
  }
  const ids = tagged.map((v) => v.id);
  // Rates cascade with the vendor, but count them first so the log is honest.
  const rateCount = await prisma.vendorRate.count({ where: { vendorId: { in: ids } } });
  await prisma.vendor.deleteMany({ where: { id: { in: ids } } });
  console.log(`Removed ${tagged.length} test suppliers and ${rateCount} rates.`);
  return tagged.length;
}

async function main() {
  const wantsClean = process.argv.slice(2).includes('clean');

  await clean();
  if (wantsClean) return;

  let rateTotal = 0;
  for (const s of SUPPLIERS) {
    const vendor = await prisma.vendor.create({
      data: {
        name: s.name,
        type: s.type,
        city: s.city,
        area: s.area,
        starRating: s.starRating,
        unionZone: s.unionZone,
        checkInTime: s.checkInTime,
        checkOutTime: s.checkOutTime,
        amenities: s.amenities ?? [],
        notes: `${SEED_TAG} ${s.note}`,
      },
    });

    for (const r of s.rates) {
      await prisma.vendorRate.create({
        data: {
          vendorId: vendor.id,
          variant: r.variant,
          season: r.season ?? Season.PEAK,
          mealPlan: r.mealPlan ?? null,
          rateBasis: r.rateBasis ?? RateBasis.PER_ROOM_NIGHT,
          netRate: r.netRate,
          extraBedRate: r.extraBedRate ?? null,
          childRate: r.childRate ?? null,
          maxOccupancy: r.maxOccupancy ?? null,
          validFrom: r.validFrom ? new Date(r.validFrom) : null,
          validTo: r.validTo ? new Date(r.validTo) : null,
          notes: SEED_TAG,
        },
      });
      rateTotal++;
    }
    console.log(`  ${s.name.padEnd(34)} ${s.rates.length} rates`);
  }

  console.log(`\nSeeded ${SUPPLIERS.length} test suppliers and ${rateTotal} rates.`);
  console.log('Remove them again with: npm run seed:rates -- clean');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
