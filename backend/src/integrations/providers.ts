import type { IntegrationCategory } from '@prisma/client';

/**
 * Provider registry. Every integration in the product must be defined here —
 * the frontend's dynamic dialog and the backend's test probes both read from
 * this file. Adding a provider is a matter of adding one row.
 *
 * Field types map to HTML inputs: password uses type="password" so browser
 * chrome doesn't auto-fill and doesn't show the value in plaintext when
 * editing. Every credential value is treated as a secret regardless — the
 * whole `credentials` blob is AES-encrypted at rest.
 */

export type FieldType = 'text' | 'password' | 'url' | 'select' | 'textarea';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[]; // for type=select
}

export interface ProviderSpec {
  id: string;
  label: string;
  category: IntegrationCategory;
  logo?: string; // emoji or icon slug for quick visual scan
  docsUrl?: string;
  fields: FieldSpec[];
  /** True when a real test-connection probe exists. Otherwise UI shows "not implemented". */
  hasTest?: boolean;
}

// ── Payments — Domestic ─────────────────────────────────────────────────────
const paymentDomestic: ProviderSpec[] = [
  {
    id: 'razorpay',
    label: 'Razorpay',
    category: 'PAYMENT_DOMESTIC',
    docsUrl: 'https://razorpay.com/docs/api/authentication/',
    fields: [
      { key: 'keyId', label: 'Key ID', type: 'text', required: true, placeholder: 'rzp_live_...' },
      { key: 'keySecret', label: 'Key Secret', type: 'password', required: true },
    ],
    hasTest: true,
  },
  {
    id: 'payu',
    label: 'PayU',
    category: 'PAYMENT_DOMESTIC',
    docsUrl: 'https://docs.payu.in/',
    fields: [
      { key: 'merchantKey', label: 'Merchant Key', type: 'text', required: true },
      { key: 'salt', label: 'Salt', type: 'password', required: true },
    ],
  },
  {
    id: 'ccavenue',
    label: 'CCAvenue',
    category: 'PAYMENT_DOMESTIC',
    docsUrl: 'https://www.ccavenue.com/developers_documents.jsp',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'accessCode', label: 'Access Code', type: 'text', required: true },
      { key: 'workingKey', label: 'Working Key', type: 'password', required: true },
    ],
  },
  {
    id: 'instamojo',
    label: 'Instamojo',
    category: 'PAYMENT_DOMESTIC',
    docsUrl: 'https://docs.instamojo.com/',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
  },
  {
    id: 'cashfree',
    label: 'Cashfree',
    category: 'PAYMENT_DOMESTIC',
    docsUrl: 'https://docs.cashfree.com/',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
];

// ── Payments — International ────────────────────────────────────────────────
const paymentInternational: ProviderSpec[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    category: 'PAYMENT_INTERNATIONAL',
    docsUrl: 'https://stripe.com/docs/keys',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
    ],
    hasTest: true,
  },
  {
    id: 'paypal',
    label: 'PayPal',
    category: 'PAYMENT_INTERNATIONAL',
    docsUrl: 'https://developer.paypal.com/api/rest/',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'env', label: 'Environment', type: 'select', required: true, options: ['sandbox', 'live'] },
    ],
    hasTest: true,
  },
];

