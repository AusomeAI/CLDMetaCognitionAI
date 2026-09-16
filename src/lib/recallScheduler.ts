import type { ActiveRecallCard, RecallConfidence } from '../types';

const CONFIDENCE_QUALITY: Record<RecallConfidence, number> = {
  low: 2,
  medium: 3.5,
  high: 5,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * SM-2-derived scheduler with confidence self-assessment folded into the quality
 * signal (rather than a graded quiz), matching the app's zero-anxiety design goal.
 */
export function scheduleNextReview(card: ActiveRecallCard, confidence: RecallConfidence): ActiveRecallCard {
  const quality = CONFIDENCE_QUALITY[confidence];
  let { easeFactor, intervalDays, reviewCount } = card;

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    intervalDays = 1;
    reviewCount = 0;
  } else {
    reviewCount += 1;
    if (reviewCount === 1) {
      intervalDays = 1;
    } else if (reviewCount === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  return {
    ...card,
    easeFactor,
    intervalDays,
    reviewCount,
    lastConfidence: confidence,
    nextReviewTimestamp: Date.now() + intervalDays * MS_PER_DAY,
  };
}

export function createInitialCard(
  id: string,
  associatedNodeId: string,
  questionPrompt: string,
  rubricCriteria: string[],
): ActiveRecallCard {
  return {
    id,
    associatedNodeId,
    questionPrompt,
    rubricCriteria,
    nextReviewTimestamp: Date.now(),
    intervalDays: 0,
    easeFactor: 2.5,
    reviewCount: 0,
  };
}

export function isDue(card: ActiveRecallCard): boolean {
  return card.nextReviewTimestamp <= Date.now();
}
