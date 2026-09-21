/**
 * Builds page-manifest.json: the list of website pages the CRM's SEO
 * dashboard audits, ranks and pings to IndexNow.
 *
 * It reads the website's own data files (web/src/lib), so the manifest always
 * matches the pages the site actually builds. Demand fields (impr, clicks,
 * conv) are null: they are filled from Search Console once it is connected,
 * never estimated here.
 *
 *   node seo/generate-manifest.mjs
 *
 * Writes the same file to backend/src/seo/ and frontend/src/lib/. Needs a
 * Node version that runs .ts files directly (22.18+ or 24).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = (f) => import(path.join(root, 'web/src/lib', f).replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));

const { PACKAGES } = await lib('packages.ts');
const { DESTINATIONS } = await lib('destinations.ts');
const { COLLECTIONS } = await lib('collections.ts');
const { ORIGIN_CITIES } = await lib('origin-cities.ts');
const { TRAVEL_STYLES } = await lib('travel-styles.ts');

const BRAND = ' | Ladakh Vacation';
const pages = [];
const push = (p) => pages.push({ ...p, impr: null, clicks: null, conv: null, words: null });

// Tier 1: packages, the highest-intent pages.
for (const p of PACKAGES) {
  push({
    tier: 1,
    family: 'package',
    url: `/packages/${p.slug}`,
    h1: p.name,
    title: `${p.name} — ${p.nights} Nights ${p.days} Days ${p.destinationName} Package${BRAND}`,
    primary: p.slug.replace(/-/g, ' '),
  });
}
// Tier 2: destination hubs.
for (const d of DESTINATIONS) {
  push({
    tier: 2,
    family: 'destination',
    url: `/destinations/${d.slug}`,
    h1: d.headline,
    title: `${d.seoTitle}${BRAND}`,
    primary: d.seoTitle.toLowerCase(),
  });
}
// Tier 3: departure-city pages.
for (const c of ORIGIN_CITIES) {
  push({
    tier: 3,
    family: 'packages-from-city',
    url: `/packages/from/${c.slug}`,
    h1: `Ladakh tour packages from ${c.name}`,
    title: `Ladakh Tour Packages from ${c.name}${BRAND}`,
    primary: `ladakh tour package from ${c.name.toLowerCase()}`,
  });
}
// Tier 4: curated collections.
for (const c of COLLECTIONS) {
  push({
    tier: 4,
    family: 'collection',
    url: `/packages/${c.slug}`,
    h1: c.h1,
    title: `${c.seoTitle}${BRAND}`,
    primary: c.h1.toLowerCase(),
  });
}
// Tier 5: travel styles.
for (const s of TRAVEL_STYLES) {
  push({
    tier: 5,
    family: 'travel-style',
    url: `/travel-styles/${s.slug}`,
    h1: s.headline,
    title: `${s.seoTitle}${BRAND}`,
    primary: s.seoTitle.toLowerCase(),
  });
}
// Tier 6: index and trust pages.
for (const [url, h1, primary] of [
  ['/packages', 'Every package, honestly priced.', 'ladakh tour packages'],
  ['/destinations', 'Four Ladakhs, one journey.', 'ladakh destinations'],
  ['/about', 'Ladakh, planned by Ladakhis.', 'travel agency in leh'],
  ['/reviews', 'Reviews', 'ladakh vacation reviews'],
  ['/faq', 'Frequently asked questions', 'ladakh trip faq'],
  ['/contact', 'Talk to someone who is actually in Ladakh.', 'ladakh tour operator contact'],
  ['/plan-my-trip', 'Custom Holiday Planner', 'plan ladakh trip'],
  ['/partner-with-us', 'Your ground team in Ladakh', 'ladakh dmc for travel agents'],
]) {
  push({ tier: 6, family: 'core', url, h1, title: `${h1}${BRAND}`, primary });
}

pages.forEach((p, i) => (p.id = i + 1));
const json = JSON.stringify(pages, null, 2) + '\n';
for (const out of ['backend/src/seo/page-manifest.json', 'frontend/src/lib/page-manifest.json']) {
  writeFileSync(path.join(root, out), json);
}
console.log(`wrote ${pages.length} pages to backend/src/seo and frontend/src/lib`);
