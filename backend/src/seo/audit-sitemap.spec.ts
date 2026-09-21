import { lastmodLooksGenerated, parseSitemap, summariseLastmod } from './audit-sitemap';

const urlset = (entries: Array<[string, string | null]>) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map(([loc, lastmod]) => `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')}</urlset>`;

describe('sitemap parsing', () => {
  it('reads URLs, lastmod and escaped characters from a urlset', () => {
    const parsed = parseSitemap(
      urlset([
        ['https://ladakhvacation.in', '2026-09-14T12:18:06.473Z'],
        ['https://ladakhvacation.in/search?a=1&amp;b=2', null],
      ]),
    );
    expect(parsed.kind).toBe('urlset');
    expect(parsed.entries).toEqual([
      { loc: 'https://ladakhvacation.in', lastmod: '2026-09-14T12:18:06.473Z' },
      { loc: 'https://ladakhvacation.in/search?a=1&b=2', lastmod: null },
    ]);
  });

  it('reads child sitemaps from an index', () => {
    const parsed = parseSitemap(
      '<sitemapindex><sitemap><loc>https://x.in/a.xml</loc></sitemap><sitemap><loc><![CDATA[https://x.in/b.xml]]></loc></sitemap></sitemapindex>',
    );
    expect(parsed.kind).toBe('sitemapindex');
    expect(parsed.entries.map((e) => e.loc)).toEqual(['https://x.in/a.xml', 'https://x.in/b.xml']);
  });

  it('returns nothing for XML that is not a sitemap', () => {
    expect(parseSitemap('<html><body>Not found</body></html>')).toEqual({ kind: 'unknown', entries: [] });
  });
});

describe('lastmod accuracy', () => {
  const stamp = '2026-09-14T12:18:06.473Z';

  it('flags a build timestamp stamped on every URL', () => {
    const entries = parseSitemap(urlset(Array.from({ length: 30 }, (_, i) => [`https://x.in/${i}`, stamp]))).entries;
    const summary = summariseLastmod(entries);
    expect(summary).toMatchObject({ total: 30, withLastmod: 30, distinct: 1, topValue: stamp, topCount: 30 });
    expect(lastmodLooksGenerated(summary)).toBe(true);
  });

  it('accepts dates that vary by page', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      loc: `https://x.in/${i}`,
      lastmod: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    expect(lastmodLooksGenerated(summariseLastmod(entries))).toBe(false);
  });

  it('does not judge a small sitemap', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({ loc: `https://x.in/${i}`, lastmod: stamp }));
    expect(lastmodLooksGenerated(summariseLastmod(entries))).toBe(false);
  });
});
