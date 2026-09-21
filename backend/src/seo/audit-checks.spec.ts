import { parsePage } from './audit-html';
import {
  PageContext,
  classifyPage,
  runPageChecks,
  sitemapLastmodCheck,
  stem,
  xRobotsDirectives,
} from './audit-checks';
import { SitePageAnalysis } from './audit-site';
import { CheckResult } from './audit-types';
import { summariseLastmod } from './audit-sitemap';
import { pickVitals } from './audit-vitals';

const URL_ = 'https://ladakhvacation.in/packages/from/delhi';
const AT = '2026-09-14T10:00:00.000Z';

const doc = (head: string, main: string, lang = 'en') =>
  `<html lang="${lang}"><head>${head}</head><body><nav><a href="/">Home</a></nav><main>${main}</main></body></html>`;

const HEAD = [
  '<title>Kashmir Tour Packages from Delhi | Ladakh Vacation</title>',
  '<meta name="description" content="Kashmir trips from Delhi.">',
  '<meta name="viewport" content="width=device-width">',
  `<link rel="canonical" href="${URL_}">`,
  '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>',
].join('');

const MAIN = [
  '<h1>Kashmir from Delhi</h1>',
  '<p>From ₹18,500 per person.</p>',
  '<h2>What to skip in Srinagar</h2>',
  '<img src="/img/dal.jpg" alt="Dal Lake">',
  '<a href="/routes/delhi-to-srinagar">Delhi to Srinagar by road</a>',
].join('');

const analysis = (over: Partial<SitePageAnalysis> = {}): SitePageAnalysis => ({
  group: 'packages-from-city',
  groupSize: 47,
  uniqueShare: 0.7,
  specificPhrases: 400,
  nearest: { url: 'https://ladakhvacation.in/packages/from/agra', overlap: 0.3 },
  duplicateTitleOf: [],
  duplicateDescriptionOf: [],
  inboundPages: 12,
  inboundFromContent: 4,
  ...over,
});

function ctx(over: Partial<PageContext> = {}, html = doc(HEAD, MAIN)): PageContext {
  return {
    url: URL_,
    fetch: { status: 200, finalUrl: URL_, xRobotsTag: null, contentType: 'text/html', error: null },
    facts: parsePage(html, URL_),
    family: 'packages-from-city',
    targetKeyword: 'kashmir packages from delhi',
    pageType: 'commercial',
    robots: { state: 'ok', allowed: true, rule: null },
    inSitemap: true,
    site: analysis(),
    vitals: null,
    vitalsNote: 'PAGESPEED_API_KEY is not set',
    contentHash: 'aaa',
    dateModified: null,
    previous: null,
    siteHost: 'ladakhvacation.in',
    ...over,
  };
}

const find = (checks: CheckResult[], id: string): CheckResult => {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`No check ${id}`);
  return c;
};

