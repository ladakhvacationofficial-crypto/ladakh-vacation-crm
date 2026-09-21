import type { Tone } from './destinations';

/**
 * Package collections — curated listings that answer a specific commercial
 * query, sitting on flat `/packages/<slug>` URLs alongside the individual
 * package pages.
 *
 * These are listings, not new products. Every package they show is one of the
 * eleven in PACKAGES, and every price resolves from that data, so nothing here
 * invents a number.
 */

export type Collection = {
  slug: string;
  /** Rendered H1. Matches how people actually phrase the query. */
  h1: string;
  seoTitle: string;
  metaDescription: string;
  kicker: string;
  lede: string;
  crumbLabel: string;
  body: string[];
  /** Package slugs, in the order they should be shown. */
  packages: string[];
  /** Optional comparison rows rendered above the cards. */
  compare?: { heading: string; note: string };
  faqs: { q: string; a: string }[];
  /** Travel-style slugs whose pages link to this collection. */
  styles: string[];
  tone: Tone;
  basePath?: string;
};

export const COLLECTIONS: Collection[] = [
  {
    slug: 'leh-ladakh-road-trip-packages',
    h1: 'Leh Ladakh road trip packages',
    seoTitle: 'Leh Ladakh Road Trip Packages — Manali, Srinagar & Bike Trips',
    metaDescription:
      'Leh Ladakh road trips from Manali and Srinagar, and a Royal Enfield bike trip with a backup vehicle. Overnight stops at Jispa, Sarchu and Kargil, permits and oxygen included.',
    kicker: 'Overland to Leh',
    lede:
      'Driving in takes two or three days and lets your body adjust on the way up. These are the three ways we run it, each broken with overnight stops so you arrive in Leh acclimatised instead of wrecked.',
    crumbLabel: 'Road trips',
    body: [
      'There are two roads into Ladakh. The Manali road crosses five passes above 4,000 m and runs from roughly late May to mid-October; we break it at Jispa and Sarchu rather than pushing through in one day, and that pacing is the biggest safety factor there is. The Srinagar road climbs over Zoji La, which typically opens in May and closes with the first heavy snow in late October, and we stop the night in Kargil.',
      'Either way, the altitude comes gradually, which is the main reason to drive. After the overland days every route takes a recovery day in Leh before Khardung La, Nubra and Pangong.',
      'Riders can do the Manali road on a Royal Enfield Himalayan with fuel and a mechanic included, and a support vehicle carrying luggage, spares and oxygen behind the group every day.',
    ],
    packages: ['manali-ladakh-tour', 'kashmir-ladakh-tour', 'leh-ladakh-bike-trip'],
    faqs: [
      {
        q: 'Is the Manali–Leh highway safe?',
        a: 'It is a well-travelled route from roughly late May to mid-October, and our drivers run it weekly through the season. The road crosses five passes above 4,000 m, so we break the journey at Jispa and Sarchu rather than pushing through in a single day.',
      },
      {
        q: 'Is the Srinagar–Leh road open all year?',
        a: 'No. The Zoji La section typically opens from May to late October and closes with the first heavy snow. Outside that window we fly you into Leh and run the Ladakh half only, or move your dates.',
      },
      {
        q: 'Can we drive one way and fly the other?',
        a: 'Yes, and it is often what we recommend: fly in and drive out, or drive in and fly home. Tell us which way round suits your dates and we will reshape the route.',
      },
    ],
    styles: ['adventure'],
    tone: 'highroad',
  },

  {
    slug: 'ladakh-packages-for-couples',
    h1: 'Ladakh tour packages for couples',
    seoTitle: 'Ladakh Tour Packages for Couples — Private, Unhurried Trips',
    metaDescription:
      'Ladakh trips for two: a private-cab honeymoon with a luxury Nubra camp, a slow monastery route, and two nights under the Hanle dark sky. Private 4×4, permits and oxygen included.',
    kicker: 'For two',
    lede:
      'A private car, a slower pace and at least one evening nobody else is part of. Three ways to see Ladakh as a couple, depending on whether you want dunes, monasteries or the darkest sky in India.',
    crumbLabel: 'For couples',
    body: [
      'Every trip we run uses a private vehicle, so no couple ever shares a car with strangers. What differs between these three is the pace and the setting.',
      'The honeymoon package adds 4★ hotels in Leh, a luxury tented camp in the Hunder dunes, a decorated room on arrival and one private candlelight dinner in the dunes, weather permitting. The monastery route is the gentlest on altitude and the easiest on the body. The Stargazer’s route spends two nights at Hanle, where the Milky Way is bright enough to cast a shadow.',
      'All three follow the same altitude rules as every trip we run: an empty first afternoon in Leh, a low second day, and the high places after that, never before.',
    ],
    packages: ['ladakh-honeymoon-packages', '5-nights-ladakh-tour', '6-nights-ladakh-tour'],
    faqs: [
      {
        q: 'What actually makes the honeymoon package different?',
        a: 'A private cab for the two of you, 4★ hotels in Leh and a luxury tented camp in Nubra rather than standard camps, a room decorated on arrival, and one candlelight dinner set up privately at the dunes in Nubra, weather permitting. The pace is also slower.',
      },
      {
        q: 'Which of the three is easiest on the altitude?',
        a: 'The monastery route. It follows the Indus valley between about 3,100 m and 3,500 m with no high passes. The honeymoon route reaches Pangong at 4,350 m, and the Stargazer’s route spends two nights at Hanle at 4,500 m, both after proper acclimatisation.',
      },
      {
        q: 'Can we combine two of them?',
        a: 'Yes. Every route is a starting point, and roughly two-thirds of our bookings end up fully custom. Tell us how many days you have and we will build the combination.',
      },
    ],
    styles: ['honeymoon'],
    tone: 'nightsky',
  },

  {
    slug: 'short-ladakh-tour-packages',
    h1: 'Short Ladakh tour packages, 3 to 5 nights',
    seoTitle: 'Short Ladakh Tour Packages — 3, 4 and 5 Nights from Leh',
    metaDescription:
      'Short Ladakh trips of 3 to 5 nights that are honest about what fits: Leh and the Sham Valley, Khardung La and Nubra, or the Indus monasteries. From ₹14,500 per person.',
    kicker: 'Short on leave',
    lede:
      'A short trip to Ladakh works if it is honest about what fits. These three are built so the altitude never owns your holiday, which means some places wait for a longer trip.',
    crumbLabel: 'Short trips',
    body: [
      'With three nights, we stay around Leh: the Indus monasteries and the low Sham Valley, with no high passes, because four days is not enough time to earn them safely. With four nights, you can cross Khardung La and spend a night in Nubra. With five, the monastery route adds Lamayuru, Alchi and Hemis at an unhurried pace.',
      'What does not fit in three or four nights is Pangong. Driving to a 4,350 m lake over a 5,360 m pass early in a trip is the single most common altitude mistake in Ladakh, and we do not sell it. If Pangong matters, you need five nights at the least, so that Nubra comes first: the honeymoon route does it in five, and the 7-night route adds Turtuk and a free day.',
      'Every short trip still starts the same way: an airport pickup and a deliberately empty first afternoon in Leh.',
    ],
    packages: ['3-nights-ladakh-tour', '4-nights-ladakh-tour', '5-nights-ladakh-tour'],
    faqs: [
      {
        q: 'Can I see Pangong on a short trip?',
        a: 'Not in three or four nights. Pangong sits at 4,350 m over a 5,360 m pass, and on every route we run it comes after two nights around Leh and a night in Nubra. That takes five nights at the least: the honeymoon route does it in five, and the 7-night route adds Turtuk and a free day.',
      },
      {
        q: 'How bad is the altitude, honestly?',
        a: 'Leh sits at 3,500 m and roughly one traveller in four feels mild breathlessness or a headache on day one. That is why our first 48 hours are deliberately low-effort. Every vehicle carries oxygen and an oximeter.',
      },
      {
        q: 'Can the itinerary be changed?',
        a: 'Every route is a starting point. Add a night, swap Nubra for the monasteries, or extend in Leh, and we build around it.',
      },
    ],
    styles: ['family', 'culture'],
    tone: 'valley',
  },

  {
    slug: 'ladakh-stargazing-tours',
    h1: 'Ladakh stargazing tours to Hanle',
    seoTitle: 'Ladakh Stargazing Tours — Hanle Dark Sky Reserve & Umling La',
    metaDescription:
      'Stargazing tours to the Hanle Dark Sky Reserve at 4,500 m, with an astro guide, Tso Moriri and Umling La. 6 to 9 nights, permits, private 4×4 and oxygen included.',
    kicker: 'Hanle Dark Sky Reserve',
    lede:
      'India’s first Dark Sky Reserve, at 4,500 m with almost no light pollution. Three routes that include Hanle, from a dedicated stargazing trip to the whole of Ladakh in nine days.',
    crumbLabel: 'Stargazing',
    body: [
      'Hanle is home to the Indian Astronomical Observatory, and the area around it was declared India’s first Dark Sky Reserve in 2022. On a clear, moonless night the Milky Way is plainly visible to the naked eye, and we plan the night with an astro guide.',
      'The Stargazer’s route is built for it: Tso Moriri, the Changthang plateau, two nights at Hanle and Umling La at 5,798 m. The Grand Ladakh Circuit adds Hanle to Nubra, Turtuk and Pangong. The fixed-departure group route passes through Hanle on its way back to Leh.',
      'September and October usually bring the clearest skies, and the nights around the new moon are the darkest. Tell us how flexible your dates are and we will suggest the best window.',
    ],
    packages: ['6-nights-ladakh-tour', '8-nights-ladakh-tour', 'ladakh-group-tour'],
    faqs: [
      {
        q: 'When is the best time to see the stars at Hanle?',
        a: 'September and October usually bring the clearest skies, and the nights around the new moon are the darkest. Two nights at Hanle give you two chances at a clear sky.',
      },
      {
        q: 'Do I need permits for Hanle?',
        a: 'Yes. Hanle, Tso Moriri and Umling La need an Inner Line Permit (a Protected Area Permit for foreign nationals). We apply, pay and print every permit before you arrive.',
      },
      {
        q: 'Is Hanle too high for a first trip to Ladakh?',
        a: 'Not if it is sequenced properly. The Stargazer’s route spends two nights around Leh and a night at Tso Moriri before Hanle. If you have a cardiac or pulmonary condition, speak to your doctor first and then to us.',
      },
    ],
    styles: ['adventure', 'family'],
    tone: 'nightsky',
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