// ── AI ──────────────────────────────────────────────────────────────────────
const ai: ProviderSpec[] = [
  {
    id: 'openai', label: 'OpenAI', category: 'AI',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' }],
    hasTest: true,
  },
  {
    id: 'anthropic', label: 'Anthropic (Claude)', category: 'AI',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' }],
    hasTest: true,
  },
  {
    id: 'google_gemini',
    label: 'Google Gemini (Free Tier / AI Studio)',
    category: 'AI',
    logo: '✨',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    fields: [
      { key: 'apiKey', label: 'Gemini API Key', type: 'password', required: true, placeholder: 'AIzaSy...', help: 'Free API key from Google AI Studio. 100% free tier: 15 RPM and 1,000,000 tokens/min with no credit card requirement.' },
      { key: 'model', label: 'Model Version', type: 'select', options: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-1.5-flash'], help: 'Gemini 2.5 Flash is recommended for ultra-fast, zero-cost intelligence parsing.' },
    ],
    hasTest: true,
  },
  {
    id: 'groq', label: 'Groq', category: 'AI',
    docsUrl: 'https://console.groq.com/keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'gsk_...' }],
    hasTest: true,
  },
  {
    id: 'deepseek', label: 'DeepSeek', category: 'AI',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    hasTest: true,
  },
  {
    id: 'mistral', label: 'Mistral', category: 'AI',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    hasTest: true,
  },
  {
    id: 'cohere', label: 'Cohere', category: 'AI',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    hasTest: true,
  },
  {
    id: 'together', label: 'Together AI', category: 'AI',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    hasTest: true,
  },
  {
    id: 'fireworks', label: 'Fireworks AI', category: 'AI',
    docsUrl: 'https://fireworks.ai/api-keys',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true }],
    hasTest: true,
  },
  {
    id: 'perplexity', label: 'Perplexity', category: 'AI',
    docsUrl: 'https://www.perplexity.ai/settings/api',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'pplx-...' }],
    hasTest: true,
  },
  {
    id: 'xai_grok', label: 'xAI Grok', category: 'AI',
    docsUrl: 'https://console.x.ai/',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'xai-...' }],
    hasTest: true,
  },
  {
    id: 'huggingface', label: 'Hugging Face', category: 'AI',
    docsUrl: 'https://huggingface.co/settings/tokens',
    fields: [{ key: 'apiKey', label: 'Access Token', type: 'password', required: true, placeholder: 'hf_...' }],
    hasTest: true,
  },
];

// ── Ads ─────────────────────────────────────────────────────────────────────
const ads: ProviderSpec[] = [
  {
    id: 'google_ads', label: 'Google Ads', category: 'ADS',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/oauth/overview',
    fields: [
      { key: 'developerToken', label: 'Developer Token', type: 'password', required: true },
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
      { key: 'customerId', label: 'Conversion Customer ID', type: 'text', help: 'Optional: account receiving eligible legacy offline conversions.' },
      { key: 'conversionActionId', label: 'Conversion Action ID', type: 'text', help: 'Optional: upload conversion action. New accounts may require Google Data Manager instead.' },
      { key: 'loginCustomerId', label: 'Manager Customer ID', type: 'text', placeholder: '123-456-7890', help: 'Only needed when the credentials belong to a manager (MCC) account.' },
    ],
    hasTest: true,
  },
  {
    id: 'meta_ads', label: 'Meta Ads', category: 'ADS',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/',
    fields: [
      { key: 'accessToken', label: 'Long-Lived Access Token', type: 'password', required: true },
      { key: 'pixelId', label: 'Pixel / Dataset ID', type: 'text', help: 'Required for server-side purchase conversions.' },
      { key: 'adAccountId', label: 'Ad Account ID', type: 'text', required: true, placeholder: 'act_...' },
    ],
    hasTest: true,
  },
];

