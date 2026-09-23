import type { Tone } from './destinations';

/**
 * Tour packages — the "spoke" pages in our hub-and-spoke SEO model, and the
 * highest-intent surface on the site. Every one carries a day-by-day
 * itinerary, honest inclusions/exclusions and FAQs, because thin price-list
 * pages do not rank and do not convert.
 *
 * The eleven packages, their prices, day-by-day text and FAQs are the same
 * ones the Google Ads landers at go.ladakhvacation.in sell (that site's
 * build/pages.js), so a traveller never sees two versions of one trip.
 *
 * Prices are per-person on twin-sharing, the convention every Indian traveller
 * already expects. They are starting points, not quotes.
 */

export type Pkg = {
  slug: string;
  name: string;
  /** Primary destination hub. Groups the package on /packages. */
  destination: string;
  destinationName: string;
  /** Every destination hub the route passes through. Drives each hub's package list. */
  regions: string[];
  nights: number;
  days: number;
  priceFrom: number;
  /** Travel-style slugs this package suits. Drives /travel-styles pages. */
  styles: string[];
  summary: string;
  /** Stops in order — rendered as the route ribbon. */
  route: string[];
  bestMonths: string;
  idealFor: string;
  itinerary: {
    day: number;
    title: string;
    body: string;
    stay?: string;
    meals?: string;
  }[];
  inclusions: string[];
  exclusions: string[];
  faqs: { q: string; a: string }[];
  tone: Tone;
  image: string;
  /** Surfaces on the home page and the packages index as a featured card. */
  featured?: boolean;
};

