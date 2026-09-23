/**
 * Travel-style landing pages. These capture intent-stage searches
 * ("ladakh honeymoon package", "ladakh group tour") that destination hubs
 * and individual packages both miss.
 */

export type TravelStyle = {
  slug: string;
  name: string;
  seoTitle: string;
  headline: string;
  intro: string;
  body: string[];
  promises: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
  /** Tailwind-free inline gradient for the hero. */
  hero: string;
  image: string;

  // ─────────────────────────────────────────────────────────────────
  // Optional depth. Added for pillar pages that carry real search
  // demand; the lighter style pages leave these undefined and
  // render exactly as before.
  // ─────────────────────────────────────────────────────────────────

  /** Overrides the truncated-intro meta description. Written for the click. */
  metaDescription?: string;
  /**
   * The direct answer to the primary query, rendered above everything else.
   * The standard requires the query be answered in the first 100 words.
   */
  answer?: { heading: string; body: string; figure: string; figureNote: string };
  /**
   * Decodes a confusing price landscape. On honeymoon queries the visible
   * range across page one runs from four figures to six, and no competitor
   * explains why — that gap is the page's main information gain.
   */
  priceDecoder?: {
    heading: string;
    intro: string;
    rows: { claim: string; reality: string }[];
    conclusion: string;
  };
  /**
   * Separates the inclusions every operator advertises identically from the
   * things that actually differ between quotes.
   */
  commodity?: {
    heading: string;
    intro: string;
    same: string[];
    different: { label: string; body: string }[];
  };
  /** Month-by-month verdict. `avoid` is used honestly, not decoratively. */
  months?: {
    month: string;
    verdict: 'best' | 'good' | 'mixed' | 'avoid';
    note: string;
  }[];
  /** The explicit negative recommendation the standard requires. */
  negative?: { heading: string; body: string };
  /** Named author. Trust is the load-bearing letter in E-E-A-T. */
  author?: { name: string; role: string };
  /** Only bump when the page has genuinely been re-verified. */
  updatedAt?: string;
};

