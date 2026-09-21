/**
 * Origin-city landing pages — "Kashmir tour packages from {city}".
 *
 * WHY THESE EXIST
 * ---------------
 * The all-time Google Ads search-terms report (54,458 unique queries) shows
 * the "package from {city}" pattern is the single highest-converting template
 * we have: 7.29% CTR against a 2.11% account average, and 65 conversions.
 * Every city below is backed by real query volume from that report.
 *
 * THE HONESTY RULE FOR THIS FILE
 * ------------------------------
 * `flight` and `train` are deliberately nullable and ship as `null`.
 * Fares move weekly; they are quoted live rather than fabricated statically.
 */

export type FlightFacts = {
  airlines: string[];
  nonstop: boolean;
  duration: string;
  fareBand: [number, number];
  connectsVia?: string;
  verifiedOn: string;
};

export type TrainFacts = {
  railhead: string;
  services: string[];
  duration: string;
  fareBand: [number, number];
  onwardLeg: string;
  verifiedOn: string;
};

export type OriginCity = {
  slug: string;
  name: string;
  state: string;
  demand: { queries: number; impressions: number; conversions: number };
  packages: string[];
  summary: string;
  body: string[];
  planningNote: string;
  flight: FlightFacts | null;
  train: TrainFacts | null;
  faqs: { q: string; a: string }[];
};