// ── Search & analytics ───────────────────────────────────────────────────
const analytics: ProviderSpec[] = [
  {
    id: 'google_search_console', label: 'Google Search Console', category: 'ANALYTICS',
    docsUrl: 'https://support.google.com/webmasters/answer/7687615',
    fields: [
      { key: 'authMethod', label: 'Auth method', type: 'select', required: true, options: ['service_account', 'oauth'], help: 'service_account is simplest: no consent screen and no token to expire. oauth needs the OAuth consent screen published to Production, or Google expires the refresh token after 7 days.' },
      { key: 'serviceAccountKey', label: 'Service account JSON key', type: 'textarea', placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}', help: 'service_account only. Paste the whole downloaded .json key file, then add its client_email as a user in Search Console under Settings > Users and permissions.' },
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', help: 'oauth only.' },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', help: 'oauth only.' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', help: 'oauth only. Scope: https://www.googleapis.com/auth/webmasters.readonly' },
      { key: 'siteUrl', label: 'Property', type: 'text', required: true, placeholder: 'sc-domain:ladakhvacation.in', help: 'Domain property (sc-domain:example.com) or URL-prefix property (https://example.com/). They are different properties holding different data.' },
    ],
    hasTest: true,
  },
  {
    id: 'google_indexing', label: 'Google Indexing API', category: 'ANALYTICS',
    docsUrl: 'https://developers.google.com/search/apis/indexing-api/v3/prereqs',
    fields: [
      { key: 'serviceAccountKey', label: 'Service Account JSON Key', type: 'textarea', required: true, placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}', help: 'Paste your Google Cloud Service Account key. Add its client_email as an Owner in Search Console to allow submitting URLs.' },
    ],
    hasTest: true,
  },
  {
    id: 'google_pagespeed', label: 'Google PageSpeed Insights', category: 'ANALYTICS',
    docsUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    fields: [
      { key: 'apiKey', label: 'PageSpeed API Key', type: 'password', required: true, placeholder: 'AIzaSy...', help: 'Free API key from Google Cloud Console to bypass anonymous rate limits (HTTP 429) during site audits.' },
    ],
    hasTest: true,
  },
  {
    id: 'indexnow', label: 'IndexNow (Bing, Yandex, Seznam)', category: 'ANALYTICS',
    docsUrl: 'https://www.indexnow.org/documentation',
    fields: [
      { key: 'host', label: 'Host Domain', type: 'text', required: true, placeholder: 'ladakhvacation.in', help: 'Your website domain name without protocol (e.g. ladakhvacation.in).' },
      { key: 'apiKey', label: 'IndexNow API Key', type: 'text', required: true, placeholder: '8-128 hex characters', help: 'The key generated and placed at the root of your domain (e.g. https://ladakhvacation.in/<key>.txt).' },
      { key: 'keyLocation', label: 'Key Location URL', type: 'text', placeholder: 'https://ladakhvacation.in/<key>.txt', help: 'Optional if stored at root. The public URL where search engines verify your key file.' },
    ],
    hasTest: true,
  },
  {
    id: 'google_business_profile', label: 'Google Business Profile', category: 'ANALYTICS',
    docsUrl: 'https://developers.google.com/my-business/content/basic-setup',
    fields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true, placeholder: 'accounts/1234567890', help: 'Your Google Business Profile Account resource name.' },
      { key: 'locationId', label: 'Location ID', type: 'text', required: true, placeholder: 'locations/9876543210', help: 'Your specific business location ID.' },
      { key: 'accessToken', label: 'OAuth Access / Service Token', type: 'password', required: true, help: 'Access token with scope https://www.googleapis.com/auth/business.manage' },
    ],
    hasTest: true,
  },
  {
    id: 'dataforseo', label: 'DataForSEO (SERP & Backlinks)', category: 'ANALYTICS',
    docsUrl: 'https://dataforseo.com/apis',
    fields: [
      { key: 'login', label: 'API Login (Email)', type: 'text', required: true, placeholder: 'user@example.com', help: 'Your DataForSEO account login email.' },
      { key: 'password', label: 'API Password / Key', type: 'password', required: true, help: 'Your DataForSEO API password or key.' },
    ],
    hasTest: true,
  },
  {
    id: 'google_analytics_4', label: 'Google Analytics 4 (GA4)', category: 'ANALYTICS',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    fields: [
      { key: 'propertyId', label: 'GA4 Property ID', type: 'text', required: true, placeholder: '123456789', help: '100% Free official API. Found in GA4 Admin > Property Settings > Property Details (numeric ID).' },
      { key: 'serviceAccountKey', label: 'Service Account JSON Key', type: 'textarea', required: true, placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}', help: 'Paste your Google Cloud Service Account JSON key. Add its client_email as a Viewer in GA4 Property Access Management.' },
      { key: 'measurementId', label: 'Measurement ID (Data Stream)', type: 'text', placeholder: 'G-XXXXXXXXXX', help: 'Optional: Found in Admin > Data Streams for web tracking verification.' },
    ],
    hasTest: true,
  },
  {
    id: 'microsoft_clarity', label: 'Microsoft Clarity', category: 'ANALYTICS',
    docsUrl: 'https://learn.microsoft.com/en-us/clarity/',
    fields: [
      { key: 'projectId', label: 'Clarity Project ID', type: 'text', required: true, placeholder: 'abcdef1234', help: '100% Free Forever with unlimited heatmaps and recordings. Found in clarity.microsoft.com project settings.' },
      { key: 'apiToken', label: 'API Export Token (Optional)', type: 'password', help: 'Optional API token for session insights export from Clarity Settings > API.' },
    ],
    hasTest: true,
  },
];

