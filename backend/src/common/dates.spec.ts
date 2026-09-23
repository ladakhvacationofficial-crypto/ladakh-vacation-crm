import { parseTravelDate, determineSeason, toDateOrNull } from './dates';

describe('dates helper & parseTravelDate', () => {
  it('handles null and undefined gracefully', () => {
    expect(toDateOrNull(null)).toBeNull();
    expect(toDateOrNull(undefined)).toBeNull();
    expect(parseTravelDate(null).date).toBeNull();
  });

  it('parses standard ISO date strings', () => {
    const res = parseTravelDate('2026-07-20');
    expect(res.date).not.toBeNull();
    expect(res.season).toBe('PRIME');
    expect(res.isExtracted).toBe(false);
  });

  it('parses natural month names like "September"', () => {
    const res = parseTravelDate('September');
    expect(res.date).not.toBeNull();
    expect(res.date?.getMonth()).toBe(8); // September is 8 (0-indexed)
    expect(res.season).toBe('PRIME');
    expect(res.isExtracted).toBe(true);
  });

  it('parses "Next Month" relative phrase', () => {
    const res = parseTravelDate('Next Month');
    expect(res.date).not.toBeNull();
    expect(res.isExtracted).toBe(true);
  });

  it('parses month with day like "15th August"', () => {
    const res = parseTravelDate('15th August');
    expect(res.date?.getMonth()).toBe(7); // August is 7
    expect(res.date?.getDate()).toBe(15);
    expect(res.season).toBe('PRIME');
  });

  it('correctly classifies seasons', () => {
    expect(determineSeason(new Date('2026-06-15'))).toBe('PRIME');
    expect(determineSeason(new Date('2026-04-20'))).toBe('SHOULDER');
    expect(determineSeason(new Date('2026-10-10'))).toBe('SHOULDER');
    expect(determineSeason(new Date('2026-01-15'))).toBe('WINTER');
  });
});