export const ORIGIN_CITIES: OriginCity[] = [
  {
    slug: "delhi",
    name: "Delhi",
    state: "Delhi NCR",
    demand: { queries: 1296, impressions: 23233, conversions: 41.5 },
    packages: ["classic-kashmir-4-nights", "complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "kashmir-snow-winter-5-nights"],
    summary: "Delhi is the easiest Indian city to reach Kashmir from \u2014 which is exactly why the trip is worth planning properly rather than booking the first fare you see.",
    body: [
      "More of our travellers start from Delhi than from anywhere else, and it shows in how the itineraries are built. A Delhi departure usually puts you in Srinagar before lunch, which means Day 1 is a real day \u2014 a Dal Lake shikara in the afternoon light rather than a hotel check-in and a lost evening. Almost every other origin city loses that half-day, and the itineraries below are written to use it.",
      "The flexibility cuts the other way too. Because the Delhi corridor carries the most traffic, it also has the widest fare spread across the year: the same seat can differ by a factor of three between a February weekday and the last week of December. If your dates can move even two or three days, tell us before you book flights \u2014 we will usually find a materially cheaper window without changing the trip itself.",
      "Delhi is also the only origin where the overland option is genuinely practical rather than theoretical. Travellers who want to break the journey at Katra for Vaishno Devi tend to start here, and the 7-night Vaishno Devi and Kashmir package exists because enough Delhi families asked for exactly that combination.",
    ],
    planningNote: "Book the outbound for the earliest slot you can tolerate. A morning arrival in Srinagar buys you a full first afternoon; an evening arrival costs you a night you have already paid for.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "Should I book flights myself or through you?",
        a: "Either works. Most Delhi travellers book their own flights because they are chasing a fare alert, and that is genuinely sensible on this route. Send us the arrival and departure times before you ticket and we will tell you whether they fit the itinerary \u2014 an arrival after 3pm changes Day 1, and we would rather say so before you pay than after.",
      },
      {
        q: "Is the package price different because I am starting from Delhi?",
        a: "The land package is the same price from every city \u2014 it starts when we receive you at Srinagar airport. What changes is the airfare on top, which is why we quote the two separately instead of bundling them into one number that hides the split.",
      },
      {
        q: "Can we travel Delhi to Kashmir by road or rail instead of flying?",
        a: "Both work. By road it is a long two-day drive with an overnight stop, usually at Jammu or Katra, and it is worth it mainly if the journey is part of the point. By rail, the valley line opened to Srinagar in 2026, so you can now take a train to Jammu Tawi or Katra and continue into Srinagar on the Vande Bharat. We will arrange either.",
      },
      {
        q: "When is the cheapest time to fly from Delhi to Srinagar?",
        a: "Broadly, the shoulder weeks either side of peak season, and midweek rather than weekends. We do not publish a fare table here because it would be out of date within a week \u2014 ask us for the current picture on your dates and we will give you the real numbers.",
      },
    ],
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    demand: { queries: 390, impressions: 4899, conversions: 14.0 },
    packages: ["classic-kashmir-4-nights", "complete-kashmir-6-nights", "kashmir-honeymoon-5-nights"],
    summary: "From Mumbai the flight is long enough that arrival timing decides your itinerary \u2014 so the itinerary should be built around the flight, not the other way round.",
    body: [
      "Mumbai travellers consistently ask for one more night than Delhi travellers do, and they are right to. The journey is long enough that a 4-night trip can feel like it is over before it starts, so the 6-night Complete Kashmir is the one we most often end up recommending here \u2014 it absorbs a travel-heavy first and last day without eating into the parts you came for.",
      "The other thing that separates a Mumbai booking is the packing conversation. Travellers flying from a city that never drops below 20\u00b0C routinely underestimate a Kashmir winter, and arrive with a jacket that is not equal to Gulmarg in January. We send a real packing list with every winter booking from the coastal cities, and we would rather over-explain it than have you spend the first morning buying gloves.",
      "Honeymoon bookings run high from Mumbai \u2014 it is one of our strongest couple markets, and the 5-night honeymoon itinerary was shaped substantially by what Mumbai couples asked us to change about the standard trip.",
    ],
    planningNote: "Give yourself six nights if you can. The travel day at each end is real, and a four-night trip from Mumbai spends half its length in transit.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "Is there a direct flight from Mumbai to Srinagar?",
        a: "This varies by season and by airline schedule, and it has changed more than once in recent years. Rather than print something here that may be wrong by the time you read it, ask us for the current options on your dates \u2014 we check live before quoting.",
      },
      {
        q: "How many nights should we take from Mumbai?",
        a: "Six, if the leave allows. Four nights works, but with a long flight at each end you will feel it. The extra two nights are the difference between seeing Kashmir and passing through it.",
      },
      {
        q: "What should we pack coming from Mumbai in winter?",
        a: "More than you think. Gulmarg in January is a different climate from anything Mumbai offers, and a light jacket will not do. We send a specific list on confirmation \u2014 follow it, because layers bought locally at short notice cost more and fit worse.",
      },
      {
        q: "Do you handle group bookings from Mumbai?",
        a: "Regularly. Groups change the maths on vehicles and hotel rooms in your favour, so tell us the headcount early \u2014 a 12-person group is often cheaper per head than a couple, and we can only build that in if we know before we quote.",
      },
    ],
  },
  {
    slug: "bangalore",
    name: "Bangalore",
    state: "Karnataka",
    demand: { queries: 235, impressions: 3556, conversions: 12.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Bangalore is our strongest South Indian market, and the trips that work from here are the longer ones \u2014 the distance rewards a slower itinerary.",
    body: [
      "Bangalore converts better than its query volume suggests, which tells us something about who is searching: these are considered trips, planned well ahead, usually for a specific occasion. The itineraries that suit them are the fuller ones. A traveller crossing most of the subcontinent does not want to spend two of six days in an airport.",
      "Connection risk is the practical thing to get right from here. Where an itinerary routes through another metro, a tight layover that works on paper can fail in weather season, and a missed connection costs a night of a trip you have flown a long way for. We build the first day with enough slack that a delayed arrival does not collapse the plan, and we will say plainly if the timings you have chosen are too tight.",
      "Bangalore honeymoon enquiries are strong enough that the couple itineraries get requested here almost as often as the standard ones. If that is the trip, start from the honeymoon package rather than adding romance to a general itinerary \u2014 the difference is in the room categories and the private transfers, and it is easier to build in from the start.",
    ],
    planningNote: "Leave real margin on the outbound connection. A two-hour layover in a monsoon month is not a two-hour layover; if the connection fails, you lose a night of a long-planned trip.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How long does it take to get from Bangalore to Srinagar?",
        a: "Longer than most people plan for once connections are counted. The honest answer depends on which routing you take, and the fastest option is not always the cheapest by a wide margin. Send us your dates and we will lay out the real choices side by side.",
      },
      {
        q: "Is a 4-night Kashmir trip worth it from Bangalore?",
        a: "Honestly, not usually. By the time you account for travel at both ends you are left with roughly three usable days. If four nights is genuinely all you have, we will build the tightest possible version \u2014 but six is the itinerary we would recommend.",
      },
      {
        q: "Do you arrange the flights as well?",
        a: "We can, and from the South it is often worth letting us, because we are optimising for the itinerary rather than for the cheapest fare in isolation. A flight that saves three thousand rupees and costs you a day is not a saving.",
      },
      {
        q: "What is the best month to travel from Bangalore?",
        a: "It depends entirely on what you want. Snow means December to February. Tulips mean a narrow window in April. Green valleys and comfortable walking weather mean May to early July. Tell us which of those you are picturing and we will name the month.",
      },
    ],
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    state: "Telangana",
    demand: { queries: 153, impressions: 1317, conversions: 6.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Hyderabad shows the highest commercial intent of any South Indian origin in our data \u2014 small volume, but travellers who are ready to book.",
    body: [
      "Hyderabad is a small market by impressions and a strong one by behaviour: the transactional click-through rate from here is among the highest we record anywhere, and honeymoon enquiries make up an unusually large share of it. People searching from Hyderabad are generally not browsing, they are pricing a trip they have already decided to take.",
      "That shapes what this page should do, which is answer the money question directly rather than sell the destination. The package prices below are per person on twin-sharing with GST included, and the land cost is identical whichever city you start from. The variable is the airfare, which we quote separately and honestly rather than folding into a headline number.",
      "As with the other southern cities, the itinerary length matters more than it does from Delhi. Six nights is the comfortable trip. Five works well for couples on the honeymoon itinerary because the pace is deliberately slower and there is less ground to cover.",
    ],
    planningNote: "If this is a honeymoon, start from the honeymoon itinerary rather than adding extras to a standard package. The room categories and private transfers are structural, not add-ons.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "What does a Kashmir trip from Hyderabad actually cost?",
        a: "The land package starts at \u20b918,500 per person for 4 nights and \u20b927,900 for 6 nights, twin-sharing, GST included. Flights are on top and vary widely by season and how far ahead you book. We quote both separately so you can see exactly where the money goes.",
      },
      {
        q: "Do you get many Hyderabad travellers?",
        a: "Yes, and a high proportion of them are honeymoon couples. It is one of our better-converting cities, which means the itineraries have been iterated on real feedback from travellers who started where you are starting.",
      },
      {
        q: "Is Kashmir safe for a family trip?",
        a: "Tourist Kashmir has run normally for years, and we operate there daily \u2014 our office is in Srinagar, not a call centre elsewhere. We will always tell you the current on-ground picture straight when you ask, including if it is not what you want to hear.",
      },
      {
        q: "How far in advance should we book from Hyderabad?",
        a: "For peak season \u2014 December snow, April tulips, May and June holidays \u2014 six to eight weeks is comfortable, mostly because hotel inventory in Gulmarg and Pahalgam tightens well before flights do. Off-peak, three weeks is fine.",
      },
    ],
  },
  {
    slug: "chennai",
    name: "Chennai",
    state: "Tamil Nadu",
    demand: { queries: 125, impressions: 833, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Chennai travellers face the largest temperature shift in India when flying to Kashmir \u2014 making packing and connection buffer the two things that make or break the trip.",
    body: [
      "Flying from coastal Tamil Nadu to the Pir Panjal mountains is a 30\u00b0C temperature shock in winter and a 15\u00b0C shift even in high summer. Chennai travellers routinely find that standard winter jackets bought locally are inadequate for Gulmarg or Sonmarg. We send an exact layered packing guide with thermal innerwear specifications for every confirmed guest.",
      "Most Chennai departures connect through Delhi or Mumbai. A 1-stop journey requires at least a 2.5-hour layover to prevent winter fog delays in North India from cascading into a missed connection. We structure Day 1 with an easy evening shikara so that a slightly delayed afternoon arrival never compromises your sightseeing.",
      "Family groups and vegetarian travellers from Chennai also frequently ask about food in Kashmir. Srinagar and Pahalgam have dedicated pure-vegetarian and South Indian dining options, and we assign hotels with vetted kitchen standards to ensure comfort throughout the circuit.",
    ],
    planningNote: "Avoid sub-90-minute layovers in Delhi during December and January. North Indian winter fog can delay incoming Chennai flights, so build a 2.5-hour transit buffer.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How many hours is the journey from Chennai to Srinagar?",
        a: "With a smooth 1-stop connection via Delhi or Mumbai, total travel time is typically 5.5 to 7.5 hours. Direct seasonal charters operate occasionally, but 1-stop scheduled flights remain the standard year-round.",
      },
      {
        q: "Are pure vegetarian and South Indian food options available in Kashmir?",
        a: "Yes. Srinagar, Gulmarg, and Pahalgam all have reputable pure-vegetarian restaurants. We select hotels that cater cleanly to vegetarian dietary requirements.",
      },
      {
        q: "What is the recommended package duration from Chennai?",
        a: "We strongly recommend our 6-Night Complete Kashmir package. With transit consuming half of Day 1 and Day 7, 6 nights gives you 5 full, relaxed days across Srinagar, Gulmarg, and Pahalgam.",
      },
      {
        q: "How severe is the winter cold for travellers from Chennai?",
        a: "Daytime winter temperatures range from 2\u00b0C to 8\u00b0C, dropping below freezing at night. Thermal base layers, fleece mid-layers, and windproof outer jackets are essential. Heavy snow boots can be rented on-site at Gulmarg.",
      },
    ],
  },
  {
    slug: "kolkata",
    name: "Kolkata",
    state: "West Bengal",
    demand: { queries: 295, impressions: 3737, conversions: 6.0 },
    packages: ["complete-kashmir-6-nights", "classic-kashmir-4-nights", "vaishno-devi-kashmir-7-nights"],
    summary: "Kolkata travellers ask about trains more than any other city we serve \u2014 and the answer changed in 2026, because the railway now runs all the way into Srinagar.",
    body: [
      "The distinguishing feature of Kolkata demand in our data is how much of it is rail-shaped. A large share of the searches from here and from Howrah are about trains rather than flights \u2014 and most Kashmir travel pages still answer that question with information that is now out of date.",
      "Here is the current position. The Udhampur\u2013Srinagar\u2013Baramulla rail link is complete, and since 2 May 2026 the Vande Bharat service has run the full corridor from Jammu Tawi into Srinagar, roughly 266 km through the Chenab and Anji bridges. You still cannot board a single train in Kolkata and get off in Srinagar \u2014 you travel to Jammu Tawi or Katra first and change \u2014 but the old answer, that the line ends in Jammu and you finish by road, is no longer true.",
      "That makes the rail option genuinely competitive rather than merely romantic, and it is one of the great train journeys in India by any measure. Kolkata also over-indexes on the combined Vaishno Devi and Kashmir itinerary, which now works particularly neatly: the corridor runs through Katra, so you can break the journey for the yatra and continue into the valley on the same line.",
    ],
    planningNote: "Check the connection at Jammu Tawi carefully. The valley service runs six days a week, so an arrival on the wrong day means an unplanned night in Jammu \u2014 easy to avoid once you know to look.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "Can I reach Srinagar by train from Kolkata?",
        a: "Yes, with one change. Take a train to Jammu Tawi or Katra, then the Vande Bharat service into Srinagar \u2014 the line has run the full corridor since May 2026. There is no single through train from Kolkata, so plan the connection rather than assuming it.",
      },
      {
        q: "Is the train worth it, or should we fly?",
        a: "Flying still saves you the best part of two days. But the valley leg is now a genuinely spectacular rail journey over the Chenab and Anji bridges, so if the getting-there is part of the holiday, the train has become a real choice rather than a compromise.",
      },
      {
        q: "Can we combine Vaishno Devi with Kashmir from Kolkata?",
        a: "Yes, and it is the itinerary we most often recommend for Kolkata travellers, because the overland route runs through Katra anyway. The 7-night Vaishno Devi and Kashmir package is built for exactly this.",
      },
      {
        q: "What is the land package price from Kolkata?",
        a: "Identical to every other city \u2014 \u20b918,500 per person for 4 nights, \u20b927,900 for 6 nights, twin-sharing and GST inclusive. The land cost begins when we meet you in Srinagar, so where you started does not change it.",
      },
    ],
  },
  {
    slug: "pune",
    name: "Pune",
    state: "Maharashtra",
    demand: { queries: 129, impressions: 1305, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Pune travellers have strong holiday-season demand and prefer direct flight options or well-timed connections through Mumbai or Delhi.",
    body: [
      "Pune is a high-intent origin in Maharashtra where families and honeymooners plan vacations well in advance around Diwali and May school breaks. Because non-stop flights from Pune Airport (PNQ) to Srinagar (SXR) operate seasonally or on select days, travellers often weigh booking via Mumbai vs taking 1-stop connections through Delhi.",
      "For Pune departures, landing before 2:00 PM in Srinagar gives you a full first afternoon on Dal Lake. We recommend taking early morning departures out of PNQ so you reach Srinagar with ample daylight to check into your houseboat or hotel without rushing.",
      "Pune families travelling with elderly members or small children consistently choose our 6-Night Complete Kashmir itinerary because it includes dedicated overnight stays in Pahalgam and Gulmarg, avoiding exhausting back-and-forth road transfers to Srinagar.",
    ],
    planningNote: "Compare Pune 1-stop flights against driving to Mumbai (T2) for direct flights if you are travelling in peak holiday weeks; the Mumbai direct option can save 3 hours of transit.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "Are direct flights available from Pune to Srinagar?",
        a: "Direct flights operate seasonally depending on airline schedules. Year-round, convenient 1-stop flights via Delhi or Mumbai operate daily.",
      },
      {
        q: "Which package is most popular with Pune couples?",
        a: "Our 5-Night Kashmir Honeymoon package featuring private luxury cab transfers, a Dal Lake shikara ride, candlelit dinner, and premium Gulmarg stays is the top choice.",
      },
      {
        q: "How is the mobile network in Kashmir for Pune travellers?",
        a: "Only postpaid SIMs work in Jammu & Kashmir (J&K). If you use prepaid Jio, Airtel, or Vi in Pune, you will need to convert to postpaid or buy a local prepaid tourist SIM upon landing in Srinagar.",
      },
      {
        q: "What payment terms apply for booking from Pune?",
        a: "We require an initial advance to confirm hotel and cab bookings, with the balance settled upon arrival in Srinagar. GST invoices and full documentation are shared immediately.",
      },
    ],
  },
  {
    slug: "ahmedabad",
    name: "Ahmedabad",
    state: "Gujarat",
    demand: { queries: 135, impressions: 1157, conversions: 3.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Ahmedabad travellers index heavily on family holidays and pure vegetarian food \u2014 both of which we handle seamlessly on the ground in Srinagar.",
    body: [
      "Gujarat is one of the highest-volume leisure markets for Kashmir, and Ahmedabad is its commercial anchor. Bookings from Ahmedabad peak sharply during the Diwali vacation weeks and the summer school holiday period in May and June.",
      "The two primary questions Gujarati travellers have are pure vegetarian (and Jain) dining options and group vehicle sizing. We work with verified partner hotels in Srinagar, Pahalgam, and Gulmarg that maintain pure-veg kitchens, and we arrange spacious Tempo Travellers or Innovas for extended family groups.",
      "Direct flights between Ahmedabad (AMD) and Srinagar (SXR) operate seasonally on select carriers, while daily 1-stop connections via Delhi provide year-round connectivity. We advise Ahmedabad guests to book Gulmarg gondola tickets at least 30 days ahead during the Diwali and May rushes.",
    ],
    planningNote: "Diwali and May travel from Ahmedabad requires early booking for Gulmarg hotels and Gondola tickets, as these windows sell out weeks before flights do.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "Can you arrange Jain and pure vegetarian food on the tour?",
        a: "Yes. We regularly host Gujarati families and arrange Jain food (without onion/garlic/root vegetables) and 100% pure vegetarian meals across all hotels and houseboats.",
      },
      {
        q: "Do you offer group packages for large families from Ahmedabad?",
        a: "Yes. For families of 6 to 14 people, we assign private Toyota Innovas or Force Urbania/Tempo Travellers with dedicated drivers.",
      },
      {
        q: "Is there a direct flight from Ahmedabad to Srinagar?",
        a: "Direct flights run seasonally on specific airline schedules. 1-stop flights via Delhi or Mumbai run multiple times daily with total travel times under 5.5 hours.",
      },
      {
        q: "When is the best time for Gujarati families to see snow in Kashmir?",
        a: "For guaranteed snow, visit between late December and late February. For lush green meadows and pleasant sightseeing, April to June is ideal.",
      },
    ],
  },
  {
    slug: "chandigarh",
    name: "Chandigarh",
    state: "Punjab & Haryana",
    demand: { queries: 130, impressions: 1400, conversions: 6.0 },
    packages: ["classic-kashmir-4-nights", "complete-kashmir-6-nights", "kashmir-snow-winter-5-nights"],
    summary: "Chandigarh is geographically close enough that both flight and new 2026 rail routes offer fast, flexible access to the valley.",
    body: [
      "Chandigarh travellers benefit from direct short-haul flights to Srinagar (under 1 hour gate-to-gate) as well as the newly completed Vande Bharat rail route via Katra. This proximity makes both quick 4-night weekend getaways and extended 6-night family tours highly feasible.",
      "Because Chandigarh is a cold-winter city, travellers from the Tricity understand winter layering better than coastal visitors, making winter ski trips to Gulmarg particularly popular among Chandigarh adventure seekers.",
      "Short flight times mean Chandigarh arrivals often touch down before 11:00 AM, allowing guests to complete Dal Lake shikara rides and Shankaracharya temple visits on Day 1 without fatigue.",
    ],
    planningNote: "Take the direct morning flight (IXC to SXR) to maximise Day 1 in the valley. If travelling by rail, connect at Katra for the scenic Vande Bharat valley crossing.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How long is the flight from Chandigarh to Srinagar?",
        a: "Direct flights take approximately 50 to 60 minutes, making Chandigarh one of the fastest gateways to Kashmir.",
      },
      {
        q: "Can we take a train from Chandigarh to Srinagar?",
        a: "Yes. You can take a train to Katra/Jammu Tawi and board the new direct Vande Bharat rail service across the Chenab Bridge directly into Srinagar.",
      },
      {
        q: "Is 4 nights enough from Chandigarh?",
        a: "Yes. Because you lose almost zero time in flight transit, a 4-night package allows 4 full days covering Srinagar, Gulmarg, and Pahalgam.",
      },
      {
        q: "Do you provide pick-up from Srinagar airport for Chandigarh flights?",
        a: "Yes. Private dedicated vehicle pick-up from Srinagar airport (SXR) is included in every package.",
      },
    ],
  },
  {
    slug: "lucknow",
    name: "Lucknow",
    state: "Uttar Pradesh",
    demand: { queries: 93, impressions: 1328, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "classic-kashmir-4-nights", "vaishno-devi-kashmir-7-nights"],
    summary: "Lucknow travellers frequently pair Kashmir vacations with the Vaishno Devi pilgrimage, using direct 1-stop flights or direct trains to Jammu.",
    body: [
      "Travel demand from Lucknow reflects strong interest in both pure Kashmir holidays and combined Vaishno Devi + Kashmir 7-night itineraries. Lucknow is well-connected by direct trains to Jammu Tawi as well as 1-stop flights via Delhi from Chaudhary Charan Singh International Airport (LKO).",
      "For families taking the train, the Begampura Express and other Jammu-bound services connect Lucknow directly to the railhead, where travellers can now transfer to the direct Vande Bharat into Srinagar.",
      "Lucknow guests travelling in April and May appreciate the cool, blooming valley climate as a welcome escape from the intense North Indian plains heat. We recommend our 6-Night Complete Kashmir package for families seeking a relaxed pace.",
    ],
    planningNote: "If combining Vaishno Devi with Kashmir from Lucknow, plan 2 nights in Katra followed by 5 nights in the valley for an unhurried pilgrimage and holiday.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "What is the best way to travel from Lucknow to Srinagar?",
        a: "Flights via Delhi (total duration 4.5\u20136 hours) are fastest. For train enthusiasts, take a train to Jammu Tawi / Katra and continue into Srinagar via the rail link.",
      },
      {
        q: "Can we book a combined Vaishno Devi and Kashmir tour from Lucknow?",
        a: "Yes. Our 7-night package covers Katra darshan with helicopter/pony assistance and private transfers into Srinagar, Gulmarg, and Pahalgam.",
      },
      {
        q: "What are the food options for Awadhi and North Indian palates?",
        a: "All our partner hotels serve familiar North Indian cuisine alongside authentic Kashmiri Wazwan specialities for those who wish to sample local flavours.",
      },
      {
        q: "Are airport transfers included for Lucknow flights?",
        a: "Yes, our driver receives you at Srinagar airport regardless of which flight you arrive on.",
      },
    ],
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    demand: { queries: 83, impressions: 707, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Jaipur travellers seek the crisp mountain air and snowy peaks of Kashmir as the ultimate contrast to Rajasthan's desert landscape.",
    body: [
      "Travellers from Jaipur and surrounding Rajasthan regions head to Kashmir for its alpine meadows, freshwater lakes, and snow \u2014 landscapes completely opposite to the Aravallis. Couple and honeymoon bookings are especially strong from Jaipur.",
      "Flights from Jaipur International Airport (JAI) connect seamlessly to Srinagar (SXR) with a brief stop in Delhi, taking roughly 4 to 5 hours in total. We recommend morning departures to ensure you reach Srinagar in time for an afternoon Shikara ride.",
      "For vegetarian travellers from Rajasthan, we ensure pure-veg meal plans across all hotel stays in Srinagar and Pahalgam, with hygienic catering and comfortable heating during colder months.",
    ],
    planningNote: "Book morning 1-stop flights via Delhi so you land in Srinagar before 1:30 PM, ensuring you don't miss Day 1 sightseeing.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How long is the flight journey from Jaipur to Srinagar?",
        a: "With a 1-stop connection via Delhi, total transit time is usually 4 to 5 hours.",
      },
      {
        q: "Is pure vegetarian food available in Kashmir for Rajasthan travellers?",
        a: "Yes, all our partner properties provide clean, dedicated vegetarian meals.",
      },
      {
        q: "Which package is best for a honeymoon couple from Jaipur?",
        a: "The 5-Night Kashmir Honeymoon package with romantic houseboat stays, flower bed decoration, and private cab service.",
      },
      {
        q: "What is the best month to experience snow from Jaipur?",
        a: "January and February offer the deepest snow in Gulmarg and Sonmarg.",
      },
    ],
  },
  {
    slug: "amritsar",
    name: "Amritsar",
    state: "Punjab",
    demand: { queries: 109, impressions: 922, conversions: 2.0 },
    packages: ["classic-kashmir-4-nights", "complete-kashmir-6-nights", "kashmir-snow-winter-5-nights"],
    summary: "Amritsar sits on the direct northern corridor, making Kashmir easily accessible by short direct flights or road/rail combos.",
    body: [
      "Amritsar travellers enjoy close geographic proximity to Jammu & Kashmir. Direct flights and quick road connections via Pathankot make Kashmir a frequent vacation choice for Punjab families.",
      "The newly operational rail connectivity through Katra allows Amritsar travellers to board express trains to Jammu/Katra and ride the scenic Vande Bharat into Srinagar.",
      "Many Amritsar families travel during the winter snow months for skiing and gondola rides in Gulmarg. We provide heated hotel accommodations and heavy-duty winter vehicles with snow chains for high-altitude passes.",
    ],
    planningNote: "In winter months, ensure your cab has snow-chain clearance for the Tangmarg-Gulmarg stretch, which Ladakh Vacation manages automatically.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How can I travel from Amritsar to Srinagar?",
        a: "Fly directly from Sri Guru Ram Dass Jee International Airport (ATQ) or travel via road/rail through Jammu and Katra.",
      },
      {
        q: "How long is the drive from Amritsar to Srinagar?",
        a: "Driving takes around 10\u201312 hours via NH44, making an overnight stop in Jammu or Katra recommended if driving.",
      },
      {
        q: "Do you provide Punjabi-speaking drivers?",
        a: "Many of our seasoned local Kashmiri drivers are fluent in Hindi, Punjabi, and Urdu.",
      },
      {
        q: "What is the cost of a 4-night tour from Amritsar?",
        a: "Land packages start from \u20b918,500 per person twin-sharing, inclusive of hotels, cab, breakfast, dinner, and shikara.",
      },
    ],
  },
  {
    slug: "nagpur",
    name: "Nagpur",
    state: "Maharashtra",
    demand: { queries: 51, impressions: 418, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Nagpur travellers in Central India benefit from well-connected flights via Delhi and Mumbai for seamless Himalayan holidays.",
    body: [
      "Travel from Nagpur to Kashmir offers residents of Vidarbha a dramatic respite from summer heat. Families from Nagpur typically plan 6-night itineraries to balance the transit time with deep exploration of Pahalgam and Gulmarg.",
      "With Dr. Babasaheb Ambedkar International Airport (NAG) offering frequent connections to Delhi, travellers can depart early morning and arrive in Srinagar by early afternoon.",
      "We arrange fully private sedans and SUVs (Toyota Innova) for Nagpur groups, ensuring no shared vehicles and total flexibility to stop at saffron fields and apple orchards along the way.",
    ],
    planningNote: "Choose a flight routing through Delhi rather than Mumbai for Nagpur departures, as Delhi layovers tend to have shorter connection windows to Srinagar.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "What is the travel time from Nagpur to Srinagar by air?",
        a: "Total flight time with a connection in Delhi is around 5 to 6.5 hours.",
      },
      {
        q: "Which itinerary is best for Nagpur families?",
        a: "The 6-Night Complete Kashmir package covering Srinagar, Gulmarg, Pahalgam, and Sonmarg.",
      },
      {
        q: "Are hotel rooms heated during winter?",
        a: "Yes, we exclusively partner with hotels equipped with electric blankets, central heating, or heating blowers.",
      },
      {
        q: "How do we book from Nagpur?",
        a: "Connect via WhatsApp or phone, customize your itinerary, and confirm with a secure partial deposit.",
      },
    ],
  },
  {
    slug: "indore",
    name: "Indore",
    state: "Madhya Pradesh",
    demand: { queries: 55, impressions: 450, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Indore travellers value food quality and family comfort \u2014 two core strengths of our Srinagar on-ground hospitality team.",
    body: [
      "Indore and Malwa travellers have a well-earned reputation for high standards in food and comfortable travel. When booking a Kashmir package from Indore, food variety, hotel hygiene, and reliable transport take top priority.",
      "Departing from Devi Ahilyabai Holkar Airport (IDR), 1-stop flights via Delhi connect into Srinagar by 1:00 PM. We design Day 1 to include a gentle sunset shikara on Dal Lake and a freshly prepared dinner at your hotel.",
      "For Indore couples planning honeymoons, our 5-night package features secluded valley stays, private transfers, and special honeymoon inclusions like almond milk and candlelight dinners.",
    ],
    planningNote: "Take the 6:00 AM or 7:00 AM departure from Indore via Delhi to reach Srinagar before noon, saving your entire first day for sightseeing.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How is vegetarian food handled for Indore travellers?",
        a: "We arrange vegetarian meals with high hygiene standards across all partnered hotels in Srinagar and Pahalgam.",
      },
      {
        q: "How many days should we plan from Indore?",
        a: "We recommend 6 nights (7 days) to comfortably visit Srinagar, Gulmarg, Pahalgam, and Sonmarg without travel fatigue.",
      },
      {
        q: "Can we get a private cab from Srinagar airport?",
        a: "Yes, a dedicated private cab stays with you throughout the entire duration of the tour.",
      },
      {
        q: "When do apple blossoms and tulip gardens bloom?",
        a: "Tulips bloom in April for about 3 to 4 weeks; apple orchards bloom in April and bear ripe fruit from August to October.",
      },
    ],
  },
  {
    slug: "kochi",
    name: "Kochi",
    state: "Kerala",
    demand: { queries: 50, impressions: 483, conversions: 3.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Kochi travellers cross the full length of the country to reach Kashmir, requiring careful connection planning and warm clothing preparation.",
    body: [
      "Travelling from the tropical backwaters of Kerala to the snow-covered peaks of Kashmir is one of the most transformative journeys in India. Kochi travellers consistently convert at high rates because this is a once-in-a-lifetime holiday.",
      "Because Kochi (COK) to Srinagar (SXR) spans almost 3,000 kilometres, flight itineraries take 6.5 to 8.5 hours with a connection in Mumbai or Delhi. We recommend at least 6 nights in Kashmir to ensure you have 5 full days of exploration without rushing.",
      "Winter clothing is crucial for Kerala travellers unaccustomed to sub-zero temperatures. We brief our guests thoroughly on thermal layers and provide heated hotel rooms with traditional electric blankets (hot water bottles / heating pads).",
    ],
    planningNote: "Build a comfortable 6-night itinerary. Do not attempt a 4-night tour after flying from South Kerala, as two days will be consumed by long-distance travel.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "What is the flight time from Kochi to Srinagar?",
        a: "With a 1-stop connection in Mumbai or Delhi, total transit time is typically 6.5 to 8 hours.",
      },
      {
        q: "How cold does Kashmir get for someone from Kerala?",
        a: "In winter (Dec\u2013Feb), daytime temperatures are 2\u00b0C to 8\u00b0C and nights drop to \u22125\u00b0C. In summer (May\u2013July), it is pleasant at 15\u00b0C to 28\u00b0C.",
      },
      {
        q: "Can we rent winter jackets and snow boots in Kashmir?",
        a: "Yes. While you should bring your own thermal inners and socks, heavy snow overcoats and gumboots are easily rented at Tangmarg / Gulmarg.",
      },
      {
        q: "Do you provide Kerala food in Srinagar?",
        a: "While authentic Kashmiri cuisine is the local highlight, all hotels provide standard South Indian breakfast options (idli, dosa) and multi-cuisine dinners.",
      },
    ],
  },
  {
    slug: "guwahati",
    name: "Guwahati",
    state: "Assam",
    demand: { queries: 39, impressions: 310, conversions: 1.5 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Guwahati, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Guwahati (Assam) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Guwahati to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Guwahati travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Guwahati. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Guwahati?",
        a: "The fastest way is booking a flight from Guwahati with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Guwahati?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Guwahati?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Guwahati?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "patna",
    name: "Patna",
    state: "Bihar",
    demand: { queries: 30, impressions: 300, conversions: 2.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Patna, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Patna (Bihar) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Patna to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Patna travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Patna. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Patna?",
        a: "The fastest way is booking a flight from Patna with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Patna?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Patna?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Patna?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "dehradun",
    name: "Dehradun",
    state: "Uttarakhand",
    demand: { queries: 35, impressions: 261, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Dehradun, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Dehradun (Uttarakhand) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Dehradun to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Dehradun travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Dehradun. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Dehradun?",
        a: "The fastest way is booking a flight from Dehradun with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Dehradun?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Dehradun?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Dehradun?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "varanasi",
    name: "Varanasi",
    state: "Uttar Pradesh",
    demand: { queries: 21, impressions: 99, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Varanasi, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Varanasi (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Varanasi to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Varanasi travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Varanasi. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Varanasi?",
        a: "The fastest way is booking a flight from Varanasi with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Varanasi?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Varanasi?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Varanasi?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "bhopal",
    name: "Bhopal",
    state: "Madhya Pradesh",
    demand: { queries: 25, impressions: 161, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Bhopal, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Bhopal (Madhya Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Bhopal to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Bhopal travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Bhopal. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Bhopal?",
        a: "The fastest way is booking a flight from Bhopal with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Bhopal?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Bhopal?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Bhopal?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "vadodara",
    name: "Vadodara",
    state: "Gujarat",
    demand: { queries: 25, impressions: 120, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Vadodara, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Vadodara (Gujarat) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Vadodara to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Vadodara travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Vadodara. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Vadodara?",
        a: "The fastest way is booking a flight from Vadodara with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Vadodara?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Vadodara?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Vadodara?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "ludhiana",
    name: "Ludhiana",
    state: "Punjab",
    demand: { queries: 26, impressions: 241, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Ludhiana, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Ludhiana (Punjab) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Ludhiana to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Ludhiana travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Ludhiana. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Ludhiana?",
        a: "The fastest way is booking a flight from Ludhiana with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Ludhiana?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Ludhiana?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Ludhiana?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "jalandhar",
    name: "Jalandhar",
    state: "Punjab",
    demand: { queries: 20, impressions: 133, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Jalandhar, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Jalandhar (Punjab) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Jalandhar to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Jalandhar travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Jalandhar. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Jalandhar?",
        a: "The fastest way is booking a flight from Jalandhar with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Jalandhar?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Jalandhar?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Jalandhar?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "kanpur",
    name: "Kanpur",
    state: "Uttar Pradesh",
    demand: { queries: 25, impressions: 217, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Kanpur, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Kanpur (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Kanpur to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Kanpur travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Kanpur. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Kanpur?",
        a: "The fastest way is booking a flight from Kanpur with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Kanpur?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Kanpur?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Kanpur?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "agra",
    name: "Agra",
    state: "Uttar Pradesh",
    demand: { queries: 34, impressions: 230, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Agra, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Agra (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Agra to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Agra travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Agra. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Agra?",
        a: "The fastest way is booking a flight from Agra with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Agra?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Agra?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Agra?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "jodhpur",
    name: "Jodhpur",
    state: "Rajasthan",
    demand: { queries: 18, impressions: 84, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Jodhpur, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Jodhpur (Rajasthan) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Jodhpur to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Jodhpur travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Jodhpur. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Jodhpur?",
        a: "The fastest way is booking a flight from Jodhpur with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Jodhpur?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Jodhpur?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Jodhpur?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "udaipur",
    name: "Udaipur",
    state: "Rajasthan",
    demand: { queries: 9, impressions: 72, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Udaipur, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Udaipur (Rajasthan) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Udaipur to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Udaipur travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Udaipur. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Udaipur?",
        a: "The fastest way is booking a flight from Udaipur with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Udaipur?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Udaipur?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Udaipur?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "raipur",
    name: "Raipur",
    state: "Chhattisgarh",
    demand: { queries: 20, impressions: 66, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Raipur, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Raipur (Chhattisgarh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Raipur to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Raipur travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Raipur. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Raipur?",
        a: "The fastest way is booking a flight from Raipur with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Raipur?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Raipur?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Raipur?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "ranchi",
    name: "Ranchi",
    state: "Jharkhand",
    demand: { queries: 15, impressions: 64, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Ranchi, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Ranchi (Jharkhand) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Ranchi to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Ranchi travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Ranchi. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Ranchi?",
        a: "The fastest way is booking a flight from Ranchi with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Ranchi?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Ranchi?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Ranchi?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "coimbatore",
    name: "Coimbatore",
    state: "Tamil Nadu",
    demand: { queries: 14, impressions: 70, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Coimbatore, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Coimbatore (Tamil Nadu) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Coimbatore to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Coimbatore travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Coimbatore. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Coimbatore?",
        a: "The fastest way is booking a flight from Coimbatore with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Coimbatore?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Coimbatore?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Coimbatore?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "trivandrum",
    name: "Trivandrum",
    state: "Kerala",
    demand: { queries: 23, impressions: 139, conversions: 1.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Trivandrum, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Trivandrum (Kerala) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Trivandrum to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Trivandrum travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Trivandrum. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Trivandrum?",
        a: "The fastest way is booking a flight from Trivandrum with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Trivandrum?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Trivandrum?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Trivandrum?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "calicut",
    name: "Calicut",
    state: "Kerala",
    demand: { queries: 23, impressions: 149, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Calicut, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Calicut (Kerala) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Calicut to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Calicut travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Calicut. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Calicut?",
        a: "The fastest way is booking a flight from Calicut with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Calicut?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Calicut?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Calicut?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "mangalore",
    name: "Mangalore",
    state: "Karnataka",
    demand: { queries: 12, impressions: 43, conversions: 0.5 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Mangalore, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Mangalore (Karnataka) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Mangalore to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Mangalore travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Mangalore. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Mangalore?",
        a: "The fastest way is booking a flight from Mangalore with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Mangalore?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Mangalore?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Mangalore?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "mysore",
    name: "Mysore",
    state: "Karnataka",
    demand: { queries: 6, impressions: 22, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Mysore, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Mysore (Karnataka) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Mysore to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Mysore travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Mysore. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Mysore?",
        a: "The fastest way is booking a flight from Mysore with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Mysore?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Mysore?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Mysore?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "nashik",
    name: "Nashik",
    state: "Maharashtra",
    demand: { queries: 11, impressions: 34, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Nashik, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Nashik (Maharashtra) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Nashik to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Nashik travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Nashik. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Nashik?",
        a: "The fastest way is booking a flight from Nashik with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Nashik?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Nashik?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Nashik?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "aurangabad",
    name: "Aurangabad",
    state: "Maharashtra",
    demand: { queries: 10, impressions: 49, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Aurangabad, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Aurangabad (Maharashtra) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Aurangabad to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Aurangabad travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Aurangabad. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Aurangabad?",
        a: "The fastest way is booking a flight from Aurangabad with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Aurangabad?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Aurangabad?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Aurangabad?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "rajkot",
    name: "Rajkot",
    state: "Gujarat",
    demand: { queries: 11, impressions: 30, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Rajkot, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Rajkot (Gujarat) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Rajkot to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Rajkot travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Rajkot. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Rajkot?",
        a: "The fastest way is booking a flight from Rajkot with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Rajkot?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Rajkot?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Rajkot?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "siliguri",
    name: "Siliguri",
    state: "West Bengal",
    demand: { queries: 8, impressions: 30, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Siliguri, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Siliguri (West Bengal) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Siliguri to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Siliguri travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Siliguri. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Siliguri?",
        a: "The fastest way is booking a flight from Siliguri with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Siliguri?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Siliguri?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Siliguri?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "gwalior",
    name: "Gwalior",
    state: "Madhya Pradesh",
    demand: { queries: 6, impressions: 22, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Gwalior, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Gwalior (Madhya Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Gwalior to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Gwalior travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Gwalior. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Gwalior?",
        a: "The fastest way is booking a flight from Gwalior with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Gwalior?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Gwalior?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Gwalior?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "jabalpur",
    name: "Jabalpur",
    state: "Madhya Pradesh",
    demand: { queries: 5, impressions: 17, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Jabalpur, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Jabalpur (Madhya Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Jabalpur to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Jabalpur travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Jabalpur. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Jabalpur?",
        a: "The fastest way is booking a flight from Jabalpur with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Jabalpur?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Jabalpur?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Jabalpur?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "allahabad",
    name: "Allahabad",
    state: "Uttar Pradesh",
    demand: { queries: 11, impressions: 40, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Allahabad, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Allahabad (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Allahabad to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Allahabad travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Allahabad. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Allahabad?",
        a: "The fastest way is booking a flight from Allahabad with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Allahabad?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Allahabad?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Allahabad?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "meerut",
    name: "Meerut",
    state: "Uttar Pradesh",
    demand: { queries: 7, impressions: 40, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Meerut, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Meerut (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Meerut to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Meerut travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Meerut. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Meerut?",
        a: "The fastest way is booking a flight from Meerut with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Meerut?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Meerut?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Meerut?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "noida",
    name: "Noida",
    state: "Uttar Pradesh",
    demand: { queries: 8, impressions: 19, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Noida, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Noida (Uttar Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Noida to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Noida travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Noida. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Noida?",
        a: "The fastest way is booking a flight from Noida with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Noida?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Noida?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Noida?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "gurgaon",
    name: "Gurgaon",
    state: "Haryana",
    demand: { queries: 11, impressions: 36, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Gurgaon, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Gurgaon (Haryana) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Gurgaon to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Gurgaon travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Gurgaon. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Gurgaon?",
        a: "The fastest way is booking a flight from Gurgaon with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Gurgaon?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Gurgaon?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Gurgaon?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "madurai",
    name: "Madurai",
    state: "Tamil Nadu",
    demand: { queries: 7, impressions: 23, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Madurai, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Madurai (Tamil Nadu) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Madurai to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Madurai travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Madurai. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Madurai?",
        a: "The fastest way is booking a flight from Madurai with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Madurai?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Madurai?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Madurai?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "vijayawada",
    name: "Vijayawada",
    state: "Andhra Pradesh",
    demand: { queries: 5, impressions: 18, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Vijayawada, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Vijayawada (Andhra Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Vijayawada to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Vijayawada travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Vijayawada. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Vijayawada?",
        a: "The fastest way is booking a flight from Vijayawada with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Vijayawada?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Vijayawada?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Vijayawada?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
  {
    slug: "visakhapatnam",
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    demand: { queries: 13, impressions: 46, conversions: 0.0 },
    packages: ["complete-kashmir-6-nights", "kashmir-honeymoon-5-nights", "classic-kashmir-4-nights"],
    summary: "Tailored Kashmir holiday itineraries for travellers departing from Visakhapatnam, with transparent land pricing and verified flight advice.",
    body: [
      "Travellers departing from Visakhapatnam (Andhra Pradesh) can choose between efficient 1-stop air connectivity via Delhi or direct train connections to the Jammu railhead. Our Srinagar team coordinates your exact arrival timing so your vehicle and driver are waiting at the terminal when you land.",
      "A trip from Visakhapatnam to Kashmir covers substantial geography, so we build our itineraries with generous pacing. Our 6-night package gives you overnight stays in Gulmarg, Pahalgam, and a Dal Lake houseboat without the exhaustion of daily check-outs.",
      "All land packages for Visakhapatnam travellers include dedicated private transport, verified hotel stays with daily breakfast and dinner, and full support from our local office in Hawal, Srinagar.",
    ],
    planningNote: "Check flight layover times in Delhi when flying from Visakhapatnam. Maintain at least a 2-hour buffer to avoid winter fog connection delays.",
    flight: null,
    train: null,
    faqs: [
      {
        q: "How do I reach Srinagar from Visakhapatnam?",
        a: "The fastest way is booking a flight from Visakhapatnam with a brief connection in Delhi or Mumbai. Alternatively, rail connections run to Jammu Tawi and Katra with onward Vande Bharat service to Srinagar.",
      },
      {
        q: "What is included in the Kashmir tour package from Visakhapatnam?",
        a: "Packages include private cab transfers throughout the tour, hotel/houseboat accommodation, daily breakfast & dinner, 1-hour Dal Lake shikara ride, and 24/7 on-ground assistance.",
      },
      {
        q: "What is the best season to visit Kashmir from Visakhapatnam?",
        a: "April to June is ideal for blooming gardens and mild weather (15\u00b0C to 25\u00b0C). December to February is the peak season for snow and winter skiing in Gulmarg.",
      },
      {
        q: "How can we book our tour from Visakhapatnam?",
        a: "You can connect with our Srinagar team via WhatsApp (+91 96229 55386) or phone, finalize your custom itinerary, and book securely with a partial advance.",
      },
    ],
  },
];

export function getOriginCity(slug: string): OriginCity | undefined {
  return ORIGIN_CITIES.find((c) => c.slug === slug);
}