// ── Social ──────────────────────────────────────────────────────────────────
const social: ProviderSpec[] = [
  {
    id: 'whatsapp_cloud', label: 'WhatsApp Cloud API', category: 'SOCIAL',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', type: 'text', required: true },
      { key: 'accessToken', label: 'System User Access Token', type: 'password', required: true },
    ],
    hasTest: true,
  },
  {
    id: 'brevo', label: 'Brevo (Email Marketing)', category: 'SOCIAL',
    docsUrl: 'https://app.brevo.com/settings/keys/api',
    fields: [
      { key: 'apiKey', label: 'API Key (v3)', type: 'password', required: true, placeholder: 'xkeysib-...' },
      { key: 'senderEmail', label: 'Default Sender Email', type: 'text', placeholder: 'ladakhvacation@gmail.com' },
      { key: 'senderName', label: 'Sender Name', type: 'text', placeholder: 'Ladakh Vacation' },
    ],
    hasTest: true,
  },
  {
    id: 'meta_page', label: 'Facebook / Instagram Page', category: 'SOCIAL',
    docsUrl: 'https://developers.facebook.com/docs/pages-api/',
    fields: [
      { key: 'pageId', label: 'Page ID', type: 'text', required: true },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'password', required: true, help: 'Use a Long-Lived Page Token.' },
      { key: 'instagramId', label: 'Instagram Business Account ID', type: 'text', help: 'Optional — enables IG posting.' },
    ],
    hasTest: true,
  },
  {
    id: 'twitter', label: 'X / Twitter', category: 'SOCIAL',
    docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'accessSecret', label: 'Access Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'linkedin', label: 'LinkedIn Company Page', category: 'SOCIAL',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, help: 'Generated from LinkedIn Developer Portal > OAuth 2.0 tools with w_member_social or w_organization_social scope.' },
      { key: 'organizationId', label: 'Organization URN', type: 'text', required: true, placeholder: 'urn:li:organization:...', help: 'Your company page URN (e.g. urn:li:organization:143918523).' },
    ],
    hasTest: true,
  },
  {
    id: 'youtube', label: 'YouTube Channel', category: 'SOCIAL',
    docsUrl: 'https://developers.google.com/youtube/v3',
    fields: [
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
      { key: 'channelId', label: 'Channel ID', type: 'text', required: true },
    ],
  },
];

