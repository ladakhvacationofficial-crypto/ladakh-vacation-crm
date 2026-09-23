/**
 * Origin-city landing pages — "Ladakh tour packages from {city}".
 *
 * The eight cities, travel times and FAQs are the same ones the Ads landers
 * at go.ladakhvacation.in carry (ladakh-tour-from-<city>), so the organic and
 * paid pages never disagree about how to reach Leh.
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
    "slug": "delhi",
    "name": "Delhi",
    "state": "Delhi NCR",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Delhi that is the shortest hop to Leh in the country.",
    "body": [
      "Direct flights to Leh most mornings, roughly 1 hr 20 min in the air. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Or drive it: Delhi–Manali–Leh takes three days and acclimatises you far better than flying. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take a morning flight to Leh and plan nothing for the afternoon. Send us your flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Delhi?",
        "a": "Direct flights to Leh most mornings, roughly 1 hr 20 min in the air. Or drive it: Delhi–Manali–Leh takes three days and acclimatises you far better than flying. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "mumbai",
    "name": "Mumbai",
    "state": "Maharashtra",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Mumbai that is an early Delhi connection and you land in Leh before lunch.",
    "body": [
      "One stop, almost always through Delhi — about 5 hrs door to door including the connection. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Most travellers fly. If you want the overland run, fly to Delhi and start the Manali road from there. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Mumbai so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Mumbai?",
        "a": "One stop, almost always through Delhi — about 5 hrs door to door including the connection. Most travellers fly. If you want the overland run, fly to Delhi and start the Manali road from there. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "bengaluru",
    "name": "Bengaluru",
    "state": "Karnataka",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Bengaluru that is one connection and a morning arrival.",
    "body": [
      "One stop via Delhi, about 6 hrs in total. Take the first Bengaluru departure to make the Leh connection. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Flying is the only sensible option from the south; the overland leg starts at Manali or Srinagar. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Bengaluru so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Bengaluru?",
        "a": "One stop via Delhi, about 6 hrs in total. Take the first Bengaluru departure to make the Leh connection. Flying is the only sensible option from the south; the overland leg starts at Manali or Srinagar. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "hyderabad",
    "name": "Hyderabad",
    "state": "Telangana",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Hyderabad that is one connection through Delhi.",
    "body": [
      "One stop via Delhi, roughly 5 hrs 30 min including the connection. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Fly to Leh, or fly to Delhi and take the Manali road up if you have the days. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Hyderabad so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Hyderabad?",
        "a": "One stop via Delhi, roughly 5 hrs 30 min including the connection. Fly to Leh, or fly to Delhi and take the Manali road up if you have the days. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "chennai",
    "name": "Chennai",
    "state": "Tamil Nadu",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Chennai that is an overnight-free single connection.",
    "body": [
      "One stop via Delhi, about 6 hrs 30 min in total. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Flying is the practical route; the road journey begins from Manali or Srinagar. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Chennai so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Chennai?",
        "a": "One stop via Delhi, about 6 hrs 30 min in total. Flying is the practical route; the road journey begins from Manali or Srinagar. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "pune",
    "name": "Pune",
    "state": "Maharashtra",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Pune that is one connection and you are on the Indus.",
    "body": [
      "One stop via Delhi, about 5 hrs door to door. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Fly in, or route through Delhi and Manali if you would rather drive up. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Pune so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Pune?",
        "a": "One stop via Delhi, about 5 hrs door to door. Fly in, or route through Delhi and Manali if you would rather drive up. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "kolkata",
    "name": "Kolkata",
    "state": "West Bengal",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Kolkata that is a single Delhi connection.",
    "body": [
      "One stop via Delhi, roughly 5 hrs 30 min including the connection. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Flying is the sensible option; overland starts from Manali or Srinagar. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Kolkata so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Kolkata?",
        "a": "One stop via Delhi, roughly 5 hrs 30 min including the connection. Flying is the sensible option; overland starts from Manali or Srinagar. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  },
  {
    "slug": "ahmedabad",
    "name": "Ahmedabad",
    "state": "Gujarat",
    "packages": [
      "3-nights-ladakh-tour",
      "4-nights-ladakh-tour",
      "5-nights-ladakh-tour",
      "6-nights-ladakh-tour",
      "7-nights-ladakh-tour",
      "8-nights-ladakh-tour"
    ],
    "summary": "Everything on the ground is handled by our team in Leh — permits, vehicle, stays and support. All you book is the flight, and from Ahmedabad that is one of the quicker one-stop routes to Leh.",
    "body": [
      "One stop via Delhi, about 4 hrs 45 min in total — among the quicker one-stop routes. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup. There is no charge for that.",
      "However you get here, you land at 3,500 m, and a flight gets you there far faster than your body can adjust. That is why the first afternoon on every itinerary below is deliberately empty, the second day stays low, and the high passes start on day three. It costs one sightseeing afternoon and it is what makes the rest of the trip work.",
      "Fly to Leh, or drive to Manali and ride the highway up from there. If you have the days, our Manali to Leh and Kashmir to Ladakh routes drive in over two or three days, which lets the altitude come gradually. We often recommend flying in and driving out."
    ],
    "planningNote": "Take the first departure from Ahmedabad so you make the morning Leh connection in Delhi, and leave a comfortable margin between the two flights. Send us both flight times before you ticket, and we will confirm they fit the itinerary.",
    "flight": null,
    "train": null,
    "faqs": [
      {
        "q": "How do I get to Leh from Ahmedabad?",
        "a": "One stop via Delhi, about 4 hrs 45 min in total — among the quicker one-stop routes. Fly to Leh, or drive to Manali and ride the highway up from there. We time your airport pickup to your actual arrival, and if your connection slips we simply move the pickup — there is no charge for that."
      },
      {
        "q": "Should I fly into Leh or drive up?",
        "a": "Flying is faster but drops you at 3,500 m in ninety minutes, so acclimatisation matters more. Driving in via Manali or Srinagar takes two to three days and lets your body adjust gradually. We plan both, and often recommend flying in and driving out."
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
    ]
  }
];

export function getOriginCity(slug: string): OriginCity | undefined {
  return ORIGIN_CITIES.find((c) => c.slug === slug);
}
