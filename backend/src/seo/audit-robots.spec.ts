import { checkRobots, parseRobots } from './audit-robots';

const allowed = (txt: string, path: string, agent = 'googlebot') =>
  checkRobots(parseRobots(txt), agent, path).allowed;

describe('robots.txt matching', () => {
  it('allows everything when there are no rules', () => {
    expect(allowed('', '/anything')).toBe(true);
  });

  it('reads the live Ladakh Vacation robots.txt', () => {
    const txt = [
      'User-Agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /_next/',
      '',
      'Host: https://ladakhvacation.in',
      'Sitemap: https://ladakhvacation.in/sitemap.xml',
    ].join('\n');
    expect(parseRobots(txt).sitemaps).toEqual(['https://ladakhvacation.in/sitemap.xml']);
    expect(allowed(txt, '/packages/from/delhi')).toBe(true);
    expect(allowed(txt, '/api/leads')).toBe(false);
    expect(allowed(txt, '/_next/static/app.js')).toBe(false);
  });

  // Examples from Google's robots.txt documentation.
  it('lets the longest matching rule win', () => {
    expect(allowed('User-agent: *\nAllow: /p\nDisallow: /', '/page')).toBe(true);
    expect(allowed('User-agent: *\nAllow: /page\nDisallow: /*.htm', '/page.htm')).toBe(false);
  });

  it('prefers the least restrictive rule when lengths tie', () => {
    expect(allowed('User-agent: *\nAllow: /folder\nDisallow: /folder', '/folder/page')).toBe(true);
  });

  it('supports * and a trailing $', () => {
    const root = 'User-agent: *\nAllow: /$\nDisallow: /';
    expect(allowed(root, '/')).toBe(true);
    expect(allowed(root, '/page.htm')).toBe(false);

    const pdf = 'User-agent: *\nDisallow: /*.pdf$';
    expect(allowed(pdf, '/files/brochure.pdf')).toBe(false);
    expect(allowed(pdf, '/files/brochure.pdf?v=2')).toBe(true);
  });

  it('uses the most specific user-agent group and combines repeats of it', () => {
    const txt = [
      'User-agent: *',
      'Disallow: /',
      '',
      'User-agent: Googlebot',
      'Disallow: /private',
      '',
      'User-agent: googlebot',
      'Disallow: /tmp',
    ].join('\n');
    expect(allowed(txt, '/public')).toBe(true);
    expect(allowed(txt, '/private/x')).toBe(false);
    expect(allowed(txt, '/tmp/x')).toBe(false);
    expect(allowed(txt, '/public', 'bingbot')).toBe(false);
  });

  it('shares one group across consecutive user-agent lines', () => {
    expect(allowed('User-agent: otherbot\nUser-agent: googlebot\nDisallow: /x', '/x/1')).toBe(false);
  });

  it('treats an empty disallow as no restriction and ignores comments', () => {
    expect(allowed('User-agent: * # everyone\nDisallow: # nothing', '/anything')).toBe(true);
  });

  it('matches paths case-sensitively', () => {
    expect(allowed('User-agent: *\nDisallow: /Private', '/private')).toBe(true);
  });

  it('reports the deciding rule', () => {
    const verdict = checkRobots(parseRobots('User-agent: *\nDisallow: /api/'), 'googlebot', '/api/x');
    expect(verdict.rule).toEqual({ allow: false, path: '/api/' });
  });
});