// ── Web Scraping & Intelligence ─────────────────────────────────────────────
const scraping: ProviderSpec[] = [
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    category: 'SCRAPING',
    logo: '🔥',
    docsUrl: 'https://docs.firecrawl.dev/',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'fc-...' },
      { key: 'baseUrl', label: 'API Base URL', type: 'text', placeholder: 'https://api.firecrawl.dev' },
    ],
    hasTest: true,
  },
  {
    id: 'jina',
    label: 'Jina Reader',
    category: 'SCRAPING',
    logo: '⚡',
    docsUrl: 'https://jina.ai/reader/',
    fields: [
      { key: 'apiKey', label: 'API Key (Optional for free 1M tokens/mo)', type: 'password', placeholder: 'jina_...' },
      { key: 'baseUrl', label: 'Reader Base URL', type: 'text', placeholder: 'https://r.jina.ai' },
    ],
    hasTest: true,
  },
  {
    id: 'scrape_do',
    label: 'scrape.do',
    category: 'SCRAPING',
    logo: '🌐',
    docsUrl: 'https://scrape.do/documentation/',
    fields: [
      { key: 'token', label: 'API Token', type: 'password', required: true },
    ],
    hasTest: true,
  },
  {
    id: 'tinyfish',
    label: 'TinyFish AI',
    category: 'SCRAPING',
    logo: '🐟',
    docsUrl: 'https://tinyfish.ai/',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.tinyfish.ai' },
    ],
    hasTest: true,
  },
  {
    id: 'crawl4ai',
    label: 'Crawl4AI (Self-Hosted / Open-Source)',
    category: 'SCRAPING',
    logo: '🕷️',
    docsUrl: 'https://crawl4ai.com/',
    fields: [
      { key: 'endpointUrl', label: 'Server Endpoint URL', type: 'text', required: true, placeholder: 'http://localhost:11235' },
      { key: 'apiToken', label: 'API Bearer Token (Optional)', type: 'password' },
    ],
    hasTest: true,
  },
  {
    id: 'google_custom_search',
    label: 'Google Custom Search JSON API (100 free queries/day)',
    category: 'SCRAPING',
    logo: '🔎',
    docsUrl: 'https://developers.google.com/custom-search/v1/overview',
    fields: [
      {
        key: 'apiKey',
        label: 'Custom Search API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSy...',
        help: 'Free tier provides 100 free search queries every single day for finding hotel websites, competitor tariffs, OTA listings, and Ladakh travel updates.',
      },
      {
        key: 'searchEngineId',
        label: 'Search Engine ID (cx)',
        type: 'text',
        required: true,
        placeholder: '0175...:abcdef... or a1b2c3d4e5',
        help: 'The Search Engine ID (cx) from programmablesearchengine.google.com configured to search the web.',
      },
    ],
    hasTest: true,
  },
];

