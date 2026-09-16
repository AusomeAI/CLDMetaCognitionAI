import { useMemo, useState } from 'react';
import { Lightbulb, MessageCircle, RefreshCw } from 'lucide-react';
import type { ConceptNode } from '../../types';
import { generateFRQForWeakestCluster, type FRQPrompt } from '../../lib/frqGenerator';
import { audioEngine } from '../../lib/audioEngine';

interface FRQPracticeModeProps {
  nodes: ConceptNode[];
  onPracticeNode: (nodeId: string) => void;
}

export default function FRQPracticeMode({ nodes, onPracticeNode }: FRQPracticeModeProps) {
  const [currentFrq, setCurrentFrq] = useState<FRQPrompt | null>(() => generateFRQForWeakestCluster(nodes));
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [checkedCriteria, setCheckedCriteria] = useState<Set<string>>(new Set());

  const allChecked = useMemo(
    () => !!currentFrq && currentFrq.rubricCriteria.length > 0 && checkedCriteria.size === currentFrq.rubricCriteria.length,
    [currentFrq, checkedCriteria],
  );

  const handleNewQuestion = () => {
    const next = generateFRQForWeakestCluster(nodes, currentFrq?.nodeId);
    setCurrentFrq(next);
    setHintsRevealed(0);
    setCheckedCriteria(new Set());
    audioEngine.playNodeTapChime();
  };

  const handleRevealHint = () => {
    if (!currentFrq || hintsRevealed >= currentFrq.hints.length) return;
    setHintsRevealed((n) => n + 1);
  };

  const toggleCriterion = (criterion: string) => {
    setCheckedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      if (next.size === currentFrq?.rubricCriteria.length) audioEngine.playMasteryArpeggio();
      return next;
    });
  };

  if (!currentFrq) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
        No concepts available yet for FRQ practice.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-400">
        Zero-Anxiety FRQ Practice · No Timer, No Penalty
      </p>
      <p className="mb-3 text-[11px] text-slate-500">Targeting: {currentFrq.nodeLabel} — {currentFrq.unit}</p>

      <div className="animate-fade-in-up rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
        <p className="text-sm leading-relaxed text-slate-100">{currentFrq.prompt}</p>
      </div>

      <div className="mt-4 space-y-2">
        {currentFrq.hints.slice(0, hintsRevealed).map((hint) => (
          <div
            key={hint.level}
            className="animate-fade-in-up flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5"
          >
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-cyan-300" />
            <p className="text-xs leading-relaxed text-cyan-100">
              <span className="font-semibold">Hint {hint.level}:</span> {hint.text}
            </p>
          </div>
        ))}

        {hintsRevealed < currentFrq.hints.length && (
          <button
            type="button"
            onClick={handleRevealHint}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 transition-all duration-200 hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
          >
            <Lightbulb size={14} /> Need a hint? ({hintsRevealed}/{currentFrq.hints.length} used)
          </button>
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
          Self-Check Against the Rubric
        </p>
        <div className="space-y-1.5">
          {currentFrq.rubricCriteria.map((criterion) => (
            <label
              key={criterion}
              className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300 transition-colors duration-200 hover:border-slate-700 hover:bg-slate-800/40"
            >
              <input
                type="checkbox"
                checked={checkedCriteria.has(criterion)}
                onChange={() => toggleCriterion(criterion)}
                className="h-5 w-5 shrink-0 accent-emerald-500"
              />
              {criterion}
            </label>
          ))}
        </div>
        {allChecked && (
          <p className="animate-fade-in-up mt-2 text-xs text-emerald-300">
            ✨ Nice — you've self-assessed every rubric point for this question.
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPracticeNode(currentFrq.nodeId)}
          className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-xs font-medium text-purple-200 transition-all duration-200 hover:scale-[1.02] hover:bg-purple-500/20 active:scale-[0.98]"
        >
          <MessageCircle size={14} /> Discuss in Socratic Dialogue
        </button>
        <button
          type="button"
          onClick={handleNewQuestion}
          className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
        >
          <RefreshCw size={14} /> New Question
        </button>
      </div>
    </div>
  );
}