export const TRAVEL_STYLES: TravelStyle[] = [
  {
    slug: 'honeymoon',
    image: '/img/hanle-night-sky-sm.webp',
    name: 'Honeymoon',
    seoTitle: 'Ladakh Honeymoon Packages',
    metaDescription:
      'Ladakh honeymoon packages with a private cab, 4★ hotels in Leh, a luxury camp in Nubra and a private candlelight dinner in the dunes. 5N/6D from ₹34,900 per person.',
    headline: 'A honeymoon where the silence is the luxury',
    intro:
      'No shared vehicle, no group schedule, no rushing. A private car, 4★ stays, a luxury camp under the Nubra dunes and afternoons with nothing in them.',
    body: [
      'Honeymoon trips fail when they are built like sightseeing tours with rose petals added. Ours is slower on purpose: unscheduled afternoons instead of an hour-by-hour plan, and the same private car and driver for the two of you from the airport to the last morning.',
      'The altitude rules do not change because it is a honeymoon. The first afternoon in Leh is free, the second day stays low, and Pangong comes after Nubra, never on day two. It is the difference between a lakeside night you remember and one spent with a headache.',
      'What does change is where you sleep and how the evenings go: a 4★ hotel in Leh with the room decorated for your arrival, a luxury tented camp among the Hunder dunes, and one candlelight dinner set up privately in the dunes, weather permitting.',
    ],
    promises: [
      { title: 'A private cab, never shared', body: 'One car and one driver for the two of you, for the whole trip.' },
      { title: 'Better rooms', body: 'A 4★ hotel in Leh and a luxury tented camp in Nubra.' },
      { title: 'One dinner for two', body: 'A private candlelight dinner in the Nubra dunes, weather permitting.' },
      { title: 'Empty afternoons', body: 'Unscheduled time built in, instead of every hour filled.' },
    ],
    months: [
      { month: 'January – March', verdict: 'avoid', note: 'Leh is open by air, but the high roads to Nubra and Pangong are closed and nights are well below freezing.' },
      { month: 'April', verdict: 'mixed', note: 'Quiet and cold. Some camps have not opened yet, so the route may need changing.' },
      { month: 'May – June', verdict: 'best', note: 'The busiest and most photogenic months, with snow still lining the passes.' },
      { month: 'July – August', verdict: 'good', note: 'The warmest weeks, but rain elsewhere can cause roadblocks. Build in a spare day.' },
      { month: 'September', verdict: 'best', note: 'Our honest pick. Clear skies, thin crowds and golden poplars.' },
      { month: 'October', verdict: 'good', note: 'Crisp and beautiful. Camps start closing toward the end of the month.' },
      { month: 'November – December', verdict: 'avoid', note: 'Most high roads close. Not the trip you are imagining.' },
    ],
    negative: {
      heading: 'When we would not book it',
      body: 'If either of you has a cardiac or pulmonary condition, speak to your doctor before booking anything at this altitude. And if you only have four days, a Ladakh honeymoon with Nubra and Pangong is too rushed to be safe; we would rather plan a gentler Leh-only trip, or suggest you wait until you have the full week.',
    },
    faqs: [
      {
        q: 'What actually makes the honeymoon package different?',
        a: 'A private cab for the two of you rather than a shared vehicle, 4★ hotels in Leh and a luxury tented camp in Nubra rather than standard camps, a room decorated on arrival, and one candlelight dinner set up privately at the dunes in Nubra, weather permitting. The pace is also slower: we build in unscheduled afternoons instead of filling every hour.',
      },
      {
        q: 'Can we add Hanle or Turtuk to the honeymoon?',
        a: 'Yes. Every route is a starting point. Hanle adds two nights and the darkest sky in India; Turtuk adds a night among the apricot orchards. Tell us how many days you have and we will reshape it.',
      },
      {
        q: 'How does payment work?',
        a: 'A 25% deposit confirms your dates and locks your stays; the balance is due seven days before arrival. We accept UPI, bank transfer and all major cards, and offer no-cost EMI on cards for three, six and nine months.',
      },
    ],
    hero: 'linear-gradient(180deg, rgba(7,15,31,0.42), rgba(7,15,31,0.84)), url("/img/hanle-night-sky-sm.webp") center / cover',
  },

  {
    slug: 'family',
    image: '/img/ladakh-hero-sm.webp',
    name: 'Family',
    seoTitle: 'Ladakh Family Tour Packages',
    headline: 'Built around the slowest person in the group',
    intro:
      'Gentle first days, rooms that actually fit, and an itinerary sequenced by altitude, so it survives a seven-year-old and a seventy-year-old on the same trip.',
    body: [
      'Family trips to Ladakh break on the altitude, not the sightseeing. We keep the first 48 hours low-effort for everyone, put the high passes on day three or later, and never drive to Pangong early in a trip. If someone struggles, we change the plan the same day.',
      'Every vehicle carries an oxygen cylinder, an oximeter and a stocked first-aid kit, and our drivers are trained to recognise AMS. You travel in a private Innova Crysta or Xylo with a Ladakhi driver, never a shared cab.',
      'The shorter routes around Leh and the Indus monasteries suit younger children and older parents best. Longer circuits work well for families with teenagers, with a free day in Leh built in.',
    ],
    promises: [
      { title: 'Altitude first', body: 'An empty first afternoon and no high passes before day three.' },
      { title: 'Oxygen in every vehicle', body: 'A cylinder, an oximeter and a first-aid kit, always.' },
      { title: 'Your own car', body: 'A private 4×4 with a Ladakhi driver, never shared.' },
      { title: 'Changes on the day', body: 'If someone is struggling, the plan changes. No argument, no extra charge.' },
    ],
    faqs: [
      {
        q: 'Is Ladakh suitable for children and older parents?',
        a: 'Yes, with the right route. Leh is at 3,500 m, so we keep the first days gentle for everyone. The Leh and monastery routes stay low with no high passes. If anyone in the family has a cardiac or pulmonary condition, speak to your doctor first and then to us.',
      },
      {
        q: 'How bad is the altitude, honestly?',
        a: 'Roughly one traveller in four feels mild breathlessness or a headache on day one in Leh. That is why our first 48 hours are deliberately low-effort and why we never drive to Pangong early in a trip. Every vehicle carries oxygen and an oximeter.',
      },
      {
        q: 'Can the itinerary be changed around us?',
        a: 'Every route is a starting point. Travel with a toddler or a ninety-year-old, swap camps for hotels, drop Pangong or add a rest day, and we build around it. Roughly two-thirds of our bookings end up as fully custom itineraries.',
      },
    ],
    hero: 'linear-gradient(180deg, rgba(7,15,31,0.42), rgba(7,15,31,0.84)), url("/img/ladakh-hero-sm.webp") center / cover',
  },

  {
    slug: 'adventure',
    image: '/img/ladakh-hanle-sm.webp',
    name: 'Adventure',
    seoTitle: 'Ladakh Adventure Tours & Bike Trips',
    headline: 'High passes, long roads and the highest motorable road on earth',
    intro:
      'Khardung La, the Shyok river road, Manali to Leh over five passes, and Umling La at 5,798 m. Trips for people whose idea of a holiday involves altitude and a little discomfort.',
    body: [
      'Adventure in Ladakh is mostly a logistics problem disguised as a fitness problem. The mountain does not care how fit you are if the pass is shut, the permit is not printed, or you gained two thousand metres in a day.',
      'We handle the boring parts: the Ladakh environmental fee for Indian guests and Protected Area Permits for foreign nationals, paid and printed before you land, oxygen in every vehicle, drivers who have run these passes for years, and an acclimatisation profile we do not negotiate on. What is left is the part you came for.',
      'For riders, the Manali to Leh bike trip runs on Royal Enfield Himalayans with fuel and a mechanic included, and a support vehicle carrying luggage, spares and oxygen behind the group every day.',
    ],
    promises: [
      { title: 'Permits, handled', body: 'Nubra, Pangong, Hanle, Tso Moriri and Umling La, printed before you arrive.' },
      { title: 'Oxygen as standard', body: 'A cylinder, an oximeter and a first-aid kit in every vehicle.' },
      { title: 'Drivers who know the road', body: 'Ladakhi drivers who run these passes every week of the season.' },
      { title: 'A backup vehicle for riders', body: 'Luggage, spares, fuel, oxygen and a mechanic behind you every day.' },
    ],
    faqs: [
      {
        q: 'How fit do I need to be for Ladakh?',
        a: 'Ordinary fitness is enough for the road circuits; they are drives, not treks. What matters far more is acclimatisation discipline and no cardiac or severe respiratory history. If you have either, see a doctor before booking.',
      },
      {
        q: 'Do I need a special licence or previous Himalayan experience for the bike trip?',
        a: 'A valid motorcycle licence is mandatory and we check it at handover. Previous high-altitude riding is not required, but you should be comfortable riding 150–250 km a day on mixed surfaces. If you are unsure, ride in the backup vehicle for the first two days and take over at Leh.',
      },
      {
        q: 'Is the Manali–Leh highway safe?',
        a: 'It is a well-travelled route from roughly late May to mid-October, and our drivers run it weekly through the season. It crosses five passes above 4,000 m, so we break the journey at Jispa and Sarchu rather than pushing through in one day.',
      },
    ],
    hero: 'linear-gradient(180deg, rgba(7,15,31,0.42), rgba(7,15,31,0.84)), url("/img/ladakh-hanle-sm.webp") center / cover',
  },

  {
    slug: 'culture',
    image: '/img/ladakh-monastery-sm.webp',
    name: 'Monasteries & Culture',
    seoTitle: 'Ladakh Monastery & Culture Tours',
    headline: 'The cultural spine of Ladakh, walked slowly',
    intro:
      'Thiksey at dawn prayers, Alchi’s 11th-century murals, Lamayuru above the Moonland and Hemis, the wealthiest monastery in Ladakh. Trips for people who came for the place, not only the view.',
    body: [
      'The monasteries of the Indus valley are why Ladakh looks and feels the way it does. We give them the time they need: a monastery guide, unhurried mornings, and a route that stays along the valley at comfortable altitudes.',
      'West of Leh are Likir, Alchi, Basgo and Lamayuru. East are Thiksey, Shey and Hemis. Further north, Turtuk offers something else again: a Balti village with its own language, food and architecture, open to visitors only since 2010.',
      'If you can, time the trip for a monastery festival. The Hemis festival falls in June or July by the Tibetan calendar, and we will build your dates around it.',
    ],
    promises: [
      { title: 'A monastery guide', body: 'Someone who can explain what you are looking at, not just open the door.' },
      { title: 'Gentle altitude', body: 'The Indus valley route stays between about 3,100 m and 3,500 m.' },
      { title: 'Festival dates', body: 'Tell us you want a festival and we plan the trip around it.' },
      { title: 'Time at each stop', body: 'Two or three monasteries a day, not six.' },
    ],
    faqs: [
      {
        q: 'Which monasteries does the culture route cover?',
        a: 'Thiksey, Shey and Hemis east of Leh, and Likir, Alchi, Basgo and Lamayuru to the west, with Leh Old Town and Shanti Stupa in between. We can add Diskit in Nubra or a night in Turtuk.',
      },
      {
        q: 'Is it suitable for older travellers?',
        a: 'It is the gentlest way to see Ladakh, with no high passes on the core route. Some monasteries involve stairs, and your guide will tell you in advance which ones.',
      },
      {
        q: 'What should we wear inside the monasteries?',
        a: 'Covered shoulders and knees, and shoes off where asked. Photography is usually fine in courtyards and often not allowed inside prayer halls, so ask first.',
      },
    ],
    hero: 'linear-gradient(180deg, rgba(7,15,31,0.42), rgba(7,15,31,0.84)), url("/img/ladakh-monastery-sm.webp") center / cover',
  },

  {
    slug: 'group',
    image: '/img/ladakh-hanle-sm.webp',
    name: 'Group Tours',
    seoTitle: 'Ladakh Group Tours & Fixed Departures',
    headline: 'Arrive alone. Leave with fourteen friends.',
    intro:
      'Twice-monthly fixed departures of 8 to 16 travellers with a trip captain from our Leh team. Most people who book these come on their own, which is rather the point.',
    body: [
      'Fixed departures run from mid-May to late September, usually leaving on the 5th and 20th of each month. The route covers Leh, the Sham Valley, Nubra, Pangong and Hanle, with the same altitude rules as every private trip we run.',
      'Solo travellers are the majority of our group bookings. You are matched into twin-sharing with someone of the same gender, or you can pay a single-occupancy supplement for your own room.',
      'If your dates fall between departures, or you are a group of six or more, we run the same itinerary privately at close to the same per-person cost.',
    ],
    promises: [
      { title: 'A trip captain', body: 'Someone from our Leh team travels with the group throughout.' },
      { title: '8 to 16 people', body: 'Big enough to be sociable, small enough to stay flexible.' },
      { title: 'Solo-friendly', body: 'Twin-sharing matched by gender, or a single room on request.' },
      { title: 'Private at group prices', body: 'Six or more of you? We run the same route privately.' },
    ],
    faqs: [
      {
        q: 'How big are the groups, and can I join on my own?',
        a: 'Fixed departures run at 8 to 16 travellers with a trip captain from our Leh team. Solo travellers are welcome and are the majority of our group bookings.',
      },
      {
        q: 'When do the fixed departures run?',
        a: 'Twice monthly from mid-May to late September, usually departing on the 5th and 20th. Dates for the coming season are confirmed in January.',
      },
      {
        q: 'Can we book a private group instead?',
        a: 'Yes. If you are six or more people, or your dates fall between departures, we run the same itinerary privately at close to the same per-person cost.',
      },
    ],
    hero: 'linear-gradient(180deg, rgba(7,15,31,0.42), rgba(7,15,31,0.84)), url("/img/ladakh-hanle-sm.webp") center / cover',
  },
];

export function getTravelStyle(slug: string): TravelStyle | undefined {
  return TRAVEL_STYLES.find((s) => s.slug === slug);
}
