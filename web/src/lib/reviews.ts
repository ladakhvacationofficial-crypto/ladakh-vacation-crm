/**
 * Guest reviews. Powers the home-page rail, the /reviews page and the
 * AggregateRating JSON-LD.
 *
 * Only put genuine reviews here. Fabricated testimonials with Review schema
 * attached are a Google policy violation and a real legal risk — swap these
 * for your actual Google Business Profile reviews before launch.
 */

export type Review = {
  quote: string;
  author: string;
  from: string;
  trip: string;
  month: string;
  rating: 5 | 4;
};

export const REVIEWS: Review[] = [
  {
    quote:
      'Our Kashmir trip was everything the brochures promise and rarely deliver. Every driver, every hotel, every meal was thought about. The houseboat night was the highlight of our year.',
    author: 'Priya Menon',
    from: 'Bengaluru',
    trip: 'Complete Kashmir · 6 nights',
    month: 'May 2026',
    rating: 5,
  },
  {
    quote:
      'Ladakh at altitude is no joke. The team paced it perfectly, insisted on the rest day even when we pushed back, and had oxygen in the car at Pangong. Zero drama the whole week.',
    author: 'Arjun Reddy',
    from: 'Hyderabad',
    trip: 'Leh, Nubra & Pangong · 6 nights',
    month: 'July 2026',
    rating: 5,
  },
  {
    quote:
      'We combined Vaishno Devi with Kashmir and it was the right call. From Katra to Srinagar every handover was smooth. My parents are in their seventies and never once felt rushed.',
    author: 'Rekha Sharma',
    from: 'Jaipur',
    trip: 'Vaishno Devi & Kashmir · 7 nights',
    month: 'October 2025',
    rating: 5,
  },
  {
    quote:
      'Booked eleven of us for a company offsite. One coordinator on WhatsApp the whole time, rooms all on the same floor, and one GST invoice at the end that our finance team accepted first time.',
    author: 'Nikhil Bhatia',
    from: 'Gurugram',
    trip: 'Corporate offsite · Srinagar',
    month: 'September 2025',
    rating: 5,
  },
  {
    quote:
      'Honeymoon in Gulmarg in February. Snow up to the windows, a private shikara when we got back to Srinagar, and a candlelit dinner on the houseboat that we did not ask for and will not forget.',
    author: 'Ananya & Rohit',
    from: 'Pune',
    trip: 'Kashmir Honeymoon · 5 nights',
    month: 'February 2026',
    rating: 5,
  },
  {
    quote:
      'What sold me was the honesty. I asked about early December for snow and instead of taking the booking they told me it was a gamble and suggested January. That is rare.',
    author: 'Deepak Iyer',
    from: 'Chennai',
    trip: 'Kashmir in Snow · 5 nights',
    month: 'January 2026',
    rating: 5,
  },
  {
    quote:
      'Third trip with Ladakh Vacation. Turtuk was the surprise of the Ladakh itinerary — nobody else even offered it. The village guide they arranged made the whole detour worth it.',
    author: 'Sanjana Kulkarni',
    from: 'Mumbai',
    trip: 'Complete Ladakh · 8 nights',
    month: 'August 2026',
    rating: 5,
  },
  {
    quote:
      'Shimla and Manali with two kids and my mother. They capped every driving day and it made all the difference — nobody was melting down in the back of a car at hour six.',
    author: 'Faisal Ahmed',
    from: 'Kolkata',
    trip: 'Shimla & Manali · 6 nights',
    month: 'April 2026',
    rating: 5,
  },
];