export const PACKAGES: Pkg[] = [
  {
    "slug": "3-nights-ladakh-tour",
    "name": "Leh Short Escape",
    "destination": "leh",
    "destinationName": "Ladakh",
    "regions": [
      "leh",
      "ladakh-monasteries"
    ],
    "nights": 3,
    "days": 4,
    "priceFrom": 14500,
    "styles": [
      "family",
      "culture"
    ],
    "summary": "The shortest trip we will honestly sell. Leh, the Indus monasteries and the low Sham Valley, with no high passes, because four days is not enough time to earn them safely.",
    "route": [
      "Leh",
      "Shey & Thiksey",
      "Sham Valley",
      "Leh"
    ],
    "bestMonths": "Apr–Oct",
    "idealFor": "A long weekend, first-timers and anyone short on leave who still wants to do Ladakh safely",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup and a deliberately empty afternoon. Hydration, a slow walk to the Main Bazaar, early dinner — on a short trip, resting on day one is what makes days two and three work.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Leh & the Indus monasteries",
        "body": "Shanti Stupa, Leh Palace and the old town by morning, then Thiksey and Shey down the Indus. Gentle elevation, no passes.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Sham Valley & Magnetic Hill",
        "body": "The low-altitude western loop — Magnetic Hill, the Sangam confluence of the Indus and Zanskar, and Alchi’s 11th-century murals.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Departure",
        "body": "Morning transfer to Kushok Bakula Rimpochee Airport with breakfast packed for the flight out.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "Centrally located 3★ hotel in Leh on twin-sharing",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "valley",
    "image": "/img/ladakh-hero.webp"
  },
  {
    "slug": "4-nights-ladakh-tour",
    "name": "Leh Essentials",
    "destination": "leh",
    "destinationName": "Ladakh",
    "regions": [
      "leh",
      "nubra-pangong",
      "ladakh-monasteries"
    ],
    "nights": 4,
    "days": 5,
    "priceFrom": 18900,
    "styles": [
      "family"
    ],
    "summary": "The short Ladakh trip done right: Leh, Sham Valley, Khardung La and Nubra, with the first 48 hours kept deliberately gentle so altitude never owns your holiday.",
    "route": [
      "Leh",
      "Sham Valley",
      "Khardung La",
      "Nubra",
      "Thiksey",
      "Leh"
    ],
    "bestMonths": "May–Oct",
    "idealFor": "First-timers who want Khardung La and a night in Nubra without a long trip",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup and a deliberately empty afternoon — hydration, a slow walk to Main Bazaar, early dinner. This day is medicine, not sightseeing.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Sham Valley & the Indus",
        "body": "A low-altitude loop to Magnetic Hill, the Sangam confluence and Alchi’s 11th-century murals. Almost no elevation gained, which is the point.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Khardung La & Nubra",
        "body": "Cross the pass at 5,359 m with a short controlled stop, descend to the Hunder dunes among the Bactrian camels, and overnight in Nubra.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Nubra → Leh via Thiksey",
        "body": "Return over Khardung La, then sunset prayers at Thiksey and the copper Buddha at Shey.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Departure",
        "body": "Morning transfer to Kushok Bakula Rimpochee Airport with breakfast packed for the flight out.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "Centrally located 3★ hotel in Leh and a deluxe camp in Nubra, on twin-sharing",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "valley",
    "image": "/img/ladakh-hero.webp"
  },
  {
    "slug": "5-nights-ladakh-tour",
    "name": "Monasteries & Moonland",
    "destination": "ladakh-monasteries",
    "destinationName": "Ladakh",
    "regions": [
      "ladakh-monasteries",
      "leh"
    ],
    "nights": 5,
    "days": 6,
    "priceFrom": 23400,
    "styles": [
      "culture",
      "family"
    ],
    "summary": "Lamayuru, Alchi’s 11th-century murals and an unhurried Indus valley. The cultural spine of Ladakh, walked slowly with a monastery guide.",
    "route": [
      "Leh",
      "Likir",
      "Alchi",
      "Lamayuru",
      "Thiksey",
      "Hemis",
      "Leh"
    ],
    "bestMonths": "Apr–Oct",
    "idealFor": "Travellers who came for the culture, older parents, and anyone who would rather avoid the highest passes",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup, then rest. Acclimatisation is the entire job today — no sightseeing, plenty of water.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Leh Old Town & Shanti Stupa",
        "body": "A gentle walking day through the old lanes, Leh Palace and sunset at Shanti Stupa.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Likir, Alchi & Basgo",
        "body": "West along the Indus to Likir’s giant Maitreya, Alchi’s 11th-century woodwork and the ruined citadel at Basgo.",
        "stay": "Heritage stay in the Sham Valley",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Lamayuru & the Moonland",
        "body": "The lunar ridges of Lamayuru and its cliff-edge gompa — the oldest surviving monastery in Ladakh.",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Thiksey & Hemis",
        "body": "Dawn prayers at Thiksey, then Hemis, the wealthiest monastery in Ladakh, and Shey’s copper Buddha.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Departure",
        "body": "A final Ladakhi breakfast and the morning transfer to the airport.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "3★ hotel in Leh and a heritage stay in the Sham Valley, on twin-sharing",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "A monastery guide on the monastery days",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "monastery",
    "image": "/img/ladakh-monastery.webp"
  },
  {
    "slug": "6-nights-ladakh-tour",
    "name": "Stargazer’s Ladakh",
    "destination": "hanle",
    "destinationName": "Ladakh",
    "regions": [
      "hanle",
      "leh"
    ],
    "nights": 6,
    "days": 7,
    "priceFrom": 31200,
    "styles": [
      "adventure",
      "family"
    ],
    "summary": "Tso Moriri, the Changthang plateau and two nights at Hanle, where the Milky Way is bright enough to cast a shadow.",
    "route": [
      "Leh",
      "Chumathang",
      "Tso Moriri",
      "Hanle",
      "Umling La",
      "Leh"
    ],
    "bestMonths": "May–Oct",
    "idealFor": "Stargazers, photographers and anyone who has already done Nubra and Pangong",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup and a deliberately quiet afternoon. Hydration, a slow walk to the Main Bazaar, early dinner — altitude first, sightseeing later.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Leh & Shanti Stupa",
        "body": "A gentle acclimatisation day through Leh Old Town and the Palace, finishing at Shanti Stupa for sunset over the Stok range.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Leh → Chumathang → Tso Moriri",
        "body": "South-east along the Indus to the Chumathang hot springs, then up onto the Rupshu plateau to Korzok on the shore of Tso Moriri.",
        "stay": "Camp at Tso Moriri",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Tso Moriri → Hanle",
        "body": "Across the Changthang grasslands past Tso Kar, watching for kiang and black-necked cranes, into Hanle before dark.",
        "stay": "Dark-sky camp at Hanle",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Hanle Dark Sky Reserve",
        "body": "The Indian Astronomical Observatory by day, and the night you came for — the Milky Way at 4,500 m with an astro guide and zero light pollution.",
        "stay": "Dark-sky camp at Hanle",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Hanle → Umling La → Leh",
        "body": "The highest motorable road on earth at 5,798 m in the morning light, then the long descent back to Leh via Nyoma.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Departure",
        "body": "Morning transfer to Kushok Bakula Rimpochee Airport with breakfast packed for the flight out.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "3★ hotel in Leh and dark-sky camps at Tso Moriri and Hanle, on twin-sharing",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "An astro guide for the night at the Hanle Dark Sky Reserve",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "nightsky",
    "image": "/img/hanle-night-sky.webp",
    "featured": true
  },
  {
    "slug": "7-nights-ladakh-tour",
    "name": "Complete Ladakh",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "leh",
      "ladakh-monasteries"
    ],
    "nights": 7,
    "days": 8,
    "priceFrom": 36500,
    "styles": [
      "family",
      "adventure"
    ],
    "summary": "The week that adds the Balti frontier at Turtuk and a free day in Leh: the difference between seeing Ladakh and actually spending time in it.",
    "route": [
      "Leh",
      "Sham Valley",
      "Nubra",
      "Turtuk",
      "Pangong Tso",
      "Leh"
    ],
    "bestMonths": "May–Sep",
    "idealFor": "Travellers with a full week who want Turtuk and a free day, not just the checklist",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup and a quiet afternoon. Hydration, a short walk, early dinner — altitude first.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Sham Valley & the Indus",
        "body": "Magnetic Hill, the Sangam confluence and Alchi. A low-altitude day by design.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m with a short controlled stop, then drop into the Hunder dunes among the Bactrian camels.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Turtuk & the Balti frontier",
        "body": "North to the last village before the border — apricot orchards, Balti kitchens and a culture only reachable since 2010.",
        "stay": "Overnight in Turtuk",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Nubra → Pangong via Shyok",
        "body": "The river road east, reaching Pangong Tso in late afternoon light. Overnight in an insulated shoreline camp.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Pangong → Leh over Chang La",
        "body": "Sunrise on the lake, then back over Chang La at 5,360 m with a stop at Thiksey on the descent.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Leh at leisure",
        "body": "A free day — Hemis and Stok, rafting on the Zanskar, or simply the cafés and craft shops of Changspa Road.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 8,
        "title": "Departure",
        "body": "Morning transfer to the airport, breakfast packed for the flight out over the range.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "3★ hotels in Leh and deluxe camps at Nubra and Pangong with attached bathrooms, heating and hot water",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "highroad",
    "image": "/img/ladakh-hanle.webp"
  },
  {
    "slug": "8-nights-ladakh-tour",
    "name": "Grand Ladakh Circuit",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "hanle",
      "leh",
      "ladakh-monasteries"
    ],
    "nights": 8,
    "days": 9,
    "priceFrom": 42000,
    "styles": [
      "adventure",
      "family"
    ],
    "summary": "Our most-booked route. Nubra, Turtuk, Pangong, Hanle and the highest motorable road on earth, sequenced so the altitude never catches you out.",
    "route": [
      "Leh",
      "Sham Valley",
      "Nubra",
      "Turtuk",
      "Pangong Tso",
      "Hanle",
      "Umling La",
      "Tso Moriri",
      "Leh"
    ],
    "bestMonths": "May–Sep",
    "idealFor": "Anyone who wants the whole of Ladakh in one trip and has nine days to do it properly",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup and a deliberately empty afternoon. Hydration, a slow walk to the Main Bazaar, early dinner.",
        "stay": "4★ hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Sham Valley & the Indus",
        "body": "A low-altitude loop to Magnetic Hill, the Sangam confluence and Alchi. You gain almost no elevation, precisely the point.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m with a short stop, then descend into the Nubra dunes at Hunder among the double-humped Bactrian camels.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Turtuk & the Balti frontier",
        "body": "North to the last village before the border — apricot orchards, Balti cuisine and a culture only reachable since 2010.",
        "stay": "Overnight in Turtuk",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Nubra → Pangong via Shyok",
        "body": "The river road east, arriving at Pangong Tso in late afternoon light. Overnight in an insulated shoreline camp.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Pangong → Hanle",
        "body": "Across the Changthang plateau through Chushul and Loma, watching for kiang and black-necked cranes.",
        "stay": "Overnight in Hanle",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Hanle & Umling La · 5,798 m",
        "body": "The highest motorable road on earth by morning; the Milky Way over the Dark Sky Reserve by night, with an astro guide.",
        "stay": "Overnight in Hanle",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 8,
        "title": "Hanle → Tso Moriri → Leh",
        "body": "West past Tso Moriri and the Chumathang hot springs, back into Leh by evening for a final dinner.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 9,
        "title": "Departure",
        "body": "Morning transfer to the airport, with breakfast packed for the flight out over the range.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "4★ hotels in Leh and deluxe camps at Nubra and Pangong with attached bathrooms, heating and hot water",
      "Daily breakfast and dinner",
      "Private Innova Crysta or Xylo with a Ladakhi driver for all transfers and sightseeing",
      "An astro guide for the night at the Hanle Dark Sky Reserve",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "highroad",
    "image": "/img/ladakh-hanle.webp",
    "featured": true
  },
  {
    "slug": "ladakh-honeymoon-packages",
    "name": "Honeymoon in the High Desert",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "leh"
    ],
    "nights": 5,
    "days": 6,
    "priceFrom": 34900,
    "styles": [
      "honeymoon"
    ],
    "summary": "No shared vehicle, no group schedule, no rushing. A private car, 4★ stays, a luxury camp under the Nubra dunes and afternoons with nothing in them.",
    "route": [
      "Leh",
      "Nubra",
      "Pangong Tso",
      "Leh"
    ],
    "bestMonths": "May–Sep",
    "idealFor": "Couples who want privacy, slower days and a luxury camp rather than a shared schedule",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Private transfer to a 4★ hotel, room decorated for your arrival. The afternoon is deliberately free — tea on the terrace, nothing scheduled.",
        "stay": "4★ hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Leh & sunset at Shanti Stupa",
        "body": "A slow morning, the old town and Leh Palace, then the Stupa for sunset over the Stok range. Dinner is yours alone, on the roof.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m, then descend to Hunder. Overnight in a luxury tented camp among the dunes.",
        "stay": "Luxury tented camp, Hunder",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Nubra · dunes and a private dinner",
        "body": "Bactrian camels at golden hour in the Hunder dunes, the Diskit Maitreya above the valley, and a candlelight dinner set for two.",
        "stay": "Luxury tented camp, Hunder",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Nubra → Pangong via Shyok",
        "body": "The river road east to Pangong Tso. A lakeside camp, and a sky with nothing in it but stars.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Pangong → Leh & departure",
        "body": "Sunrise on the lake, back over Chang La to Leh, and your onward flight.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "4★ hotel in Leh and a luxury tented camp in Nubra",
      "A private cab for the two of you, never shared",
      "Room decorated for your arrival",
      "One private candlelight dinner in the Nubra dunes, weather permitting",
      "Daily breakfast and dinner",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "What actually makes the honeymoon package different?",
        "a": "A private cab for the two of you rather than a shared vehicle, 4★ hotels in Leh and a luxury tented camp in Nubra rather than standard camps, a room decorated on arrival, and one candlelight dinner set up privately — at the dunes in Nubra, weather permitting. The pace is also slower: we build in unscheduled afternoons instead of filling every hour."
      },
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "nightsky",
    "image": "/img/hanle-night-sky.webp",
    "featured": true
  },
  {
    "slug": "ladakh-group-tour",
    "name": "Fixed Departure Group Tour",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "hanle",
      "leh",
      "ladakh-monasteries"
    ],
    "nights": 6,
    "days": 7,
    "priceFrom": 26500,
    "styles": [
      "group"
    ],
    "summary": "Twice-monthly fixed departures with a trip captain from our Leh team. Most people who book these come on their own, which is rather the point.",
    "route": [
      "Leh",
      "Sham Valley",
      "Nubra",
      "Pangong Tso",
      "Hanle",
      "Leh"
    ],
    "bestMonths": "Mid-May–Sep",
    "idealFor": "Solo travellers and friends who would rather share the road with 8 to 16 people",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Leh · 3,500 m",
        "body": "Airport pickup, hotel check-in and an evening briefing with your trip captain. Rest of the day at rest — altitude first.",
        "stay": "Hotel in Leh",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Sham Valley & the Indus",
        "body": "Magnetic Hill, the Sangam confluence and Alchi. A low-altitude acclimatisation day for the whole group.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m together, then down to the Hunder dunes and the Bactrian camels.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Nubra → Pangong via Shyok",
        "body": "The river road east, arriving at Pangong Tso for the afternoon light. Camp on the shoreline.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Pangong → Hanle",
        "body": "Across the Changthang plateau through Chushul and Loma, watching for kiang and black-necked cranes.",
        "stay": "Overnight in Hanle",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Hanle → Leh",
        "body": "The observatory in the morning, then the long, spectacular run back to Leh via Nyoma and Chumathang.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Departure",
        "body": "Group breakfast and transfers to the airport across the morning.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "3★ hotels in Leh and deluxe camps at Nubra and Pangong, twin-sharing matched by gender",
      "A trip captain from our Leh team for the whole departure",
      "Daily breakfast and dinner",
      "Shared vehicles for the group with Ladakhi drivers",
      "Airport pickup and drop at Leh (Kushok Bakula Rimpochee Airport)",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare to and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "How big are the groups, and can I join on my own?",
        "a": "Fixed departures run at 8 to 16 travellers with a trip captain from our Leh team. Solo travellers are welcome and are the majority of our group bookings — you will be matched into twin-sharing with someone of the same gender, or you can pay a single-occupancy supplement for your own room."
      },
      {
        "q": "When do the fixed departures run?",
        "a": "Twice monthly from mid-May to late September, usually departing on the 5th and 20th. Dates for the coming season are confirmed in January. If your dates fall between departures, or you are six or more people, we run the same itinerary privately at close to the same per-person cost."
      },
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "highroad",
    "image": "/img/ladakh-hanle.webp"
  },
  {
    "slug": "leh-ladakh-bike-trip",
    "name": "Himalayan Bike Expedition",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "leh"
    ],
    "nights": 8,
    "days": 9,
    "priceFrom": 39900,
    "styles": [
      "adventure",
      "group"
    ],
    "summary": "Royal Enfield Himalayans, fuel and a mechanic included, with a support vehicle carrying luggage, spares and oxygen behind you every kilometre.",
    "route": [
      "Manali",
      "Jispa",
      "Sarchu",
      "Leh",
      "Nubra",
      "Pangong Tso",
      "Leh"
    ],
    "bestMonths": "Jun–Sep",
    "idealFor": "Riders comfortable with 150–250 km days on mixed surfaces",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Manali",
        "body": "Hotel check-in, bike allocation and a full safety briefing. Gear check, luggage sorted onto the backup vehicle.",
        "stay": "Hotel in Manali",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Manali → Jispa · 140 km",
        "body": "Through the Atal Tunnel into Lahaul, then along the Bhaga river past Keylong to Jispa. A gentle first riding day by design.",
        "stay": "Hotel in Jispa",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Jispa → Sarchu · 90 km",
        "body": "Baralacha La at 4,890 m and the Suraj Tal lake, then onto the Sarchu plain. Swiss camp for the night.",
        "stay": "Swiss camp at Sarchu",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Sarchu → Leh · 255 km",
        "body": "The big one — the Gata Loops, Nakee La, Lachulung La and Tanglang La at 5,328 m, then down the Indus into Leh.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Leh · rest and service",
        "body": "A full rest day. Bikes serviced and checked, permits collected, and nothing asked of your body above 3,500 m.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Leh → Nubra over Khardung La",
        "body": "The famous crossing at 5,359 m, then down to the Hunder dunes in Nubra.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Nubra → Pangong via Shyok",
        "body": "The Shyok river road east — rough, remote and the best riding of the trip — to Pangong Tso.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 8,
        "title": "Pangong → Leh over Chang La",
        "body": "Sunrise on the lake, then Chang La at 5,360 m and back into Leh for a final night together.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 9,
        "title": "Departure",
        "body": "Bikes handed back, breakfast, and transfers to the airport.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "Royal Enfield Himalayan 411, serviced before every departure, with fuel",
      "Backup vehicle carrying luggage, spares, fuel and oxygen, with a mechanic on board every day",
      "3★ hotels and a Swiss camp at Sarchu, on twin-sharing",
      "Daily breakfast and dinner",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Travel to Manali and airfare from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting on the Zanskar or camel rides in Nubra",
      "Personal expenses such as laundry, tips and phone calls",
      "Riding gear and damage to the motorcycle",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "Do I need a special licence or previous Himalayan experience?",
        "a": "A valid motorcycle licence is mandatory and we check it at handover. Previous high-altitude riding is not required, but you should be genuinely comfortable riding 150–250 km in a day on mixed surfaces before you book. The Manali–Leh leg includes gravel, water crossings and five passes above 4,000 m. If you are unsure, ride the same route with us on the backup vehicle for the first two days and take over at Leh — we have done that for plenty of riders."
      },
      {
        "q": "Whose motorcycle do I ride, and what if it breaks down?",
        "a": "Royal Enfield Himalayan 411s, serviced before every departure, are included in the price along with fuel. You may bring your own bike instead and we will reduce the cost accordingly. A backup vehicle follows the group carrying luggage, spares, fuel and oxygen, with a mechanic on board every single day — nobody is ever left on a pass waiting for help."
      },
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "When should I actually visit?",
        "a": "September and October are our honest pick — clear skies, thin crowds, golden poplars and the year’s best conditions at Hanle. May and June are the busiest and most photogenic for snow-lined passes. July and August are warmest but can see rain-related roadblocks. From November to March most high roads close."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "valley",
    "image": "/img/ladakh-hero.webp"
  },
  {
    "slug": "kashmir-ladakh-tour",
    "name": "Kashmir & Ladakh",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "leh",
      "ladakh-monasteries"
    ],
    "nights": 9,
    "days": 10,
    "priceFrom": 54900,
    "styles": [
      "family",
      "adventure"
    ],
    "summary": "From a Dal Lake houseboat over Zoji La to the Changthang plateau: the classic Srinagar-to-Leh road, run by one team from end to end.",
    "route": [
      "Srinagar",
      "Sonamarg",
      "Kargil",
      "Lamayuru",
      "Leh",
      "Nubra",
      "Pangong Tso",
      "Leh"
    ],
    "bestMonths": "May–Sep",
    "idealFor": "Travellers who want to reach Leh by road and let the altitude come gradually",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Srinagar",
        "body": "Transfer to your deluxe houseboat on Dal Lake, followed by an evening shikara ride through the floating gardens.",
        "stay": "Deluxe houseboat, Dal Lake",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Srinagar & the Mughal gardens",
        "body": "Nishat, Shalimar and Chashme Shahi, the old city mosques, and the craft workshops of downtown Srinagar.",
        "stay": "Hotel in Srinagar",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Srinagar → Sonamarg → Kargil",
        "body": "The Sindh valley to Sonamarg, over Zoji La, past Drass and into Kargil for the night.",
        "stay": "Hotel in Kargil",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Kargil → Lamayuru → Leh",
        "body": "Mulbekh’s rock-cut Maitreya, the moonland at Lamayuru, and the Indus confluence into Leh.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Leh acclimatisation",
        "body": "A gentle day — Leh Palace, Shanti Stupa and the bazaar, letting altitude settle before the passes.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m and drop into the Nubra dunes at Hunder.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Nubra → Pangong via Shyok",
        "body": "The river road east to Pangong Tso, overnight in an insulated shoreline camp.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 8,
        "title": "Pangong → Leh via Chang La",
        "body": "Back over Chang La, with a stop at Thiksey monastery on the descent.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 9,
        "title": "Leh at leisure",
        "body": "A free day for monasteries, rafting on the Zanskar, or simply the cafés of Changspa Road.",
        "stay": "4★ hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 10,
        "title": "Departure",
        "body": "Morning transfer to Leh airport.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "4★ hotels, one night on a deluxe Dal Lake houseboat, and camps at Nubra and Pangong",
      "Evening shikara ride on Dal Lake",
      "Daily breakfast and dinner",
      "Private vehicle with driver from Srinagar to Leh and for all Ladakh sightseeing",
      "Pickup at Srinagar airport, drop at Leh airport",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Airfare or train fare to Srinagar and from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "Is the Srinagar–Leh road open all year?",
        "a": "No. The Zoji La section typically opens from May to late October and closes with the first heavy snow. Outside that window we fly you into Leh and run the Ladakh half only, or move your dates — we will always tell you honestly rather than sell you a closed pass."
      },
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "valley",
    "image": "/img/ladakh-hero.webp",
    "featured": true
  },
  {
    "slug": "manali-ladakh-tour",
    "name": "Manali to Leh Overland",
    "destination": "nubra-pangong",
    "destinationName": "Ladakh",
    "regions": [
      "nubra-pangong",
      "leh"
    ],
    "nights": 7,
    "days": 8,
    "priceFrom": 38500,
    "styles": [
      "adventure",
      "family"
    ],
    "summary": "Five passes above 4,000 m, broken across nights at Jispa and Sarchu so you arrive in Leh acclimatised instead of wrecked.",
    "route": [
      "Manali",
      "Jispa",
      "Sarchu",
      "Leh",
      "Nubra",
      "Pangong Tso",
      "Leh"
    ],
    "bestMonths": "Jun–Sep",
    "idealFor": "Road-trippers who want to arrive in Leh already acclimatised",
    "itinerary": [
      {
        "day": 1,
        "title": "Arrive Manali",
        "body": "Transfer to your hotel in Old Manali. Evening free along the Mall and the Beas river.",
        "stay": "Hotel in Manali",
        "meals": "Dinner"
      },
      {
        "day": 2,
        "title": "Manali → Jispa",
        "body": "Over the Atal Tunnel into Lahaul, along the Bhaga river through Keylong to Jispa for the night.",
        "stay": "Hotel in Jispa",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 3,
        "title": "Jispa → Sarchu · 4,290 m",
        "body": "Baralacha La and the Suraj Tal lake, then the high plain of Sarchu. Overnight in a Swiss camp.",
        "stay": "Swiss camp at Sarchu",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 4,
        "title": "Sarchu → Leh",
        "body": "The Gata Loops, Nakee La, Lachulung La and Tanglang La, then down the Indus valley into Leh.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 5,
        "title": "Leh acclimatisation",
        "body": "A recovery day after the overland run — Leh Palace, Shanti Stupa and the bazaar at an easy pace.",
        "stay": "Hotel in Leh",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 6,
        "title": "Leh → Nubra over Khardung La",
        "body": "Cross at 5,359 m and descend to the Hunder dunes in Nubra.",
        "stay": "Deluxe camp in Nubra",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 7,
        "title": "Nubra → Pangong via Shyok",
        "body": "East along the river to Pangong Tso, overnight on the shoreline.",
        "stay": "Shoreline camp at Pangong Tso",
        "meals": "Breakfast, dinner"
      },
      {
        "day": 8,
        "title": "Pangong → Leh & departure",
        "body": "Back over Chang La to Leh, with a Thiksey stop, for your onward flight.",
        "meals": "Breakfast"
      }
    ],
    "inclusions": [
      "3★ hotels and a Swiss camp at Sarchu, on twin-sharing",
      "Daily breakfast and dinner",
      "Private vehicle with driver from Manali to Leh and for all Ladakh sightseeing",
      "Pickup in Manali, drop at Leh airport",
      "Restricted-area paperwork for this route, paid and printed before you land: the Ladakh environmental fee for Indian guests, and a Protected Area Permit for foreign nationals",
      "Oxygen cylinder, oximeter and a stocked first-aid kit in every vehicle",
      "24×7 on-ground support from a named coordinator in Leh"
    ],
    "exclusions": [
      "Travel to Manali and airfare from Leh",
      "Lunch and any meal not listed under inclusions",
      "Monument and monastery entry tickets",
      "Adventure activities such as rafting, camel rides and bike rental",
      "Personal expenses such as laundry, tips and phone calls",
      "Anything not listed under inclusions"
    ],
    "faqs": [
      {
        "q": "Is the Manali–Leh highway safe?",
        "a": "It is a well-travelled route from roughly late May to mid-October, and our drivers run it weekly through the season. The road crosses five passes above 4,000 m, so we break the journey at Jispa and Sarchu rather than pushing through in a single day — that pacing is the biggest safety factor there is."
      },
      {
        "q": "How bad is the altitude, honestly?",
        "a": "Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter, and your driver is trained to recognise AMS. If you have a cardiac or pulmonary condition, speak to your doctor and then to us."
      },
      {
        "q": "Do I need permits, and do you arrange them?",
        "a": "Indian travellers do not need an Inner Line Permit. For Nubra, Pangong, Hanle, Tso Moriri and Umling La we pay the Ladakh environmental fee and the daily wildlife fee, and the receipt is with you before you arrive. Foreign nationals need a Protected Area Permit for those areas, which we arrange. Leh town and the Sham Valley need neither. We only need a scan of your photo ID at booking."
      },
      {
        "q": "What kind of hotels do you use?",
        "a": "Leh stays are 3★ or 4★ depending on the package, always centrally located and personally inspected. At Nubra, Pangong and Sarchu we use deluxe or Swiss camps with attached bathrooms, heating and hot water — the only sensible option at that altitude. All rates are quoted on twin-sharing; single occupancy is available on request."
      },
      {
        "q": "Can the itinerary be changed?",
        "a": "Every route on this page is a starting point. Add Turtuk, drop Pangong, extend Hanle, swap camps for hotels, travel with a toddler or a ninety-year-old — we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries."
      },
      {
        "q": "How does payment work? Is EMI available?",
        "a": "A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months. You receive an itemised quote showing exactly what each night and each vehicle costs — never a single lump sum."
      }
    ],
    "tone": "highroad",
    "image": "/img/ladakh-hanle.webp"
  }
];

export function getPackage(slug: string): Pkg | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}

export function packagesFor(destinationSlug: string): Pkg[] {
  return PACKAGES.filter((p) => p.regions.includes(destinationSlug));
}

export function packagesForStyle(styleSlug: string): Pkg[] {
  return PACKAGES.filter((p) => p.styles.includes(styleSlug));
}

/**
 * Home-page feature row. Capped at four so it fills the 4-column grid exactly
 * — a fifth card orphans onto its own row and reads as a layout bug.
 */
export const FEATURED = PACKAGES.filter((p) => p.featured).slice(0, 4);
