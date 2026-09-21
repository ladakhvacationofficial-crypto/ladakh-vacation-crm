import { parsePsi, rateVital, vitalsFromOrigin, vitalsFromPsi } from './audit-vitals';

const AT = '2026-09-14T10:00:00.000Z';

const clsBuckets = [
  { min: 0, max: 10, proportion: 0.6 },
  { min: 10, max: 25, proportion: 0.3 },
  { min: 25, proportion: 0.1 },
];

const psi = {
  loadingExperience: {
    id: 'https://ladakhvacation.in/packages/from/delhi',
    origin_fallback: false,
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2400, category: 'FAST' },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 20, distributions: clsBuckets, category: 'AVERAGE' },
    },
  },
  originLoadingExperience: {
    id: 'https://ladakhvacation.in',
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3000 },
      INTERACTION_TO_NEXT_PAINT: { percentile: 350 },
    },
  },
  lighthouseResult: {
    categories: { performance: { score: 0.62 } },
    audits: {
      'largest-contentful-paint': { numericValue: 5100.4 },
      'cumulative-layout-shift': { numericValue: 0.02 },
      'total-blocking-time': { numericValue: 900 },
    },
  },
};

describe('Core Web Vitals from PageSpeed Insights', () => {
  it('rates at the web.dev thresholds', () => {
    expect(rateVital('lcpMs', 2500)).toBe('good');
    expect(rateVital('lcpMs', 2501)).toBe('needs-improvement');
    expect(rateVital('lcpMs', 4001)).toBe('poor');
    expect(rateVital('inpMs', 200)).toBe('good');
    expect(rateVital('inpMs', 500)).toBe('needs-improvement');
    expect(rateVital('cls', 0.1)).toBe('good');
    expect(rateVital('cls', 0.26)).toBe('poor');
  });

  it('prefers this URL\'s field data, then the origin, per metric', () => {
    const v = vitalsFromPsi(parsePsi(psi), AT);
    expect(v.lcpMs).toEqual({ value: 2400, source: 'url-field', rating: 'good' });
    expect(v.inpMs).toEqual({ value: 350, source: 'origin-field', rating: 'needs-improvement' });
    expect(v.labPerformance).toBe(62);
    expect(v.measuredAt).toBe(AT);
  });

  it('reads field CLS reported multiplied by 100', () => {
    expect(vitalsFromPsi(parsePsi(psi), AT).cls).toEqual({ value: 0.2, source: 'url-field', rating: 'needs-improvement' });
  });

  it('reads field CLS as-is when the buckets are unscaled', () => {
    const parsed = parsePsi({
      loadingExperience: {
        metrics: {
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 0.05, distributions: [{ min: 0, max: 0.1 }, { min: 0.1, max: 0.25 }] },
        },
      },
    });
    expect(parsed.url?.cls).toBe(0.05);
  });

  it('falls back to the lab for LCP and CLS but never invents INP', () => {
    const v = vitalsFromPsi(parsePsi({ lighthouseResult: psi.lighthouseResult }), AT);
    expect(v.lcpMs).toEqual({ value: 5100, source: 'lab', rating: 'poor' });
    expect(v.cls).toEqual({ value: 0.02, source: 'lab', rating: 'good' });
    expect(v.inpMs).toBeNull();
  });

  it('treats an origin fallback in loadingExperience as origin data', () => {
    const parsed = parsePsi({
      loadingExperience: { origin_fallback: true, metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2000 } } },
    });
    expect(parsed.url).toBeNull();
    expect(vitalsFromPsi(parsed, AT).lcpMs?.source).toBe('origin-field');
  });

  it('builds vitals for untested pages from origin data alone', () => {
    const origin = parsePsi(psi).origin!;
    const v = vitalsFromOrigin(origin, AT);
    expect(v.lcpMs?.source).toBe('origin-field');
    expect(v.labPerformance).toBeNull();
  });

  it('returns nothing from an error response', () => {
    const parsed = parsePsi({ error: { code: 429 } });
    expect(parsed).toEqual({ url: null, origin: null, lab: null, labPerformance: null });
  });
});
