import { hasSelfServingRating, jsonLdAuthors, jsonLdDate, parsePage } from './audit-html';

const URL_ = 'https://ladakhvacation.in/packages/from/delhi';

const HTML = `<!doctype html><html lang="en-IN"><head>
<title>Kashmir Tour Packages from Delhi | Ladakh Vacation</title>
<meta name="description" content="Plan a Kashmir trip   from Delhi.">
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width">
<meta name="author" content="Ladakh Vacation">
<link rel="canonical" href="/packages/from/delhi">
<link rel="alternate" hreflang="hi" href="https://ladakhvacation.in/hi/packages">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"TravelAgency","url":"https://ladakhvacation.in","aggregateRating":{"@type":"AggregateRating","ratingValue":4.8}},
  {"@type":"Article","author":{"@type":"Person","name":"Tariq Ahmad"},"dateModified":"2026-09-01"}]}</script>
<script type="application/ld+json">{ broken </script>
<script>var ignored = "script words";</script>
<style>.x { color: red }</style>
</head><body>
<header><nav><a href="/">Home</a><a href="/packages">Packages</a></nav></header>
<main>
<svg><title>Icon title</title></svg>
<h1>Kashmir &amp; Delhi</h1>
<nav><a href="/breadcrumb">Crumb</a></nav>
<p>Prices start at &#8377;18,500 per person.</p>
<h2>What to skip</h2>
<img src="/img/dal.jpg" alt="Dal Lake at dawn">
<img src="https://images.unsplash.com/photo.jpg">
<div style="background-image: url(/hero.jpg)"></div>
<a href="/routes/delhi-to-srinagar">Delhi to Srinagar by road</a>
<a href="/guides/gulmarg"><img src="/g.jpg" alt="Gulmarg guide"></a>
<a href="javascript:void(0)" onclick="go()">Open</a>
<a href="#top">Top</a>
<a href="https://wa.me/91">WhatsApp</a>
<a href="mailto:x@y.z">Mail</a>
</main>
<footer><h2>Footer heading</h2><a href="/about" rel="nofollow">About</a></footer>
</body></html>`;

describe('HTML fact extraction', () => {
  const f = parsePage(HTML, URL_);

  it('reads head metadata', () => {
    expect(f.titles).toEqual(['Kashmir Tour Packages from Delhi | Ladakh Vacation']);
    expect(f.metaDescriptions).toEqual(['Plan a Kashmir trip from Delhi.']);
    expect(f.canonicals).toEqual([URL_]);
    expect(f.robotsDirectives).toEqual(['index', 'follow']);
    expect(f.hreflang).toEqual([{ lang: 'hi', href: 'https://ladakhvacation.in/hi/packages' }]);
    expect(f.htmlLang).toBe('en-IN');
    expect(f.hasViewport).toBe(true);
    expect(f.metaAuthor).toBe('Ladakh Vacation');
  });

  it('keeps main content apart from navigation, scripts and SVG titles', () => {
    expect(f.hasMain).toBe(true);
    expect(f.mainText).toContain('Prices start at ₹18,500 per person.');
    expect(f.mainText).toContain('Kashmir & Delhi');
    for (const absent of ['Crumb', 'Home', 'Footer heading', 'script words', 'Icon title', 'color']) {
      expect(f.mainText).not.toContain(absent);
    }
  });

  it('records headings with where they sit', () => {
    expect(f.headings).toEqual([
      { level: 1, text: 'Kashmir & Delhi', inMain: true, inChrome: false },
      { level: 2, text: 'What to skip', inMain: true, inChrome: false },
      { level: 2, text: 'Footer heading', inMain: false, inChrome: true },
    ]);
  });

  it('records images, missing alt text and CSS background images', () => {
    expect(f.images).toEqual([
      { src: 'https://ladakhvacation.in/img/dal.jpg', alt: 'Dal Lake at dawn', inMain: true },
      { src: 'https://images.unsplash.com/photo.jpg', alt: null, inMain: true },
      { src: 'https://ladakhvacation.in/g.jpg', alt: 'Gulmarg guide', inMain: true },
    ]);
    expect(f.cssBackgroundImages).toBe(1);
  });

  it('resolves crawlable links and counts the ones Google cannot follow', () => {
    const byHref = Object.fromEntries(f.links.map((l) => [l.href, l]));
    expect(byHref['https://ladakhvacation.in/routes/delhi-to-srinagar']).toMatchObject({
      text: 'Delhi to Srinagar by road',
      inMain: true,
      inChrome: false,
    });
    expect(byHref['https://ladakhvacation.in/guides/gulmarg'].text).toBe('Gulmarg guide');
    expect(byHref['https://ladakhvacation.in/packages']).toMatchObject({ inMain: false, inChrome: true });
    expect(byHref['https://ladakhvacation.in/breadcrumb']).toMatchObject({ inMain: false });
    expect(byHref['https://ladakhvacation.in/about'].nofollow).toBe(true);
    expect(byHref['https://wa.me/91']).toBeDefined();
    expect(f.links.some((l) => l.href.includes('#top') || l.href.startsWith('mailto'))).toBe(false);
    expect(f.uncrawlableLinks).toBe(1);
  });

  it('parses JSON-LD and keeps broken blocks as errors', () => {
    expect(f.jsonLd).toHaveLength(2);
    expect(f.jsonLd[0].types).toEqual(expect.arrayContaining(['TravelAgency', 'AggregateRating', 'Article', 'Person']));
    expect(f.jsonLd[1].error).toBeTruthy();
    expect(jsonLdAuthors(f.jsonLd)).toEqual({ people: ['Tariq Ahmad'], organizations: [] });
    expect(jsonLdDate(f.jsonLd, 'dateModified')).toBe('2026-09-01');
  });

  it('spots ratings on the site owner\'s own business markup', () => {
    expect(hasSelfServingRating(f.jsonLd, 'ladakhvacation.in')).toBe(true);
    expect(hasSelfServingRating(f.jsonLd, 'www.ladakhvacation.in')).toBe(true);
    expect(hasSelfServingRating(f.jsonLd, 'example.com')).toBe(false);
  });

  it('falls back to body text without site chrome when there is no <main>', () => {
    const g = parsePage('<html><body><nav>Menu</nav><p>Body copy</p><footer>Legal</footer></body></html>', URL_);
    expect(g.hasMain).toBe(false);
    expect(g.mainText).toBe('Body copy');
  });
});
