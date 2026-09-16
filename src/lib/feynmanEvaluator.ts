import type { ConceptNode, FeynmanEvaluation, NodeMasteryStatus } from '../types';

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+\s-]/g, ' ');
}

function countMatches(normalizedText: string, keywords: string[]): string[] {
  return keywords.filter((kw) => normalizedText.includes(kw.toLowerCase()));
}

/**
 * Deterministic Socratic evaluator: scores a student's spoken/typed explanation of a
 * target concept node against that node's causal-mechanism, analogy, and edge-case
 * keyword banks, then synthesizes a follow-up Socratic prompt for whichever
 * cognitive dimension is weakest.
 */
export function evaluateFeynmanExplanation(
  node: ConceptNode,
  explanationText: string,
): FeynmanEvaluation {
  const text = normalize(explanationText);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const causalHits = countMatches(text, node.causalKeywords);
  const analogyHits = countMatches(text, node.analogyKeywords);
  const edgeHits = countMatches(text, node.edgeCaseKeywords);
  const misconceptionHits = node.keyMisconceptions.filter((m) =>
    text.includes(normalize(m).split(' ').slice(0, 3).join(' ')),
  );

  const causalCoverage = node.causalKeywords.length
    ? causalHits.length / node.causalKeywords.length
    : 0;
  const edgeCoverage = node.edgeCaseKeywords.length
    ? edgeHits.length / node.edgeCaseKeywords.length
    : 0;
  const analogyDetected = analogyHits.length > 0;

  const lengthFactor = Math.min(1, wordCount / 40);
  const clarityScore = Math.round(
    (lengthFactor * 0.35 + causalCoverage * 0.45 + (analogyDetected ? 0.2 : 0)) * 100,
  );

  const conceptualAccuracyScore = Math.round(
    Math.max(0, causalCoverage * 0.7 + edgeCoverage * 0.3 - misconceptionHits.length * 0.25) * 100,
  );

  const identifiedGaps: string[] = [];
  const missingCausal = node.causalKeywords.filter((kw) => !causalHits.includes(kw));
  if (causalCoverage < 0.5) {
    identifiedGaps.push(
      `Causal mechanism is incomplete — explanation doesn't yet connect ${missingCausal
        .slice(0, 2)
        .join(' and ')}.`,
    );
  }
  if (!analogyDetected) {
    identifiedGaps.push('No intuitive analogy offered yet — try mapping this to something physical or familiar.');
  }
  if (edgeCoverage === 0 && node.edgeCaseKeywords.length > 0) {
    identifiedGaps.push('Edge-case awareness missing — what happens when this process is disrupted or blocked?');
  }
  if (misconceptionHits.length > 0) {
    identifiedGaps.push(`Possible misconception detected: "${misconceptionHits[0]}".`);
  }
  if (wordCount < 15) {
    identifiedGaps.push('Explanation is very brief — expand with more mechanistic detail.');
  }

  let recommendedSocraticQuestion: string;
  if (causalCoverage < 0.5) {
    recommendedSocraticQuestion = `You're on the right track — but walk me through it step by step: what physically happens right before "${node.label}" and what triggers it?`;
  } else if (!analogyDetected) {
    recommendedSocraticQuestion = `Nice mechanistic detail! Now, can you describe "${node.label}" using an everyday analogy, like a machine or a familiar process?`;
  } else if (edgeCoverage === 0 && node.edgeCaseKeywords.length > 0) {
    recommendedSocraticQuestion = `Great explanation and analogy. Now the harder question: what would happen to "${node.label}" if a key component were blocked or missing?`;
  } else {
    recommendedSocraticQuestion = `Excellent — you've covered the mechanism, an analogy, and an edge case. Can you now connect "${node.label}" forward to what it enables next in the pathway?`;
  }

  let newStatus: NodeMasteryStatus;
  if (causalCoverage >= 0.6 && (analogyDetected || edgeCoverage > 0) && misconceptionHits.length === 0) {
    newStatus = 'mastered';
  } else if (identifiedGaps.length > 0) {
    newStatus = 'gap_detected';
  } else {
    newStatus = 'in_dialogue';
  }

  return {
    clarityScore: Math.max(0, Math.min(100, clarityScore)),
    conceptualAccuracyScore: Math.max(0, Math.min(100, conceptualAccuracyScore)),
    analogyDetected,
    identifiedGaps,
    recommendedSocraticQuestion,
    nodesToUpdate: [{ nodeId: node.id, newStatus }],
  };
}
