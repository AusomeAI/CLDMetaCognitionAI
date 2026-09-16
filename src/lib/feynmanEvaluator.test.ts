import { describe, expect, it } from 'vitest';
import { evaluateFeynmanExplanation } from './feynmanEvaluator';
import type { ConceptNode } from '../types';

const testNode: ConceptNode = {
  id: 'test-node',
  label: 'Test Concept',
  subject: 'biology',
  unit: 'Test Unit',
  masteryStatus: 'unexplored',
  summary: 'A test concept for evaluator unit tests.',
  realWorldAnalogy: 'Like a river flowing downhill.',
  x: 0,
  y: 0,
  keyMisconceptions: ['This process happens instantly with no steps'],
  causalKeywords: ['alpha', 'beta', 'gamma', 'delta'],
  analogyKeywords: ['like a river', 'downhill flow'],
  edgeCaseKeywords: ['blocked pathway'],
  rubricCriteria: ['Explains alpha to delta causally'],
};

describe('evaluateFeynmanExplanation', () => {
  it('scores an empty explanation as a full gap with a low clarity score', () => {
    const result = evaluateFeynmanExplanation(testNode, '');

    expect(result.clarityScore).toBe(0);
    expect(result.analogyDetected).toBe(false);
    expect(result.identifiedGaps.length).toBeGreaterThan(0);
    expect(result.nodesToUpdate[0]).toEqual({ nodeId: 'test-node', newStatus: 'gap_detected' });
  });

  it('marks a node mastered when causal terms, an analogy, and an edge case are all covered with no misconceptions', () => {
    const explanation =
      'alpha beta gamma delta all connect causally in sequence, and it flows like a river downhill flow ' +
      'through the whole system, even accounting for what happens with a blocked pathway along the way ' +
      'and how the mechanism recovers afterward in every case we tested here today';

    const result = evaluateFeynmanExplanation(testNode, explanation);

    expect(result.nodesToUpdate[0].newStatus).toBe('mastered');
    expect(result.analogyDetected).toBe(true);
    expect(result.clarityScore).toBe(100);
    expect(result.conceptualAccuracyScore).toBe(100);
  });

  it('still reaches mastered without edge-case coverage as long as causal terms and an analogy are present', () => {
    const explanation =
      'alpha beta gamma delta all connect causally in sequence and it flows like a river downhill flow ' +
      'through the whole system every single time without fail across many repeated trials and observations';

    const result = evaluateFeynmanExplanation(testNode, explanation);

    expect(result.nodesToUpdate[0].newStatus).toBe('mastered');
    // The edge-case gap can still be listed even though the node is mastered overall.
    expect(result.identifiedGaps.some((g) => g.includes('Edge-case'))).toBe(true);
  });

  it('flags a detected misconception and prevents mastery even with full causal coverage', () => {
    const explanation =
      'alpha beta gamma delta connect like a river downhill flow with a blocked pathway too, but ' +
      'this process happens instantly with no steps in between which is actually how I understand it';

    const result = evaluateFeynmanExplanation(testNode, explanation);

    expect(result.identifiedGaps.some((g) => g.includes('misconception'))).toBe(true);
    expect(result.nodesToUpdate[0].newStatus).toBe('gap_detected');
  });

  it('asks a causal-mechanism follow-up when causal coverage is below half', () => {
    const result = evaluateFeynmanExplanation(testNode, 'alpha is involved somehow');
    expect(result.recommendedSocraticQuestion).toContain('walk me through it step by step');
  });

  it('asks for an analogy once causal coverage clears half but no analogy was given', () => {
    const result = evaluateFeynmanExplanation(
      testNode,
      'alpha beta gamma delta all interact together to drive the whole process forward reliably',
    );
    expect(result.recommendedSocraticQuestion).toContain('everyday analogy');
  });

  it('never returns scores outside the 0-100 range', () => {
    const result = evaluateFeynmanExplanation(
      testNode,
      'this process happens instantly with no steps and nothing else relevant is mentioned',
    );
    expect(result.clarityScore).toBeGreaterThanOrEqual(0);
    expect(result.clarityScore).toBeLessThanOrEqual(100);
    expect(result.conceptualAccuracyScore).toBeGreaterThanOrEqual(0);
    expect(result.conceptualAccuracyScore).toBeLessThanOrEqual(100);
  });
});
