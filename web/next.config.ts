import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },

  async redirects() {
    // The Ads landers on go.ladakhvacation.in use flat slugs
    // (/4-nights-ladakh-tour/, /ladakh-tour-from-delhi/). The same paths on
    // the main domain send people to the equivalent page here, so a lander
    // URL typed or shared against the wrong host still lands somewhere useful.
    const landerPackages = [
      '3-nights-ladakh-tour',
      '4-nights-ladakh-tour',
      '5-nights-ladakh-tour',
      '6-nights-ladakh-tour',
      '7-nights-ladakh-tour',
      '8-nights-ladakh-tour',
      'ladakh-honeymoon-packages',
      'ladakh-group-tour',
      'leh-ladakh-bike-trip',
      'kashmir-ladakh-tour',
      'manali-ladakh-tour',
    ];
    const landerCities = ['delhi', 'mumbai', 'bengaluru', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad'];

    return [
      ...landerPackages.map((slug) => ({
        source: `/${slug}`,
        destination: `/packages/${slug}`,
        permanent: true,
      })),
      ...landerCities.map((city) => ({
        source: `/ladakh-tour-from-${city}`,
        destination: `/packages/from/${city}`,
        permanent: true,
      })),
      { source: '/ladakh-tour-packages', destination: '/packages', permanent: true },
      { source: '/travel-agency-in-leh', destination: '/about', permanent: true },

      // Short vanity URLs → destination hubs.
      { source: '/leh', destination: '/destinations/leh', permanent: true },
      { source: '/monasteries', destination: '/destinations/ladakh-monasteries', permanent: true },
      { source: '/nubra', destination: '/destinations/nubra-pangong', permanent: true },
      { source: '/pangong', destination: '/destinations/nubra-pangong', permanent: true },
      { source: '/hanle', destination: '/destinations/hanle', permanent: true },

      // Travel-style shorthands.
      { source: '/honeymoon', destination: '/travel-styles/honeymoon', permanent: true },
      { source: '/family', destination: '/travel-styles/family', permanent: true },
      { source: '/adventure', destination: '/travel-styles/adventure', permanent: true },
      { source: '/culture', destination: '/travel-styles/culture', permanent: true },
      { source: '/group', destination: '/travel-styles/group', permanent: true },

      // There is no /travel-styles index page — send it to packages, which
      // cross-links every style.
      { source: '/travel-styles', destination: '/packages', permanent: false },

      { source: '/tours', destination: '/packages', permanent: true },
      { source: '/testimonials', destination: '/reviews', permanent: true },
    ];
  },
};

export default config;
