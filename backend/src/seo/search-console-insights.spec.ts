import {
  BuildInput,
  DailyRow,
  IssueType,
  QueryRow,
  SearchReport,
  attachSearchData,
  buildSearchReport,
  comparisonWindows,
  coversQuery,
  toSitePath,
} from './search-console-insights';

const HOST = 'ladakhvacation.in';
const U = (path: string) => `https://${HOST}${path}`;
const NOW = new Date('2026-09-14T12:00:00Z');
const W = comparisonWindows(7, NOW);
const CUR = '2026-09-08';
const PREV = '2026-09-01';

const q = (
  date: string,
  path: string,
  query: string,
  clicks: number,
  impressions: number,
  position: number,
): QueryRow => ({ date, page: U(path), query, clicks, impressions, position });

const d = (date: string, key: string, clicks: number, impressions: number, position: number): DailyRow => ({
  date,
  key,
  clicks,
  impressions,
  position,
});

const input = (over: Partial<BuildInput>): BuildInput => ({
  days: 7,
  windows: W,
  siteHost: HOST,
  site: [],
  pages: [],
  devices: [],
  countries: [],
  queries: [],
  manifest: [],
  brandTerms: ['glitz'],
  ...over,
});

const ofType = (r: SearchReport, t: IssueType) => r.issues.filter((i) => i.type === t);

describe('comparisonWindows', () => {
  it('ends at the data-lag boundary and places the previous window directly before', () => {
    expect(W.current).toEqual({ from: '2026-09-05', to: '2026-09-11' });
    expect(W.previous).toEqual({ from: '2026-08-29', to: '2026-09-04' });
  });
});

describe('toSitePath', () => {
  it('reduces URLs to comparable site paths', () => {
    expect(toSitePath(U('/routes/a/'), HOST)).toBe('/routes/a');
    expect(toSitePath('https://www.ladakhvacation.in/routes/a?utm=x#faq', HOST)).toBe('/routes/a');
    expect(toSitePath(U('/'), HOST)).toBe('/');
    expect(toSitePath('/routes/a/', HOST)).toBe('/routes/a');
  });

  it('rejects another host and unparseable input', () => {
    expect(toSitePath('https://example.com/routes/a', HOST)).toBeNull();
    expect(toSitePath('not a url', HOST)).toBeNull();
    expect(toSitePath('', HOST)).toBeNull();
  });
});

describe('coversQuery', () => {
  it('ignores short words and requires every meaningful word', () => {
    expect(coversQuery('Gulmarg by Month | Ladakh Vacation', 'gulmarg in june')).toBe(false);
    expect(coversQuery('Gulmarg in June: Snow, Prices', 'gulmarg in june')).toBe(true);
  });
});

describe('buildSearchReport: totals', () => {
  it('takes headline totals from the site pull, not from query rows', () => {
    // Anonymized queries are missing from query rows, so their sum is too low.
    const r = buildSearchReport(
      input({ site: [d(CUR, '', 100, 5000, 10)], queries: [q(CUR, '/a', 'x', 30, 1000, 5)] }),
    );
    expect(r.overview.current.clicks).toBe(100);
    expect(r.overview.current.impressions).toBe(5000);
    expect(r.hasData).toBe(true);
  });

  it('aligns each day of the series with the same day of the previous window', () => {
    const r = buildSearchReport(
      input({ site: [d('2026-09-05', '', 5, 100, 10), d('2026-08-29', '', 3, 80, 11)] }),
    );
    expect(r.series).toHaveLength(7);
    expect(r.series[0]).toEqual({
      date: '2026-09-05',
      clicks: 5,
      impressions: 100,
      prevClicks: 3,
      prevImpressions: 80,
    });
  });

  it('reports no previous data rather than a fake zero comparison', () => {
    const r = buildSearchReport(input({ site: [d(CUR, '', 10, 100, 5)] }));
    expect(r.hasPrevious).toBe(false);
    expect(r.series[0].prevClicks).toBeNull();
    expect(r.overview.delta.ctr).toBeNull();
    expect(ofType(r, 'declining_page')).toHaveLength(0);
  });

  it('splits brand and non-brand queries', () => {
    const r = buildSearchReport(
      input({
        queries: [q(CUR, '/', 'glitz holidays', 50, 60, 1), q(CUR, '/k', 'kashmir tour', 10, 500, 6)],
      }),
    );
    expect(r.brand.brand.clicks).toBe(50);
    expect(r.brand.nonBrand.clicks).toBe(10);
    expect(r.topQueries.find((x) => x.key === 'glitz holidays')?.brand).toBe(true);
  });

  it('labels devices', () => {
    const r = buildSearchReport(
      input({ devices: [d(CUR, 'MOBILE', 10, 500, 9), d(CUR, 'DESKTOP', 5, 300, 7)] }),
    );
    expect(r.devices[0]).toMatchObject({ key: 'MOBILE', label: 'Mobile' });
  });

  it('reports the first day that has data', () => {
    const r = buildSearchReport(
      input({ site: [d('2026-09-07', '', 0, 0, 0), d('2026-09-08', '', 1, 10, 5), d('2026-09-09', '', 2, 20, 5)] }),
    );
    expect(r.dataFrom).toBe('2026-09-08');
  });
});

