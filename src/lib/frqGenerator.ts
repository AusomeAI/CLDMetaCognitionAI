import type { ConceptNode, NodeMasteryStatus } from '../types';

export interface FRQHint {
  level: number;
  text: string;
}

export interface FRQPrompt {
  nodeId: string;
  nodeLabel: string;
  unit: string;
  prompt: string;
  rubricCriteria: string[];
  hints: FRQHint[];
}

/** Lower number = more urgently needs practice. */
const WEAKNESS_PRIORITY: Record<NodeMasteryStatus, number> = {
  gap_detected: 0,
  in_dialogue: 1,
  unexplored: 2,
  mastered: 3,
};

/**
 * Picks the node most in need of practice, preferring gap-detected clusters, then
 * in-dialogue, then unexplored, and finally already-mastered concepts (useful for
 * interleaved review). Excludes `excludeNodeId` so "another question" doesn't repeat.
 */
export function pickWeakestNode(nodes: ConceptNode[], excludeNodeId?: string): ConceptNode | null {
  const candidates = excludeNodeId ? nodes.filter((n) => n.id !== excludeNodeId) : nodes;
  const pool = candidates.length > 0 ? candidates : nodes;
  if (pool.length === 0) return null;

  return [...pool].sort((a, b) => WEAKNESS_PRIORITY[a.masteryStatus] - WEAKNESS_PRIORITY[b.masteryStatus])[0];
}

/**
 * Synthesizes a scaffolded, rubric-aligned free-response question for a concept node.
 * Hints escalate from a gentle analogy nudge to explicit causal vocabulary to a named
 * misconception warning — a hint ladder, not an answer key, matching the zero-anxiety
 * design goal (no timer, no penalty for using every hint).
 */
export function generateFRQ(node: ConceptNode): FRQPrompt {
  const prompt = `Free-Response: In your own words, explain the mechanism behind "${node.label}" and justify each step, as you would on an AP/IB exam for ${node.unit}.`;

  const hints: FRQHint[] = [
    {
      level: 1,
      text: `Start with the big picture: ${node.realWorldAnalogy}`,
    },
    {
      level: 2,
      text: node.causalKeywords.length
        ? `Make sure your answer connects: ${node.causalKeywords.slice(0, 3).join(', ')}.`
        : 'Walk through the mechanism step by step, in causal order.',
    },
    {
      level: 3,
      text: node.keyMisconceptions.length
        ? `Common trap to avoid: "${node.keyMisconceptions[0]}" — make sure your answer doesn't fall into this.`
        : 'Double-check every claim is backed by a specific mechanism, not just a label.',
    },
  ];

  return {
    nodeId: node.id,
    nodeLabel: node.label,
    unit: node.unit,
    prompt,
    rubricCriteria: node.rubricCriteria,
    hints,
  };
}

/** Convenience: pick the weakest node in the graph and generate its FRQ in one call. */
export function generateFRQForWeakestCluster(nodes: ConceptNode[], excludeNodeId?: string): FRQPrompt | null {
  const node = pickWeakestNode(nodes, excludeNodeId);
  return node ? generateFRQ(node) : null;
}