describe('page checks', () => {
  it('passes a healthy package page on everything it can measure', () => {
    const checks = runPageChecks(ctx());
    const passing = [
      'http-status', 'robots-txt', 'noindex', 'canonical', 'in-sitemap', 'unique-content',
      'indexable-images', 'image-alt', 'specific-prices', 'honest-advice', 'title', 'title-unique',
      'query-coverage', 'meta-description', 'main-heading', 'structured-data', 'https',
      'mobile-viewport', 'inbound-links', 'content-links', 'anchor-text', 'crawlable-links',
    ];
    for (const id of passing) expect([id, find(checks, id).severity]).toEqual([id, 'pass']);
    expect(find(checks, 'author')).toMatchObject({ severity: 'na', na: 'not-applicable' });
    expect(find(checks, 'cwv-lcp')).toMatchObject({ severity: 'na', na: 'not-measured', detail: 'PAGESPEED_API_KEY is not set' });
    expect(checks.every((c) => c.severity === 'pass' || c.severity === 'na')).toBe(true);
    expect(checks.filter((c) => c.task)).toEqual([]);
  });

  describe('indexing gates', () => {
    it('fails on a noindex meta tag', () => {
      const html = doc(`${HEAD}<meta name="robots" content="noindex, follow">`, MAIN);
      expect(find(runPageChecks(ctx({}, html)), 'noindex')).toMatchObject({ severity: 'fail', gate: true });
    });

    it('reads X-Robots-Tag scoped to Googlebot and ignores other crawlers', () => {
      const header = (xRobotsTag: string) => ctx({ fetch: { ...ctx().fetch, xRobotsTag } });
      expect(find(runPageChecks(header('googlebot: noindex')), 'noindex').severity).toBe('fail');
      expect(find(runPageChecks(header('bingbot: noindex')), 'noindex').severity).toBe('pass');
    });

    it('stops after the gates when the page does not return 200', () => {
      const checks = runPageChecks(ctx({ fetch: { ...ctx().fetch, status: 404 }, facts: null }));
      expect(checks.map((c) => c.id)).toEqual(['http-status', 'robots-txt']);
      expect(checks[0]).toMatchObject({ severity: 'fail', gate: true, detail: 'HTTP 404' });
    });

    it('fails a URL that redirects elsewhere', () => {
      const fetch = { ...ctx().fetch, finalUrl: 'https://ladakhvacation.in/packages/delhi' };
      expect(find(runPageChecks(ctx({ fetch })), 'http-status').detail).toContain('Redirects to');
    });

    it('does not count a trailing slash as a redirect', () => {
      const fetch = { ...ctx().fetch, finalUrl: `${URL_}/` };
      expect(find(runPageChecks(ctx({ fetch })), 'http-status').severity).toBe('pass');
    });

    it('names the robots.txt rule that blocks the page', () => {
      const checks = runPageChecks(ctx({ robots: { state: 'ok', allowed: false, rule: '/packages/' } }));
      expect(find(checks, 'robots-txt')).toMatchObject({ severity: 'fail', gate: true });
      expect(find(checks, 'robots-txt').detail).toContain('/packages/');
    });
  });

  it('flags a canonical pointing elsewhere, a missing one, and conflicting ones', () => {
    const other = doc(HEAD.replace(URL_, 'https://ladakhvacation.in/packages'), MAIN);
    expect(find(runPageChecks(ctx({}, other)), 'canonical').severity).toBe('warn');
    const none = doc(HEAD.replace(/<link rel="canonical"[^>]*>/, ''), MAIN);
    expect(find(runPageChecks(ctx({}, none)), 'canonical').severity).toBe('warn');
    const two = doc(`${HEAD}<link rel="canonical" href="https://ladakhvacation.in/other">`, MAIN);
    expect(find(runPageChecks(ctx({}, two)), 'canonical').severity).toBe('fail');
  });

  describe('content specific to the page', () => {
    it('fails a near-copy of its family', () => {
      const c = find(runPageChecks(ctx({ site: analysis({ uniqueShare: 0.1, nearest: { url: 'https://ladakhvacation.in/packages/from/agra', overlap: 0.9 } }) })), 'unique-content');
      expect(c.severity).toBe('fail');
      expect(c.detail).toContain('10% of its text');
      expect(c.detail).toContain('/packages/from/agra');
      expect(c.task).toContain('doorway');
    });

    it('warns on a page with a moderate amount of shared text', () => {
      const c = find(runPageChecks(ctx({ site: analysis({ uniqueShare: 0.35, specificPhrases: 200 }) })), 'unique-content');
      expect(c.severity).toBe('warn');
    });

    it('fails a page with too little of its own text, whatever the share', () => {
      expect(find(runPageChecks(ctx({ site: analysis({ uniqueShare: 0.9, specificPhrases: 20 }) })), 'unique-content').severity).toBe('fail');
    });

    it('is not measured without crawl data', () => {
      const checks = runPageChecks(ctx({ site: null }));
      for (const id of ['unique-content', 'title-unique', 'inbound-links']) {
        expect(find(checks, id)).toMatchObject({ severity: 'na', na: 'not-measured' });
      }
    });
  });

  it('fails photos Google cannot index because they are CSS backgrounds', () => {
    const html = doc(HEAD, MAIN.replace(/<img[^>]*>/, '<div style="background-image:url(/hero.jpg)"></div>'));
    const checks = runPageChecks(ctx({}, html));
    expect(find(checks, 'indexable-images').severity).toBe('fail');
    expect(find(checks, 'indexable-images').task).toContain("doesn't index CSS background images");
    expect(find(checks, 'image-alt').severity).toBe('na');
  });

  describe('author on guides', () => {
    const guide = (head = HEAD, main = MAIN) => ctx({ pageType: 'editorial', family: 'guide-hotels' }, doc(head, main));

    it('fails a guide with no author', () => {
      expect(find(runPageChecks(guide()), 'author').severity).toBe('fail');
    });

    it('passes a named Person author or a visible byline', () => {
      const ld = `${HEAD}<script type="application/ld+json">{"@type":"Article","author":{"@type":"Person","name":"Tariq Ahmad"}}</script>`;
      expect(find(runPageChecks(guide(ld)), 'author')).toMatchObject({ severity: 'pass', detail: 'By Tariq Ahmad' });
      expect(find(runPageChecks(guide(HEAD, `${MAIN}<p>Reviewed by Tariq Ahmad in May</p>`)), 'author').severity).toBe('pass');
    });

    it('warns when only the business is credited', () => {
      expect(find(runPageChecks(guide(`${HEAD}<meta name="author" content="Ladakh Vacation">`)), 'author').severity).toBe('warn');
    });
  });

  it('fails a new updated date on unchanged content', () => {
    const changedDateOnly = ctx({ dateModified: '2026-09-14', previous: { contentHash: 'aaa', dateModified: '2026-09-01' } });
    expect(find(runPageChecks(changedDateOnly), 'honest-dates').severity).toBe('fail');
    const realEdit = ctx({ contentHash: 'bbb', dateModified: '2026-09-14', previous: { contentHash: 'aaa', dateModified: '2026-09-01' } });
    expect(find(runPageChecks(realEdit), 'honest-dates').severity).toBe('pass');
  });

  it('warns on a keyword-stuffed title and fails a duplicated one', () => {
    const stuffed = doc(HEAD.replace(/<title>.*<\/title>/, '<title>Kashmir Tours Kashmir Packages Kashmir Trip</title>'), MAIN);
    expect(find(runPageChecks(ctx({}, stuffed)), 'title').severity).toBe('warn');
    const dup = ctx({ site: analysis({ duplicateTitleOf: ['https://ladakhvacation.in/packages/from/agra'] }) });
    expect(find(runPageChecks(dup), 'title-unique')).toMatchObject({ severity: 'fail' });
  });

  it('matches search words by stem and lists what is missing', () => {
    expect(find(runPageChecks(ctx({ targetKeyword: 'kashmir package from delhi' })), 'query-coverage').severity).toBe('pass');
    const partial = find(runPageChecks(ctx({ targetKeyword: 'kashmir honeymoon packages' })), 'query-coverage');
    expect(partial).toMatchObject({ severity: 'warn', detail: 'Missing: honeymoon' });
  });

  describe('Core Web Vitals', () => {
    it('grades each metric from the data available', () => {
      const vitals = pickVitals(
        [['url-field', { lcpMs: 1800, inpMs: null, cls: 0.3 }], ['lab', { lcpMs: 5200, inpMs: null, cls: 0.01 }]],
        40,
        AT,
      );
      const checks = runPageChecks(ctx({ vitals, vitalsNote: null }));
      expect(find(checks, 'cwv-lcp')).toMatchObject({ severity: 'pass' });
      expect(find(checks, 'cwv-lcp').detail).toContain('real users of this page');
      expect(find(checks, 'cwv-cls')).toMatchObject({ severity: 'fail' });
      expect(find(checks, 'cwv-inp')).toMatchObject({ severity: 'na', na: 'not-measured' });
      expect(find(checks, 'cwv-inp').detail).toContain('cannot measure INP');
    });
  });

  it('expects hreflang on Hindi pages and skips English-only advice checks there', () => {
    const checks = runPageChecks(ctx({ family: 'hindi-mirror' }, doc(HEAD, MAIN, 'hi')));
    expect(find(checks, 'hreflang').severity).toBe('warn');
    expect(find(checks, 'honest-advice')).toMatchObject({ severity: 'na', detail: 'Hindi page' });
  });

  it('notes self-hosted business ratings without costing points', () => {
    const ld = `${HEAD}<script type="application/ld+json">{"@type":"TravelAgency","aggregateRating":{"ratingValue":4.8}}</script>`;
    const c = find(runPageChecks(ctx({}, doc(ld, MAIN))), 'review-markup');
    expect(c).toMatchObject({ severity: 'warn', weight: 0, score: 0 });
  });

  it('warns when content links use generic text', () => {
    const main = `${MAIN}${'<a href="/guides/a">Read more</a>'.repeat(3)}`;
    expect(find(runPageChecks(ctx({}, doc(HEAD, main))), 'anchor-text').severity).toBe('warn');
  });

  it('fails an orphan page', () => {
    expect(find(runPageChecks(ctx({ site: analysis({ inboundPages: 0, inboundFromContent: 0 }) })), 'inbound-links').severity).toBe('fail');
  });
});

