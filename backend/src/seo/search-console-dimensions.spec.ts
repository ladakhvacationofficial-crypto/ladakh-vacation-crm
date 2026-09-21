import { mapDimensionRows, mergeDimensionRows } from './search-console-mapping';

describe('mapDimensionRows', () => {
  it('maps a site-level pull with an empty key', () => {
    const [r] = mapDimensionRows([{ keys: ['2026-09-01'], clicks: 3, impressions: 40, ctr: 0.075, position: 8.25 }], ['date']);
    expect(r).toEqual({ date: '2026-09-01', key: '', clicks: 3, impressions: 40, ctr: 7.5, position: 8.25 });
  });

  it('normalises page keys so slash variants share a key', () => {
    const [r] = mapDimensionRows(
      [{ keys: ['2026-09-01', 'https://ladakhvacation.in/routes/a/?x=1'], clicks: 1, impressions: 10, ctr: 0.1, position: 5 }],
      ['date', 'page'],
    );
    expect(r.key).toBe('https://ladakhvacation.in/routes/a');
  });

  it('keeps device and country keys as returned', () => {
    const rows = mapDimensionRows(
      [
        { keys: ['2026-09-01', 'MOBILE'], clicks: 1, impressions: 2, ctr: 0.5, position: 3 },
        { keys: ['2026-09-01', 'ind'], clicks: 1, impressions: 2, ctr: 0.5, position: 3 },
      ],
      ['date', 'device'],
    );
    expect(rows.map((r) => r.key)).toEqual(['MOBILE', 'ind']);
  });

  it('drops rows without a date or without the dimension key', () => {
    expect(mapDimensionRows([{ keys: [] }], ['date'])).toEqual([]);
    expect(mapDimensionRows([{ keys: ['2026-09-01', ''] }], ['date', 'page'])).toEqual([]);
    expect(mapDimensionRows(null, ['date'])).toEqual([]);
  });
});

describe('mergeDimensionRows', () => {
  it('merges duplicate date and key rows, weighting position by impressions', () => {
    const [m] = mergeDimensionRows([
      { date: '2026-09-01', key: 'https://x/a', clicks: 10, impressions: 100, ctr: 10, position: 4 },
      { date: '2026-09-01', key: 'https://x/a', clicks: 0, impressions: 300, ctr: 0, position: 8 },
    ]);
    expect(m.clicks).toBe(10);
    expect(m.impressions).toBe(400);
    expect(m.ctr).toBe(2.5);
    expect(m.position).toBe(7);
  });
});
