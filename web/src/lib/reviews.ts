/**
 * Guest reviews. Powers the home-page rail, the /reviews page and the
 * AggregateRating JSON-LD.
 *
 * These are the four testimonials the Ads landers at go.ladakhvacation.in
 * already show. Only put genuine reviews here: fabricated testimonials with
 * Review schema attached are a Google policy violation and a real legal risk.
 * Add more from the Google Business Profile as they come in.
 */

export type Review = {
  quote: string;
  author: string;
  from: string;
  trip: string;
  /** Travel month, when known. */
  month?: string;
  rating: 5 | 4;
};

export const REVIEWS: Review[] = [
  {
    quote:
      'They rearranged our whole route when my mother struggled at altitude on day two. No argument, no extra charge, just a new plan by morning.',
    author: 'Aditi K.',
    from: 'Pune',
    trip: 'Grand Ladakh Circuit',
    rating: 5,
  },
  {
    quote:
      'Hanle was the single best night of my life. Our driver knew exactly where to park away from every light. I have never seen a sky like it.',
    author: 'Rahul M.',
    from: 'Bengaluru',
    trip: 'Stargazer’s Ladakh',
    rating: 5,
  },
  {
    quote:
      'Every permit was printed and waiting at the hotel. After reading horror stories about permit queues, that alone was worth the booking.',
    author: 'Sana F.',
    from: 'Delhi',
    trip: 'Leh Essentials',
    rating: 5,
  },
  {
    quote:
      'Turtuk was not on the brochure route. They added it because I mentioned I write about food. That is the difference between a package and a plan.',
    author: 'Joanne D.',
    from: 'Melbourne',
    trip: 'Custom itinerary',
    rating: 5,
  },
];
