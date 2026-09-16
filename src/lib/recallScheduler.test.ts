import { describe, expect, it } from 'vitest';
import { createInitialCard, isDue, scheduleNextReview } from './recallScheduler';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('createInitialCard', () => {
  it('creates a card that is immediately due with SM-2 defaults', () => {
    const card = createInitialCard('card-1', 'node-1', 'Explain it', ['criterion']);

    expect(card.reviewCount).toBe(0);
    expect(card.intervalDays).toBe(0);
    expect(card.easeFactor).toBe(2.5);
    expect(isDue(card)).toBe(true);
  });
});

describe('isDue', () => {
  it('is true for a timestamp in the past and false for one in the future', () => {
    const base = createInitialCard('card-1', 'node-1', 'Explain it', []);
    expect(isDue({ ...base, nextReviewTimestamp: Date.now() - 1000 })).toBe(true);
    expect(isDue({ ...base, nextReviewTimestamp: Date.now() + 100_000 })).toBe(false);
  });
});

describe('scheduleNextReview', () => {
  it('resets the interval to 1 day and reviewCount to 0 on low confidence', () => {
    const card = { ...createInitialCard('card-1', 'node-1', 'Explain it', []), reviewCount: 5, intervalDays: 30 };
    const updated = scheduleNextReview(card, 'low');

    expect(updated.intervalDays).toBe(1);
    expect(updated.reviewCount).toBe(0);
    expect(updated.lastConfidence).toBe('low');
  });

  it('steps interval through the standard 1-day, 3-day, ease-multiplied SM-2 progression on repeated high confidence', () => {
    let card = createInitialCard('card-1', 'node-1', 'Explain it', []);

    card = scheduleNextReview(card, 'high');
    expect(card.reviewCount).toBe(1);
    expect(card.intervalDays).toBe(1);
    expect(card.easeFactor).toBeCloseTo(2.6, 5);

    card = scheduleNextReview(card, 'high');
    expect(card.reviewCount).toBe(2);
    expect(card.intervalDays).toBe(3);
    expect(card.easeFactor).toBeCloseTo(2.7, 5);

    card = scheduleNextReview(card, 'high');
    expect(card.reviewCount).toBe(3);
    expect(card.easeFactor).toBeCloseTo(2.8, 5);
    expect(card.intervalDays).toBe(Math.round(3 * 2.8));
  });

  it('never lets the ease factor drop below the SM-2 floor of 1.3', () => {
    let card = createInitialCard('card-1', 'node-1', 'Explain it', []);
    for (let i = 0; i < 10; i++) {
      card = scheduleNextReview(card, 'low');
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(card.easeFactor).toBeCloseTo(1.3, 5);
  });

  it('sets nextReviewTimestamp to roughly now plus the new interval in days', () => {
    const card = createInitialCard('card-1', 'node-1', 'Explain it', []);
    const before = Date.now();
    const updated = scheduleNextReview(card, 'high');
    const expected = before + updated.intervalDays * MS_PER_DAY;

    expect(updated.nextReviewTimestamp).toBeGreaterThanOrEqual(expected - 1000);
    expect(updated.nextReviewTimestamp).toBeLessThanOrEqual(expected + 1000);
  });

  it('treats medium confidence as a passing quality that still advances reviewCount', () => {
    const card = createInitialCard('card-1', 'node-1', 'Explain it', []);
    const updated = scheduleNextReview(card, 'medium');

    expect(updated.reviewCount).toBe(1);
    expect(updated.intervalDays).toBe(1);
    expect(updated.easeFactor).toBeLessThan(card.easeFactor);
  });
});
