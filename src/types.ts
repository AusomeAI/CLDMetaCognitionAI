export type NodeMasteryStatus = 'unexplored' | 'in_dialogue' | 'gap_detected' | 'mastered';

export type AcademicSubject =
  | 'biology'
  | 'chemistry'
  | 'physics'
  | 'history'
  | 'literature'
  | 'computer_science';

export interface ConceptNode {
  id: string;
  label: string;
  subject: AcademicSubject;
  unit: string;
  masteryStatus: NodeMasteryStatus;
  summary: string;
  realWorldAnalogy: string;
  x: number;
  y: number;
  keyMisconceptions: string[];
  /** Terms that a strong causal-mechanism explanation of this node should mention. */
  causalKeywords: string[];
  /** Terms/phrases that indicate the student is invoking a valid intuitive analogy. */
  analogyKeywords: string[];
  /** Edge-case / boundary-condition terms an advanced explanation should surface. */
  edgeCaseKeywords: string[];
  /** AP/IB rubric criteria this node is assessed against. */
  rubricCriteria: string[];
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationLabel: string;
  isVerified: boolean;
}

export interface SocraticTurn {
  id: string;
  speaker: 'ai_copilot' | 'student';
  timestamp: number;
  text: string;
  targetedNodeId?: string;
  recognizedAnalogy?: string;
  highlightedGap?: string;
}

export interface FeynmanEvaluation {
  clarityScore: number;
  conceptualAccuracyScore: number;
  analogyDetected: boolean;
  identifiedGaps: string[];
  recommendedSocraticQuestion: string;
  nodesToUpdate: { nodeId: string; newStatus: NodeMasteryStatus }[];
}

export type RecallConfidence = 'low' | 'medium' | 'high';

export interface ActiveRecallCard {
  id: string;
  associatedNodeId: string;
  questionPrompt: string;
  rubricCriteria: string[];
  nextReviewTimestamp: number;
  intervalDays: number;
  easeFactor: number;
  lastConfidence?: RecallConfidence;
  reviewCount: number;
}

export interface AcademicTelemetryLog {
  sessionDate: string;
  subject: AcademicSubject;
  durationMinutes: number;
  explanationsSubmitted: number;
  gapsIdentifiedCount: number;
  gapsResolvedCount: number;
  averageClarityScore: number;
  overallGraphMasteryPercent: number;
}

export type SoundscapeId = 'off' | 'focus_432' | 'rain' | 'white_noise';

export type FontProfile = 'default' | 'lexend' | 'atkinson' | 'opendyslexic';

export interface AccessibilitySettings {
  fontProfile: FontProfile;
  lineHeight: number;
  paragraphWidthCh: number;
  focusMode: boolean;
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  soundscape: SoundscapeId;
  masterVolume: number; // 0-1, clamped so effective output never exceeds 65dB-equivalent gain
  voiceNarrationEnabled: boolean;
}
