import { useState } from 'react';
import { ChevronDown, Lightbulb, ListChecks, ShieldAlert } from 'lucide-react';
import type { ConceptNode } from '../../types';

interface ConceptDetailPanelProps {
  node: ConceptNode;
}

export default function ConceptDetailPanel({ node }: ConceptDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="concept-detail-body"
        className="flex min-h-[48px] w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-slate-900/60"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Concept Brief · {node.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div id="concept-detail-body" className="animate-fade-in-up space-y-3 px-4 pb-4 text-sm">
          <p className="leading-relaxed text-slate-300">{node.summary}</p>

          <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5">
            <Lightbulb size={15} className="mt-0.5 shrink-0 text-cyan-300" />
            <p className="text-xs leading-relaxed text-cyan-100">{node.realWorldAnalogy}</p>
          </div>

          {node.keyMisconceptions.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                <ShieldAlert size={13} /> Common Misconceptions
              </p>
              <ul className="space-y-1 text-xs text-slate-400">
                {node.keyMisconceptions.map((m) => (
                  <li key={m} className="flex gap-1.5">
                    <span className="text-amber-500">✕</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
              <ListChecks size={13} /> AP/IB Rubric Criteria
            </p>
            <ul className="space-y-1 text-xs text-slate-400">
              {node.rubricCriteria.map((c) => (
                <li key={c} className="flex gap-1.5">
                  <span className="text-emerald-500">✓</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
