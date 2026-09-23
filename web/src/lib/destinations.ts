/**
 * Destination hubs — the "pillar" pages in our hub-and-spoke SEO model.
 * Each hub links down to the packages whose route passes through it (the
 * spokes) and up from the home grid.
 *
 * The four hubs are the same four regions the Ads landers present as "Four
 * Ladakhs, one journey", with the same photographs.
 */

/** Picks the photograph behind cards and heroes. One per lander photo. */
export type Tone = 'valley' | 'monastery' | 'highroad' | 'nightsky';

export type Destination = {
  slug: string;
  name: string;
  /** Used in <title> and H1 — carries the head keyword. */
  seoTitle: string;
  headline: string;
  intro: string;
  /** 2–3 paragraph long-form block. Real substance = ranking substance. */
  body: string[];
  bestTime: string;
  bestMonths: string;
  idealDuration: string;
  startingFrom: number;
  airport: string;
  altitude: string;
  regions: { name: string; note: string }[];
  highlights: string[];
  knowBefore: { label: string; value: string }[];
  faqs: { q: string; a: string }[];
  tone: Tone;
  image: string;
  heroImage: string;
};

const AIRPORT = 'Leh (IXL), Kushok Bakula Rimpochee Airport, about 10 minutes from town';

export const DESTINATIONS: Destination[] = [
  {
    slug: 'leh',
    name: 'Leh & Sham Valley',
    seoTitle: 'Leh Tour Packages',
    headline: 'Your first 48 hours, spent gently',
    intro:
      'Old Town lanes, Shanti Stupa at dusk, and the low-altitude Sham loop that lets your body catch up before the passes begin. Every Ladakh trip starts here, and how you spend these two days decides how the rest of it goes.',
    body: [
      'Leh sits at 3,500 m. You arrive by air in about ninety minutes from Delhi, which is far faster than your body can adjust, and roughly one traveller in four feels mild breathlessness or a headache on the first day. That is why the first afternoon on every itinerary we run is deliberately empty: hydration, a slow walk to the Main Bazaar, an early dinner.',
      'Day two stays low. The Sham Valley loop runs west along the Indus to Magnetic Hill, the Sangam where the Indus meets the Zanskar, and Alchi, whose 11th-century murals are among the oldest surviving Buddhist paintings in the Himalaya. You see a great deal and gain almost no height, which is exactly the point.',
      'Leh itself rewards the time. The 17th-century palace above the Old Town, the lanes below it, Shanti Stupa at sunset over the Stok range, and the cafés and craft shops along Changspa Road. Short trips can be built entirely around Leh and the Indus valley, with no high passes at all.',
    ],
    bestTime: 'April to October; Leh is reachable by air all year',
    bestMonths: 'Apr–Oct (Sep–Oct our pick)',
    idealDuration: '3 to 5 nights',
    startingFrom: 14500,
    airport: AIRPORT,
    altitude: '3,100 m (Sham Valley) to 3,500 m (Leh)',
    regions: [
      { name: 'Leh Old Town', note: 'The palace, the lanes below it and the Main Bazaar' },
      { name: 'Shanti Stupa', note: 'Sunset over the Stok range, a short drive above town' },
      { name: 'Magnetic Hill', note: 'The stretch of road where a car appears to roll uphill' },
      { name: 'Sangam', note: 'Where the green Indus meets the brown Zanskar' },
      { name: 'Shey & Thiksey', note: 'The copper Buddha at Shey and the hilltop gompa at Thiksey' },
      { name: 'Changspa Road', note: 'Cafés, bakeries and craft shops for a free afternoon' },
    ],
    highlights: [
      'A deliberately empty first afternoon, planned as carefully as any sightseeing day',
      'Sunset at Shanti Stupa over the Stok range',
      'Leh Palace and the Old Town lanes on foot',
      'The Indus–Zanskar confluence at the Sangam',
      'Alchi’s 11th-century murals on the Sham Valley loop',
      'Morning prayers at Thiksey',
    ],
    knowBefore: [
      { label: 'Altitude', value: 'Leh is at 3,500 m. Rest on day one, drink plenty of water, and keep the first 48 hours low-effort.' },
      { label: 'Permits', value: 'None for Leh town and the Sham Valley. For Nubra, Pangong and Hanle, Indian guests pay the Ladakh environmental fee and foreign nationals need a Protected Area Permit. We arrange both.' },
      { label: 'Connectivity', value: 'Postpaid mobile connections work in Leh. Prepaid SIMs from other states generally do not.' },
      { label: 'Clothing', value: 'Layers in every month. Days are bright and warm, and nights drop sharply even in summer.' },
    ],
    faqs: [
      {
        q: 'How many days should I spend in Leh before going higher?',
        a: 'Two nights at the least. The first afternoon should be rest, and the second day should stay low: the Sham Valley loop or the monasteries along the Indus. On every route we run, the high passes start on day three or later.',
      },
      {
        q: 'Can I do Ladakh in just three or four days?',
        a: 'Yes, if you stay around Leh. Our 3-night trip covers Leh, the Indus monasteries and the Sham Valley with no high passes, because four days is not enough time to earn them safely. Add a night and you can reach Nubra over Khardung La.',
      },
      {
        q: 'Is Leh open in winter?',
        a: 'Leh is reachable by air all year, and the town and the Indus valley monasteries stay open. From November to March most high roads close, so Nubra, Pangong and Hanle are best planned between May and October.',
      },
    ],
    tone: 'valley',
    image: '/img/ladakh-hero-sm.webp',
    heroImage: '/img/ladakh-hero.webp',
  },

  {
    slug: 'ladakh-monasteries',
    name: 'Monastery Country',
    seoTitle: 'Ladakh Monastery Tours',
    headline: 'The cultural spine of Ladakh, walked slowly',
    intro:
      'Thiksey at sunrise prayers, the 11th-century woodwork at Alchi, and Lamayuru’s moonland ridges. The monasteries of the Indus valley are the reason Ladakh looks the way it does, and they deserve more than a photo stop.',
    body: [
      'Most Ladakh itineraries treat the monasteries as a morning filler between passes. We build a whole trip around them instead: five nights, a monastery guide, and a route along the Indus that stays at comfortable altitudes the whole way.',
      'West of Leh the road passes Likir and its giant seated Maitreya, Alchi, where the temple walls carry some of the oldest Buddhist paintings in the Himalaya, and the ruined royal citadel at Basgo. Further on is Lamayuru, one of the oldest monasteries in Ladakh, set above eroded ridges that people call the Moonland.',
      'East of Leh are the great working monasteries: Thiksey on its hill, where morning prayers start at dawn, Shey with its copper Buddha, and Hemis, the wealthiest monastery in Ladakh and home of the summer Hemis festival. It is the gentlest way to see Ladakh, and one of the richest.',
    ],
    bestTime: 'April to October',
    bestMonths: 'Apr–Oct',
    idealDuration: '5 to 6 nights',
    startingFrom: 14500,
    airport: AIRPORT,
    altitude: '3,100 m (Alchi) to 3,510 m (Lamayuru)',
    regions: [
      { name: 'Thiksey', note: 'Hilltop gompa with morning prayers at dawn' },
      { name: 'Hemis', note: 'The wealthiest monastery in Ladakh, home of the Hemis festival' },
      { name: 'Alchi', note: '11th-century murals and carved woodwork' },
      { name: 'Likir', note: 'A giant seated Maitreya above the valley' },
      { name: 'Basgo', note: 'The ruined citadel of an old Ladakhi capital' },
      { name: 'Lamayuru', note: 'A cliff-edge gompa above the Moonland ridges' },
    ],
    highlights: [
      'Dawn prayers at Thiksey',
      'Alchi’s 11th-century murals with a monastery guide',
      'The Moonland ridges at Lamayuru',
      'The citadel ruins at Basgo',
      'Hemis, and Shey’s copper Buddha',
      'An unhurried route with no high passes',
    ],
    knowBefore: [
      { label: 'Dress', value: 'Covered shoulders and knees inside the monasteries. Remove shoes where asked.' },
      { label: 'Photography', value: 'Allowed in most courtyards, often not inside the prayer halls. Ask first.' },
      { label: 'Entry tickets', value: 'Each monastery charges a small entry fee, paid on the day.' },
      { label: 'Festivals', value: 'The Hemis festival falls in June or July by the Tibetan calendar. Ask us for the year’s dates.' },
    ],
    faqs: [
      {
        q: 'Is a monastery tour suitable for older parents?',
        a: 'It is the gentlest way to see Ladakh. The route follows the Indus valley between about 3,100 m and 3,500 m, with no high passes, and the pace is set around rest. Some monasteries involve stairs, and your guide will tell you in advance which ones.',
      },
      {
        q: 'Which is the oldest monastery we will visit?',
        a: 'Lamayuru is one of the oldest monasteries in Ladakh, and the murals at Alchi date to the 11th century. Your monastery guide explains the history at each stop.',
      },
      {
        q: 'Can we time the trip for the Hemis festival?',
        a: 'Yes. The festival follows the Tibetan lunar calendar and usually falls in June or July. Tell us you want it when you enquire and we will build the dates around it, and book early, because Leh fills up that week.',
      },
    ],
    tone: 'monastery',
    image: '/img/ladakh-monastery-sm.webp',
    heroImage: '/img/ladakh-monastery.webp',
  },

  {
    slug: 'nubra-pangong',
    name: 'Nubra & Pangong',
    seoTitle: 'Nubra Valley & Pangong Tour Packages',
    headline: 'Over Khardung La, and on until the land stops',
    intro:
      'Over Khardung La into the dunes at Hunder, north to Turtuk’s apricot orchards, then east until the land stops and Pangong’s impossible blue begins. This is the Ladakh most people picture, and the part where the order of the days matters most.',
    body: [
      'Khardung La, at 5,359 m, is the road into Nubra. On the far side the valley opens out at about 3,100 m: sand dunes at Hunder with double-humped Bactrian camels, the great Maitreya above Diskit, and villages set among poplars and sea buckthorn. North again is Turtuk, a Balti village closed to visitors until 2010, which is worth a night of its own.',
      'Pangong Tso sits at 4,350 m on the border with Tibet. Most of it lies on the far side of the line; the part in India is still long enough to change colour hour by hour. The single most common altitude mistake in Ladakh is driving there on day two. We never do: on every route we run, Pangong comes after two nights around Leh and a night in Nubra.',
      'The better route to the lake comes east from Nubra along the Shyok river, which avoids a second high-pass crossing in one trip, and you return to Leh over Chang La at 5,360 m. The camps at Nubra and Pangong are seasonal, roughly May to September, and the ones we use have attached bathrooms, heating and hot water.',
    ],
    bestTime: 'May to September, when the camps are open',
    bestMonths: 'May–Sep',
    idealDuration: '5 to 8 nights',
    startingFrom: 18900,
    airport: AIRPORT,
    altitude: '2,900 m (Turtuk) to 5,360 m (Chang La)',
    regions: [
      { name: 'Khardung La', note: 'The pass into Nubra at 5,359 m, crossed with a short stop' },
      { name: 'Hunder', note: 'Sand dunes and Bactrian camels on the valley floor' },
      { name: 'Diskit', note: 'The monastery and its great Maitreya above the valley' },
      { name: 'Turtuk', note: 'A Balti village of apricot orchards, open to visitors since 2010' },
      { name: 'Shyok river road', note: 'The quieter way from Nubra to Pangong' },
      { name: 'Pangong Tso', note: 'The lake at 4,350 m, with camps on the shoreline' },
    ],
    highlights: [
      'Crossing Khardung La at 5,359 m',
      'Bactrian camels at golden hour in the Hunder dunes',
      'A night in Turtuk, among the apricot orchards',
      'The Shyok river road east to Pangong',
      'Sunrise on Pangong Tso from a shoreline camp',
      'Back over Chang La, with a stop at Thiksey on the way down',
    ],
    knowBefore: [
      { label: 'Permits', value: 'Indian guests pay the Ladakh environmental fee for Nubra, Turtuk and Pangong. Foreign nationals need a Protected Area Permit for the same areas. We pay and print these before you arrive.' },
      { label: 'Altitude', value: 'Pangong is at 4,350 m. On all our routes it comes after two nights around Leh and a night in Nubra, which do the acclimatisation work.' },
      { label: 'Camps', value: 'Seasonal, roughly May to September. Ours have attached bathrooms, heating and hot water.' },
      { label: 'Oxygen', value: 'Every vehicle carries a cylinder, an oximeter and a first-aid kit, and drivers are trained to recognise AMS.' },
    ],
    faqs: [
      {
        q: 'Why do you not go to Pangong on the second day?',
        a: 'Because driving from Leh to a 4,350 m lake over a 5,360 m pass on day two is the most common altitude mistake in Ladakh. A meaningful number of people who do it spend the night at the lake with a headache and no sleep. We put Pangong after two nights around Leh and a night in Nubra.',
      },
      {
        q: 'Is Turtuk worth adding?',
        a: 'Yes, as an overnight rather than a day trip. It is seven hours from Leh via Khardung La and Nubra, and the Balti culture, food and apricot orchards are unlike anywhere else in Ladakh. The 7-night and 8-night routes include it.',
      },
      {
        q: 'What are the camps at Nubra and Pangong like?',
        a: 'We use deluxe or Swiss camps with attached bathrooms, heating and hot water, which is the only sensible option at that altitude. Honeymoon trips use a luxury tented camp in Nubra.',
      },
    ],
    tone: 'highroad',
    image: '/img/ladakh-hanle-sm.webp',
    heroImage: '/img/ladakh-hanle.webp',
  },

  {
    slug: 'hanle',
    name: 'Hanle Dark Sky',
    seoTitle: 'Hanle & Tso Moriri Tour Packages',
    headline: 'Where the Milky Way casts a shadow',
    intro:
      'India’s first Dark Sky Reserve, at 4,500 m with almost no light pollution. Add Tso Moriri, the Changthang grasslands and Umling La, the highest motorable road on earth, and this is the Ladakh most travellers never reach.',
    body: [
      'Hanle is a small village on the Changthang plateau, south-east of Leh, and home to the Indian Astronomical Observatory. The area around it was declared India’s first Dark Sky Reserve in 2022. On a clear, moonless night the Milky Way is bright enough to throw shadows, and we plan the stay with an astro guide so you know what you are looking at.',
      'Getting there is half of it. The road follows the Indus south-east past the Chumathang hot springs, then climbs onto the plateau to Tso Moriri at 4,522 m, a quieter and higher lake than Pangong, with the village of Korzok on its shore. The grasslands between Tso Moriri, Tso Kar and Hanle are nomad country, and it is common to see kiang and black-necked cranes from the road.',
      'Umling La, at 5,798 m, is reached from Hanle and is the highest motorable road on earth. Everything here is high, so this part of Ladakh comes after acclimatisation, never before it. Two nights at Hanle give you two chances at a clear sky.',
    ],
    bestTime: 'May to October; September and October for the clearest skies',
    bestMonths: 'May–Oct (Sep–Oct our pick)',
    idealDuration: '6 to 8 nights',
    startingFrom: 26500,
    airport: AIRPORT,
    altitude: '4,500 m (Hanle) to 5,798 m (Umling La)',
    regions: [
      { name: 'Hanle', note: 'The observatory and the Dark Sky Reserve' },
      { name: 'Umling La', note: 'The highest motorable road on earth, at 5,798 m' },
      { name: 'Tso Moriri', note: 'A high, quiet lake at 4,522 m, with Korzok on its shore' },
      { name: 'Tso Kar', note: 'A salt lake on the Changthang grasslands' },
      { name: 'Chumathang', note: 'Hot springs on the Indus, on the way south-east' },
      { name: 'Nyoma', note: 'The road back to Leh along the Indus' },
    ],
    highlights: [
      'The Milky Way over the Hanle Dark Sky Reserve, with an astro guide',
      'The Indian Astronomical Observatory by day',
      'Umling La at 5,798 m in the morning light',
      'A night on the shore of Tso Moriri',
      'Kiang and black-necked cranes on the Changthang plateau',
      'The Chumathang hot springs on the Indus',
    ],
    knowBefore: [
      { label: 'Permits', value: 'Indian guests pay the Ladakh environmental fee for Hanle, Tso Moriri and Umling La. Foreign nationals need a Protected Area Permit. We pay and print these before you arrive.' },
      { label: 'Altitude', value: 'Hanle is at 4,500 m and Umling La at 5,798 m. This region always comes after at least two nights around Leh.' },
      { label: 'Light', value: 'The reserve depends on darkness. Use red torches at night and keep phone screens dim.' },
      { label: 'Moon', value: 'Skies are darkest around the new moon. Tell us your flexibility and we will suggest dates.' },
    ],
    faqs: [
      {
        q: 'When is the best time to see the stars at Hanle?',
        a: 'September and October usually bring the clearest skies of the year, and the nights around the new moon are the darkest. July and August can be cloudier. Two nights at Hanle give you two chances at a clear sky.',
      },
      {
        q: 'Do I need a telescope or special camera?',
        a: 'No. The Milky Way is plainly visible to the naked eye. Our astro guide brings equipment for the night session, and a phone on a small tripod with night mode will capture more than you expect.',
      },
      {
        q: 'Is Hanle too high for a first trip to Ladakh?',
        a: 'Not if it is sequenced properly. Our Stargazer’s route spends two nights around Leh and a night at Tso Moriri before Hanle, so your body has adjusted by the time you arrive. If you have a cardiac or pulmonary condition, speak to your doctor first and then to us.',
      },
    ],
    tone: 'nightsky',
    image: '/img/hanle-night-sky-sm.webp',
    heroImage: '/img/hanle-night-sky.webp',
  },
];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

const PHOTO: Record<Tone, string> = {
  valley: 'ladakh-hero',
  monastery: 'ladakh-monastery',
  highroad: 'ladakh-hanle',
  nightsky: 'hanle-night-sky',
};

/** Card backgrounds: the small photograph under a navy scrim for legible text. */
export const TONE_BG = Object.fromEntries(
  (Object.keys(PHOTO) as Tone[]).map((t) => [
    t,
    `linear-gradient(180deg, rgba(7,15,31,0.10) 0%, rgba(7,15,31,0.85) 100%), url("/img/${PHOTO[t]}-sm.webp") center / cover`,
  ]),
) as Record<Tone, string>;

/** High-contrast hero backdrop: the full photograph under a heavier navy scrim. */
export const TONE_HERO = Object.fromEntries(
  (Object.keys(PHOTO) as Tone[]).map((t) => [
    t,
    `linear-gradient(180deg, rgba(7,15,31,0.65) 0%, rgba(7,15,31,0.92) 100%), url("/img/${PHOTO[t]}.webp") center / cover`,
  ]),
) as Record<Tone, string>;