// ── Maps, Places & Logistics ────────────────────────────────────────────────
const maps: ProviderSpec[] = [
  {
    id: 'google_places',
    label: 'Google Places API (New & Classic)',
    category: 'MAPS',
    logo: '📍',
    docsUrl: 'https://developers.google.com/maps/documentation/places/web-service/overview',
    fields: [
      {
        key: 'apiKey',
        label: 'Google Places API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSy...',
        help: 'API key with Places API enabled in Google Cloud Console. Used for high-res hotel photos, review extraction, GPS coordinates, address verification, and place IDs.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'google_maps_embed',
    label: 'Google Maps Embed API',
    category: 'MAPS',
    logo: '🗺️',
    docsUrl: 'https://developers.google.com/maps/documentation/embed/get-started',
    fields: [
      {
        key: 'apiKey',
        label: 'Google Maps Embed API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSy...',
        help: '100% Free with unlimited embeds. Used for interactive location maps on Leh/Nubra/Pangong hotel landing pages and customer quote proposals.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'google_routes',
    label: 'Google Routes & Elevation API',
    category: 'MAPS',
    logo: '🏔️',
    docsUrl: 'https://developers.google.com/maps/documentation/routes',
    fields: [
      {
        key: 'apiKey',
        label: 'Google Routes API Key',
        type: 'password',
        required: true,
        placeholder: 'AIzaSy...',
        help: 'Directions & Elevation API key for calculating real mountain driving durations, pass altitudes (Khardung La, Chang La), road status routes, and travel distance matrix.',
      },
    ],
    hasTest: true,
  },
];

// ── Google Workspace & Productivity ─────────────────────────────────────────
const workspace: ProviderSpec[] = [
  {
    id: 'google_sheets',
    label: 'Google Sheets API',
    category: 'WORKSPACE',
    logo: '📊',
    docsUrl: 'https://developers.google.com/sheets/api',
    fields: [
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}',
        help: 'Google Cloud Service Account JSON key. Used for two-way sync of hotel tariff sheets, B2B net rates, taxi union price tables, and offline agent allocations.',
      },
      {
        key: 'spreadsheetId',
        label: 'Default Spreadsheet ID',
        type: 'text',
        placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        help: 'Optional: Found in the Google Sheets URL between /d/ and /edit.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'google_drive',
    label: 'Google Drive API',
    category: 'WORKSPACE',
    logo: '📁',
    docsUrl: 'https://developers.google.com/drive/api',
    fields: [
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}',
        help: 'Service Account JSON key. Used to store and archive tourist Inner Line Permits (ILP), passport copies, signed driver vouchers, and high-res photo assets.',
      },
      {
        key: 'folderId',
        label: 'Root Permits / Assets Folder ID',
        type: 'text',
        placeholder: '1a2b3c4d5e6f7g8h9i0j',
        help: 'Optional: ID of the Google Drive folder shared with the Service Account client_email as Editor.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'gmail',
    label: 'Gmail API / Workspace Email',
    category: 'WORKSPACE',
    logo: '✉️',
    docsUrl: 'https://developers.google.com/gmail/api',
    fields: [
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}',
        help: 'Service Account JSON key configured with domain-wide delegation or direct API access.',
      },
      {
        key: 'delegatedEmail',
        label: 'Sender / Delegated Email',
        type: 'text',
        required: true,
        placeholder: 'info@ladakhvacation.in',
        help: 'The Google Workspace inbox to send quotes, booking vouchers, and hotel confirmation emails from.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'google_calendar',
    label: 'Google Calendar API',
    category: 'WORKSPACE',
    logo: '📅',
    docsUrl: 'https://developers.google.com/calendar/api',
    fields: [
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}',
        help: 'Service Account JSON key. Used to create tour departure events, track driver assignments, and notify operations of guest arrivals.',
      },
      {
        key: 'calendarId',
        label: 'Calendar ID',
        type: 'text',
        placeholder: 'primary or ops@ladakhvacation.in',
        help: 'Calendar ID (defaults to "primary"). Remember to share the calendar with the Service Account email.',
      },
    ],
    hasTest: true,
  },
  {
    id: 'google_forms',
    label: 'Google Forms API',
    category: 'WORKSPACE',
    logo: '📝',
    docsUrl: 'https://developers.google.com/forms/api',
    fields: [
      {
        key: 'serviceAccountKey',
        label: 'Service Account JSON Key',
        type: 'textarea',
        required: true,
        placeholder: '{\n  "type": "service_account",\n  "client_email": "...",\n  "private_key": "..."\n}',
        help: 'Service Account JSON key. Used to automatically pull post-tour guest feedback, hotel ratings, and B2B travel agent inquiry responses into CRM leads.',
      },
      {
        key: 'formId',
        label: 'Feedback Form ID',
        type: 'text',
        placeholder: '1FAIpQLSc...',
        help: 'Optional: Found in the Google Form edit URL.',
      },
    ],
    hasTest: true,
  },
];

export const PROVIDERS: ProviderSpec[] = [
  ...paymentDomestic,
  ...paymentInternational,
  ...ai,
  ...maps,
  ...workspace,
  ...ads,
  ...analytics,
  ...social,
  ...scraping,
];

export function getProvider(id: string): ProviderSpec | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** Frontend-safe view (no server code). */
export function publicProviderCatalog() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    category: p.category,
    docsUrl: p.docsUrl,
    fields: p.fields,
    hasTest: p.hasTest ?? false,
  }));
}