describe('buildSearchReport: issues', () => {
  it('detects cannibalisation and picks the page with the most clicks as primary', () => {
    const r = buildSearchReport(
      input({
        queries: [
          q(CUR, '/routes/delhi-to-srinagar', 'delhi to srinagar', 20, 400, 6),
          q(CUR, '/routes/delhi-to-kashmir', 'delhi to srinagar', 5, 300, 9),
          // 2.8% share: too small to count as a competing page.
          q(CUR, '/packages', 'delhi to srinagar', 0, 20, 40),
        ],
      }),
    );
    const [issue] = ofType(r, 'cannibalisation');
    expect(issue).toBeDefined();
    expect(issue.path).toBe('/routes/delhi-to-srinagar');
    expect(issue.pages).toHaveLength(2);
    expect(issue.severity).toBe('high');
    expect(issue.impact).toBe(300);
    expect(issue.action).toContain('301-redirect');

    const loser = r.pageSummaries.find((s) => s.path === '/routes/delhi-to-kashmir');
    expect(loser?.issues[0].title).toContain('Competes with /routes/delhi-to-srinagar');
  });

  it('does not call a minor secondary page cannibalisation', () => {
    const r = buildSearchReport(
      input({ queries: [q(CUR, '/a', 'x query', 10, 900, 3), q(CUR, '/b', 'x query', 0, 50, 30)] }),
    );
    expect(ofType(r, 'cannibalisation')).toHaveLength(0);
  });

  it('flags low CTR against the site own position benchmark', () => {
    const filler = Array.from({ length: 20 }, (_, i) => q(CUR, `/p${i}`, `filler ${i}`, 10, 100, 2));
    const r = buildSearchReport(
      input({ queries: [...filler, q(CUR, '/low', 'kashmir tour cost', 5, 500, 2)] }),
    );
    expect(r.ctrBenchmarks['1-3']).toBe(8.2);
    const low = ofType(r, 'low_ctr');
    expect(low).toHaveLength(1);
    expect(low[0].path).toBe('/low');
    expect(low[0].severity).toBe('medium');
    expect(low[0].impact).toBe(36);
  });

  it('skips low CTR when a position bucket has too little data to benchmark', () => {
    const r = buildSearchReport(input({ queries: [q(CUR, '/low', 'kashmir tour cost', 1, 900, 2)] }));
    expect(r.ctrBenchmarks['1-3']).toBeNull();
    expect(ofType(r, 'low_ctr')).toHaveLength(0);
  });

  it('flags striking distance and tailors the action to the page title', () => {
    const r = buildSearchReport(
      input({
        queries: [
          q(CUR, '/guides/gulmarg-by-month', 'gulmarg in june', 1, 200, 12),
          q(CUR, '/x', 'far query', 0, 1000, 25),
        ],
        manifest: [{ url: '/guides/gulmarg-by-month', title: 'Gulmarg by Month | Ladakh Vacation' }],
      }),
    );
    const sd = ofType(r, 'striking_distance');
    expect(sd).toHaveLength(1);
    expect(sd[0].severity).toBe('low');
    expect(sd[0].action).toMatch(/^Add "gulmarg in june" to the title/);
  });

  it('flags a declining page from page-level totals', () => {
    const r = buildSearchReport(
      input({ pages: [d(PREV, U('/routes/a'), 100, 2000, 5), d(CUR, U('/routes/a'), 40, 1900, 5)] }),
    );
    const [issue] = ofType(r, 'declining_page');
    expect(issue.severity).toBe('high');
    expect(issue.metrics.dropPct).toBe(60);
    expect(ofType(r, 'position_drop')).toHaveLength(0);
  });

  it('flags a position drop that leaves page one as high', () => {
    const r = buildSearchReport(
      input({ pages: [d(PREV, U('/routes/b'), 20, 500, 8), d(CUR, U('/routes/b'), 19, 500, 14)] }),
    );
    expect(ofType(r, 'declining_page')).toHaveLength(0);
    const [issue] = ofType(r, 'position_drop');
    expect(issue.severity).toBe('high');
  });

  it('flags a lost query and names the page that used to rank', () => {
    const r = buildSearchReport(
      input({ queries: [q(PREV, '/x', 'kashmir houseboat price', 10, 100, 4)] }),
    );
    const [issue] = ofType(r, 'lost_query');
    expect(issue.path).toBe('/x');
    expect(issue.metrics.previousClicks).toBe(10);
  });

  it('reports new queries as info', () => {
    const r = buildSearchReport(
      input({
        queries: [q(CUR, '/y', 'sonmarg zero point', 2, 80, 9), q(PREV, '/y', 'other', 0, 10, 30)],
      }),
    );
    const [issue] = ofType(r, 'new_query');
    expect(issue.severity).toBe('info');
    expect(ofType(r, 'lost_query')).toHaveLength(0);
  });

  it('flags planned pages with no impressions, prioritised by tier and demand', () => {
    const r = buildSearchReport(
      input({
        pages: [d(CUR, U('/routes/a'), 5, 100, 8)],
        manifest: [
          { url: '/routes/a', tier: 1 },
          { url: '/routes/dark', tier: 1, impr: 900 },
          { url: '/guides/x', tier: 4 },
        ],
      }),
    );
    const nv = ofType(r, 'no_visibility');
    // One grouped issue, so a young domain's many unindexed pages don't bury everything else.
    expect(nv).toHaveLength(1);
    expect(nv[0].severity).toBe('medium');
    expect(nv[0].pages?.map((p) => p.path)).toEqual(['/routes/dark', '/guides/x']);
    expect(nv[0].impact).toBe(0);
    // Each page still gets its own task, at its own severity.
    expect(r.pageSummaries.find((x) => x.path === '/routes/dark')?.issues[0]).toMatchObject({
      type: 'no_visibility',
      severity: 'medium',
    });
    expect(r.pageSummaries.find((x) => x.path === '/guides/x')?.issues[0]).toMatchObject({
      type: 'no_visibility',
      severity: 'low',
    });
  });

  it('does not judge visibility without the page-level pull', () => {
    const r = buildSearchReport(
      input({ queries: [q(CUR, '/routes/a', 'x', 1, 100, 5)], manifest: [{ url: '/routes/dark', tier: 1 }] }),
    );
    expect(ofType(r, 'no_visibility')).toHaveLength(0);
  });

  it('flags a page Google does not show for its own target query', () => {
    const r = buildSearchReport(
      input({
        queries: [q(CUR, '/routes/delhi-to-kashmir', 'delhi to srinagar', 3, 200, 7)],
        manifest: [{ url: '/routes/delhi-to-srinagar', primary: 'Delhi to Srinagar' }],
      }),
    );
    const [issue] = ofType(r, 'off_target');
    expect(issue.path).toBe('/routes/delhi-to-srinagar');
    expect(issue.metrics.shownPath).toBe('/routes/delhi-to-kashmir');
  });

  it('keeps specific issues above the grouped visibility issue', () => {
    const r = buildSearchReport(
      input({
        pages: [d(CUR, U('/routes/delhi-to-kashmir'), 3, 200, 7)],
        queries: [q(CUR, '/routes/delhi-to-kashmir', 'delhi to srinagar', 3, 200, 7)],
        manifest: [{ url: '/routes/delhi-to-srinagar', primary: 'Delhi to Srinagar', tier: 1 }],
      }),
    );
    const types = r.issues.map((i) => i.type);
    expect(types).toContain('no_visibility');
    expect(types.indexOf('off_target')).toBeLessThan(types.indexOf('no_visibility'));
  });

  it('orders issues by severity, then impact', () => {
    const r = buildSearchReport(
      input({
        pages: [d(PREV, U('/routes/a'), 100, 2000, 5), d(CUR, U('/routes/a'), 40, 1900, 5)],
        queries: [q(CUR, '/g', 'gulmarg in june', 1, 200, 12)],
      }),
    );
    const rank = { high: 0, medium: 1, low: 2, info: 3 };
    const seq = r.issues.map((i) => rank[i.severity]);
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
    expect(new Set(r.issues.map((i) => i.severity))).toEqual(new Set(['high', 'low', 'info']));
  });
});

describe('attachSearchData', () => {
  it('adds figures and issues as tasks without touching the score', () => {
    const report = buildSearchReport(
      input({ pages: [d(PREV, U('/routes/a'), 100, 2000, 5), d(CUR, U('/routes/a'), 40, 1900, 5)] }),
    );
    const out = attachSearchData(
      {
        rankings: [
          { url: U('/routes/a'), path: '/routes/a', score: 80, tasks: [{ id: 't1' }] },
          { url: U('/none'), path: '/none', score: 70, tasks: [] },
        ],
      },
      report,
    );
    expect(out.rankings[0].score).toBe(80);
    expect(out.rankings[0].search!.clicks).toBe(40);
    expect(out.rankings[0].search!.issueCount).toBe(1);
    expect(out.rankings[0].tasks).toHaveLength(2);
    expect(out.rankings[0].tasks[1]).toMatchObject({ category: 'search-console', severity: 'fail' });
    expect(out.rankings[1].search).toBeNull();
  });
});