describe('check helpers', () => {
  it('parses X-Robots-Tag', () => {
    expect(xRobotsDirectives('noindex, nofollow')).toEqual(['noindex', 'nofollow']);
    expect(xRobotsDirectives('googlebot: noindex, otherbot: nofollow')).toEqual(['noindex']);
    expect(xRobotsDirectives('unavailable_after: 2026-12-01')).toEqual(['unavailable_after: 2026-12-01']);
    expect(xRobotsDirectives(null)).toEqual([]);
  });

  it('classifies pages', () => {
    const article = parsePage(doc('<script type="application/ld+json">{"@type":"BlogPosting"}</script>', ''), URL_);
    expect(classifyPage('https://ladakhvacation.in/', null, null)).toBe('home');
    expect(classifyPage(URL_, 'guide-hotels', null)).toBe('editorial');
    expect(classifyPage(URL_, null, article)).toBe('editorial');
    expect(classifyPage(URL_, 'packages-from-city', null)).toBe('commercial');
    expect(classifyPage(URL_, null, null)).toBe('other');
  });

  it('stems plurals only', () => {
    expect(stem('packages')).toBe('package');
    expect(stem('cities')).toBe('city');
    expect(stem('glass')).toBe('glass');
    expect(stem('bus')).toBe('bus');
  });

  it('checks sitemap lastmod accuracy', () => {
    const stamped = Array.from({ length: 25 }, (_, i) => ({ loc: `https://x.in/${i}`, lastmod: '2026-09-14T12:18:06Z' }));
    expect(sitemapLastmodCheck(summariseLastmod(stamped))).toMatchObject({ severity: 'warn', scope: 'site' });
    expect(sitemapLastmodCheck(null)).toMatchObject({ severity: 'na', na: 'not-measured' });
  });
});
