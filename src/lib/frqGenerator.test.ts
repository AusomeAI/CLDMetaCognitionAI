import { describe, expect, it } from 'vitest';
import { generateFRQ, generateFRQForWeakestCluster, pickWeakestNode } from './frqGenerator';
import type { ConceptNode, NodeMasteryStatus } from '../types';

function makeNode(id: string, masteryStatus: NodeMasteryStatus): ConceptNode {
  return {
    id,
    label: `Node ${id}`,
    subject: 'biology',
    unit: 'Test Unit',
    masteryStatus,
    summary: 'summary',
    realWorldAnalogy: 'like a widget',
    x: 0,
    y: 0,
    keyMisconceptions: [`${id} misconception`],
    causalKeywords: ['a', 'b', 'c'],
    analogyKeywords: ['widget'],
    edgeCaseKeywords: ['edge'],
    rubricCriteria: [`${id} criterion`],
  };
}

describe('pickWeakestNode', () => {
  it('prioritizes gap_detected over in_dialogue, unexplored, and mastered', () => {
    const nodes = [
      makeNode('mastered-1', 'mastered'),
      makeNode('unexplored-1', 'unexplored'),
      makeNode('dialogue-1', 'in_dialogue'),
      makeNode('gap-1', 'gap_detected'),
    ];
    expect(pickWeakestNode(nodes)?.id).toBe('gap-1');
  });

  it('falls back to in_dialogue when no gap-detected nodes exist', () => {
    const nodes = [makeNode('mastered-1', 'mastered'), makeNode('dialogue-1', 'in_dialogue')];
    expect(pickWeakestNode(nodes)?.id).toBe('dialogue-1');
  });

  it('excludes the given node id so repeat calls do not repeat the same question', () => {
    const nodes = [makeNode('gap-1', 'gap_detected'), makeNode('gap-2', 'gap_detected')];
    const picked = pickWeakestNode(nodes, 'gap-1');
    expect(picked?.id).toBe('gap-2');
  });

  it('falls back to the excluded node if it is the only node available', () => {
    const nodes = [makeNode('only-1', 'gap_detected')];
    expect(pickWeakestNode(nodes, 'only-1')?.id).toBe('only-1');
  });

  it('returns null for an empty node list', () => {
    expect(pickWeakestNode([])).toBeNull();
  });
});

describe('generateFRQ', () => {
  it('produces a prompt referencing the node label and a 3-level hint ladder', () => {
    const node = makeNode('gap-1', 'gap_detected');
    const frq = generateFRQ(node);

    expect(frq.nodeId).toBe('gap-1');
    expect(frq.prompt).toContain('Node gap-1');
    expect(frq.rubricCriteria).toEqual(['gap-1 criterion']);
    expect(frq.hints).toHaveLength(3);
    expect(frq.hints[0].text).toContain('like a widget');
    expect(frq.hints[1].text).toContain('a, b, c');
    expect(frq.hints[2].text).toContain('gap-1 misconception');
  });
});

describe('generateFRQForWeakestCluster', () => {
  it('generates an FRQ for the weakest node in one call', () => {
    const nodes = [makeNode('mastered-1', 'mastered'), makeNode('gap-1', 'gap_detected')];
    const frq = generateFRQForWeakestCluster(nodes);
    expect(frq?.nodeId).toBe('gap-1');
  });

  it('returns null when given no nodes', () => {
    expect(generateFRQForWeakestCluster([])).toBeNull();
  });
});
