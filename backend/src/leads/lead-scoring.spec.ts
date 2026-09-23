import { LeadSource } from '@prisma/client';
import { scoreLead } from './lead-scoring';

describe('scoreLead — Category-Ceiling & Dynamic Floor Scoring', () => {
  it('prevents a thin ad lead from reaching warm/hot scores', () => {
    const res = scoreLead({
      source: LeadSource.GOOGLE_ADS,
      gclid: 'CjwKCAjw_Click123',
      // No travel date, no duration, no pax, no budget, no message
    });

    // Cat 1: base(5) + google_ads(13) + paid-click(4) = 22
    // Cat 2: 0
    // Cat 3: 0
    // Cat 4: phone(5)
    // Total = 27
    expect(res.score).toBeLessThanOrEqual(30);
    expect(res.notes).toContain('Intent: 22/25');
    expect(res.notes).toContain('Trip: 0/35');
    expect(res.notes).toContain('Budget: 0/30 (unspecified (+0))');
  });

  it('rewards a fully specified website trip planner inquiry', () => {
    const res = scoreLead({
      source: LeadSource.WEBSITE,
      email: 'traveler@example.com',
      destination: 'Leh, Nubra & Pangong',
      travelDate: new Date('2027-07-15'),
      season: 'PRIME',
      budget: 120000,
      nights: 6,
      adults: 4,
      message: 'Looking for 4 star accommodations, oxygen cylinder, and an Innova Crysta for family.',
      enquiryCount: 1,
    });

    // Cat 1: base(5) + website(9) = 14
    // Cat 2: prime date(14) + 6N(8) + dest(5) + pax(4) + notes(4) = 35 (hits 35 ceiling)
    // Cat 3: 120,000 / (4 * 6) = 5,000/pax-night (premium) = 30 (hits 30 ceiling)
    // Cat 4: email(5) + phone(5) = 10
    // Total: 14 + 35 + 30 + 10 = 89
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.notes).toContain('Trip: 35/35');
    expect(res.notes).toContain('Budget: 30/30');
    expect(res.notes).toContain('Contact: 10/10');
  });

  it('flags economically impossible budgets with zero budget points', () => {
    const res = scoreLead({
      source: LeadSource.META_ADS,
      email: 'cheap@example.com',
      destination: 'Ladakh',
      travelDate: new Date('2027-06-10'),
      season: 'PRIME',
      budget: 6000, // ₹6,000 for 4 pax for 6 nights = ₹250/pax/night (impossible in Ladakh)
      nights: 6,
      adults: 4,
      minBudgetPerPaxNight: 2500, // dynamic floor from active supplier rates
    });

    expect(res.notes).toContain('sub-floor');
    expect(res.notes).toContain('Budget: -10/30');
    // Ensure overall score doesn't become inflated
    expect(res.score).toBeLessThan(50);
  });

  it('scores shoulder and winter travel with appropriate seasonal calibrations', () => {
    const shoulderLead = scoreLead({
      source: LeadSource.ORGANIC,
      travelDate: new Date('2027-10-05'),
      season: 'SHOULDER',
      nights: 5,
      adults: 2,
      budget: 35000, // ₹3,500/pax/night vs shoulder floor ₹2,000
    });

    const winterLead = scoreLead({
      source: LeadSource.ORGANIC,
      travelDate: new Date('2027-01-15'),
      season: 'WINTER',
      nights: 5,
      adults: 2,
      budget: 20000, // ₹2,000/pax/night vs winter floor ₹1,600
    });

    expect(shoulderLead.notes).toContain('shoulder date +11');
    expect(winterLead.notes).toContain('winter date +7');
    expect(shoulderLead.score).toBeGreaterThan(winterLead.score);
  });

  it('never exceeds 100 points even with maximum inputs and repeat inquiries', () => {
    const res = scoreLead({
      source: LeadSource.REFERRAL,
      email: 'vip@corp.com',
      destination: 'Luxury Ladakh Circuit',
      travelDate: new Date('2027-07-20'),
      season: 'PRIME',
      budget: 500000,
      nights: 8,
      adults: 2,
      message: 'Exclusive presidential suite with private charter helicopter transfers across Ladakh.',
      enquiryCount: 10,
      gclid: 'valid_click_token',
      fbclid: 'meta_click_token',
    });

    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.score).toBe(100);
  });
});
