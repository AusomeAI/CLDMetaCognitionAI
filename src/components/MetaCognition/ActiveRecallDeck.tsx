import { useMemo, useState } from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import type { ActiveRecallCard, ConceptNode, RecallConfidence } from '../../types';
import { isDue, scheduleNextReview } from '../../lib/recallScheduler';
import { audioEngine } from '../../lib/audioEngine';

interface ActiveRecallDeckProps {
  cards: ActiveRecallCard[];
  nodes: ConceptNode[];
  onCardReviewed: (updated: ActiveRecallCard) => void;
}

const CONFIDENCE_OPTIONS: { id: RecallConfidence; label: string; hue: string }[] = [
  { id: 'low', label: 'Low Confidence', hue: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/10' },
  { id: 'medium', label: 'Medium Confidence', hue: 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10' },
  { id: 'high', label: 'High Confidence', hue: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10' },
];

export default function ActiveRecallDeck({ cards, nodes, onCardReviewed }: ActiveRecallDeckProps) {
  const [revealed, setRevealed] = useState(false);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const dueCards = useMemo(() => cards.filter(isDue), [cards]);
  const current = dueCards[0];
  const currentNode = current ? nodeById.get(current.associatedNodeId) : undefined;

  const handleConfidence = (confidence: RecallConfidence) => {
    if (!current) return;
    const updated = scheduleNextReview(current, confidence);
    onCardReviewed(updated);
    if (confidence === 'high') audioEngine.playMasteryArpeggio();
    else audioEngine.playNodeTapChime();
    setRevealed(false);
  };

  if (!current) {
    return (
      <div className="animate-fade-in-up flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <CheckCircle2 className="text-emerald-400" size={32} />
        <p className="text-sm font-medium text-slate-200">All caught up</p>
        <p className="text-xs text-slate-500">
          {cards.length === 0 ? 'No recall cards yet.' : `${cards.length} card(s) scheduled for later review.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-400">
        Spaced-Retrieval Mastery Matrix · {dueCards.length} due
      </p>

      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
          {currentNode?.label ?? 'Concept'}
        </p>
        <p className="text-base font-medium text-slate-100">{current.questionPrompt}</p>

        {revealed && currentNode && (
          <div className="animate-fade-in-up mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
            <p>{currentNode.summary}</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              {current.rubricCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-700 text-sm font-medium text-slate-200 transition-all duration-200 hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
        >
          <RotateCcw size={16} /> Reveal Rubric &amp; Self-Assess
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleConfidence(opt.id)}
              className={`animate-fade-in-up h-16 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${opt.hue}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
