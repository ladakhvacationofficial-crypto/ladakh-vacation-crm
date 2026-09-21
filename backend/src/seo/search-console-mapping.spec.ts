import {
  DATA_LAG_DAYS,
  MAX_PAGE_LEN,
  SYNC_DIMENSIONS,
  assertIsoDate,
  ctrToPercent,
  defaultWindow,
  isoDay,
  mapRow,
  mapRows,
  normalisePropertyUrl,
  normalizePageUrl,
  rollupByPage,
  strikingDistance,
} from './search-console-mapping';

/** A response row shaped exactly as the API returns it. */
const apiRow = (
  date: string,
  page: string,
  query: string,
  clicks: number,
  impressions: number,
  ctr: number,
  position: number,
) => ({ keys: [date, page, query], clicks, impressions, ctr, position });

describe('search console mapping', () => {
  /**
   * The API returns CTR as a fraction. Every consumer on our side expects a
   * percent: calculatePageSignalPoints awards points at ctr >= 5 and >= 2, so
   * storing the raw fraction would make a genuinely excellent 8% CTR score zero
   * forever with nothing erroring.
   */
  describe('ctrToPercent', () => {
    it('converts the API fraction to a percent', () => {
      expect(ctrToPercent(0.0817)).toBe(8.17);
      expect(ctrToPercent(0.5)).toBe(50);
      expect(ctrToPercent(1)).toBe(100);
    });

    it('produces a value the scoring bands actually recognise', () => {
      // 8% CTR must clear the >= 5 band, not fall under it as 0.08.
      expect(ctrToPercent(0.08)).toBeGreaterThanOrEqual(5);
      expect(ctrToPercent(0.03)).toBeGreaterThanOrEqual(2);
      expect(ctrToPercent(0.03)).toBeLessThan(5);
    });

    it('treats missing, negative and unparseable values as zero', () => {
      expect(ctrToPercent(undefined)).toBe(0);
      expect(ctrToPercent(null)).toBe(0);
      expect(ctrToPercent(-0.5)).toBe(0);
      expect(ctrToPercent('abc')).toBe(0);
    });
  });

  describe('mapRow', () => {
    it('reads keys positionally against the requested dimensions', () => {
      const r = mapRow(
        apiRow('2026-09-01', 'https://ladakhvacation.in/packages/from/delhi', 'kashmir package from delhi', 12, 340, 0.0353, 8.4),
      )!;
      expect(r.date).toBe('2026-09-01');
      expect(r.page).toBe('https://ladakhvacation.in/packages/from/delhi');
      expect(r.query).toBe('kashmir package from delhi');
      expect(r.clicks).toBe(12);
      expect(r.impressions).toBe(340);
      expect(r.ctr).toBe(3.53);
      expect(r.position).toBe(8.4);
    });

    it('returns null rather than writing a row keyed on an empty string', () => {
      expect(mapRow({ keys: [] })).toBeNull();
      expect(mapRow({ keys: ['2026-09-01'] })).toBeNull();
      expect(mapRow({ keys: ['', 'https://x/', 'q'] })).toBeNull();
      expect(mapRow({})).toBeNull();
    });

    it('keeps a zero-click row, which is the common case', () => {
      const r = mapRow(apiRow('2026-09-01', 'https://x/p', 'q', 0, 500, 0, 42.1))!;
      expect(r.clicks).toBe(0);
      expect(r.impressions).toBe(500);
      expect(r.ctr).toBe(0);
    });

    it('truncates a page URL so the natural-key index stays in bounds', () => {
      const long = 'https://ladakhvacation.in/' + 'x'.repeat(900);
      const r = mapRow(apiRow('2026-09-01', long, 'q', 0, 1, 0, 50))!;
      expect(r.page.length).toBe(MAX_PAGE_LEN);
    });

    it('honours a different dimension order', () => {
      const dims = ['page', 'date', 'query'] as const;
      const r = mapRow({ keys: ['https://x/p', '2026-09-01', 'q'], clicks: 1, impressions: 2, ctr: 0.5, position: 3 }, dims)!;
      expect(r.date).toBe('2026-09-01');
      expect(r.page).toBe('https://x/p');
    });
  });

  describe('mapRows', () => {
    it('drops unusable rows and keeps the rest', () => {
      const out = mapRows([
        apiRow('2026-09-01', 'https://x/a', 'q1', 1, 10, 0.1, 5),
        { keys: [] },
        apiRow('2026-09-01', 'https://x/b', 'q2', 2, 20, 0.1, 6),
      ]);
      expect(out).toHaveLength(2);
    });

    it('is empty for a response with no rows', () => {
      expect(mapRows(undefined)).toEqual([]);
      expect(mapRows(null)).toEqual([]);
      expect(mapRows([])).toEqual([]);
    });
  });

  describe('rollupByPage', () => {
    const rows = mapRows([
      apiRow('2026-09-01', 'https://x/a', 'big query', 5, 1000, 0.005, 12),
      // A single impression that converted. A mean of CTRs would read this as
      // 100% and drag the page's CTR into fiction.
      apiRow('2026-09-01', 'https://x/a', 'tiny query', 1, 1, 1.0, 2),
      apiRow('2026-09-01', 'https://x/b', 'other', 3, 100, 0.03, 9),
    ]);

    it('recomputes CTR from totals rather than averaging per-query CTRs', () => {
      const a = rollupByPage(rows).find((r) => r.page === 'https://x/a')!;
      expect(a.clicks).toBe(6);
      expect(a.impressions).toBe(1001);
      // 6/1001 = 0.599%, not the ~50% a naive mean of 0.5% and 100% would give.
      expect(a.ctr).toBeCloseTo(0.6, 1);
      expect(a.ctr).toBeLessThan(1);
    });

    it('weights position by impressions', () => {
      const a = rollupByPage(rows).find((r) => r.page === 'https://x/a')!;
      // (12*1000 + 2*1) / 1001 sits just under 12, not the 7 a plain mean gives.
      expect(a.position).toBeGreaterThan(11.9);
      expect(a.position).toBeLessThan(12);
    });

    it('counts distinct queries per page', () => {
      const a = rollupByPage(rows).find((r) => r.page === 'https://x/a')!;
      expect(a.queryCount).toBe(2);
    });

    it('handles a page with zero impressions without dividing by zero', () => {
      const out = rollupByPage(mapRows([apiRow('2026-09-01', 'https://x/z', 'q', 0, 0, 0, 0)]));
      expect(out[0].ctr).toBe(0);
      expect(out[0].position).toBe(0);
    });
  });

  describe('strikingDistance', () => {
    it('surfaces positions 11-20 with real impressions, best first', () => {
      const rows = mapRows([
        apiRow('2026-09-01', 'https://x/a', 'page one already', 50, 900, 0.055, 4.2),
        apiRow('2026-09-01', 'https://x/b', 'close to page one', 2, 800, 0.0025, 12.5),
        apiRow('2026-09-01', 'https://x/c', 'also close', 1, 200, 0.005, 18.0),
        apiRow('2026-09-01', 'https://x/d', 'nobody searches this', 0, 3, 0, 13.0),
        apiRow('2026-09-01', 'https://x/e', 'buried', 0, 500, 0, 47.0),
      ]);
      const out = strikingDistance(rows);
      expect(out.map((r) => r.query)).toEqual(['close to page one', 'also close']);
    });

    it('excludes rows with no query dimension', () => {
      const rows = mapRows([apiRow('2026-09-01', 'https://x/a', '', 0, 500, 0, 12)]);
      expect(strikingDistance(rows)).toHaveLength(0);
    });

    it('respects custom bounds', () => {
      const rows = mapRows([apiRow('2026-09-01', 'https://x/a', 'q', 0, 100, 0, 25)]);
      expect(strikingDistance(rows)).toHaveLength(0);
      expect(strikingDistance(rows, { maxPosition: 30 })).toHaveLength(1);
    });
  });

  describe('defaultWindow', () => {
    it('ends behind today, because Search Console data lags', () => {
      const now = new Date('2026-09-14T12:00:00Z');
      const { from, to } = defaultWindow(7, now);
      expect(to).toBe('2026-09-11'); // 14 - 3
      expect(from).toBe('2026-09-05'); // 7 days inclusive
      expect(DATA_LAG_DAYS).toBe(3);
    });

    it('crosses a month boundary correctly', () => {
      const { from } = defaultWindow(7, new Date('2026-09-04T00:00:00Z'));
      expect(from).toBe('2026-08-26');
    });

    it('collapses to one day for a window of one', () => {
      const { from, to } = defaultWindow(1, new Date('2026-09-14T00:00:00Z'));
      expect(from).toBe(to);
    });
  });

  describe('assertIsoDate', () => {
    it('accepts YYYY-MM-DD and rejects everything else', () => {
      expect(assertIsoDate('2026-09-14')).toBe('2026-09-14');
      expect(() => assertIsoDate('14/09/2026')).toThrow();
      expect(() => assertIsoDate('2026-9-1')).toThrow();
      expect(() => assertIsoDate('')).toThrow();
      expect(() => assertIsoDate(undefined as any)).toThrow();
    });
  });

  describe('normalisePropertyUrl', () => {
    it('keeps the trailing slash a URL-prefix property requires', () => {
      // Without the slash the API answers 403, not a useful error.
      expect(normalisePropertyUrl('https://ladakhvacation.in')).toBe('https://ladakhvacation.in/');
      expect(normalisePropertyUrl('https://ladakhvacation.in/')).toBe('https://ladakhvacation.in/');
    });

    it('passes an explicit domain property through untouched', () => {
      expect(normalisePropertyUrl('sc-domain:ladakhvacation.in')).toBe('sc-domain:ladakhvacation.in');
    });

    it('treats a bare hostname as a domain property', () => {
      expect(normalisePropertyUrl('ladakhvacation.in')).toBe('sc-domain:ladakhvacation.in');
      expect(normalisePropertyUrl('  ladakhvacation.in  ')).toBe('sc-domain:ladakhvacation.in');
    });

    it('returns empty for empty input rather than a broken property string', () => {
      expect(normalisePropertyUrl('')).toBe('');
      expect(normalisePropertyUrl(undefined as any)).toBe('');
    });
  });

  describe('normalizePageUrl', () => {
    it('strips trailing slashes from non-root URLs', () => {
      expect(normalizePageUrl('https://ladakhvacation.in/packages/from/delhi/')).toBe(
        'https://ladakhvacation.in/packages/from/delhi',
      );
      expect(normalizePageUrl('/packages/from/delhi/')).toBe('/packages/from/delhi');
    });

    it('preserves root slash', () => {
      expect(normalizePageUrl('https://ladakhvacation.in/')).toBe('https://ladakhvacation.in/');
      expect(normalizePageUrl('/')).toBe('/');
    });

    it('strips query params and hash fragments', () => {
      expect(normalizePageUrl('https://ladakhvacation.in/packages?utm_source=ads#faq')).toBe(
        'https://ladakhvacation.in/packages',
      );
    });

    it('handles empty or whitespace gracefully', () => {
      expect(normalizePageUrl('')).toBe('');
      expect(normalizePageUrl('   ')).toBe('');
    });
  });

  describe('rollupByPage', () => {
    it('merges slash and non-slash variants of the same page', () => {
      const rows = [
        {
          date: '2026-09-10',
          page: 'https://ladakhvacation.in/packages/from/delhi/',
          query: 'delhi to srinagar',
          clicks: 10,
          impressions: 100,
          ctr: 10,
          position: 5,
        },
        {
          date: '2026-09-10',
          page: 'https://ladakhvacation.in/packages/from/delhi',
          query: 'delhi to kashmir package',
          clicks: 5,
          impressions: 50,
          ctr: 10,
          position: 8,
        },
      ];
      const rollups = rollupByPage(rows);
      expect(rollups.length).toBe(1);
      expect(rollups[0].page).toBe('https://ladakhvacation.in/packages/from/delhi');
      expect(rollups[0].clicks).toBe(15);
      expect(rollups[0].impressions).toBe(150);
      expect(rollups[0].queryCount).toBe(2);
    });
  });

  describe('isoDay', () => {
    it('formats in UTC', () => {
      expect(isoDay(new Date('2026-09-14T23:59:59Z'))).toBe('2026-09-14');
    });
  });

  it('keeps SYNC_DIMENSIONS in the order mapRow reads them', () => {
    expect([...SYNC_DIMENSIONS]).toEqual(['date', 'page', 'query']);
  });
});
