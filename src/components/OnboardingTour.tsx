import { useState } from 'react';
import { Brain, Network, Mic, ListChecks, Sliders, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

interface OnboardingTourProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: Brain,
    title: 'Welcome to MetaCognition AI',
    body: "A Socratic study co-pilot that turns a unit of study into an interactive concept map, and coaches you to explain each idea in your own words — the Feynman technique. Nothing here is timed, scored against a clock, or gamified.",
  },
  {
    icon: Network,
    title: 'The Concept Graph',
    body: "Each node is a concept, color-coded by mastery: cyan for unexplored, purple while you're discussing it, amber where a gap was detected, and emerald once mastered. Click any node to open its brief and start a dialogue about it. Try the 3D Neural toggle in the top-right for a rotating, bloom-lit view of the same graph.",
  },
  {
    icon: Mic,
    title: 'Feynman Socratic Dialogue',
    body: "Explain a concept out loud or in writing, like you're teaching a smart 10-year-old. The co-pilot never hands you the answer — it points out what's missing (a mechanism, an analogy, an edge case) and asks a follow-up question instead.",
  },
  {
    icon: ListChecks,
    title: 'FRQ Practice & Active Recall',
    body: "FRQ Practice targets whichever concept needs it most and offers hints only if you ask. Active Recall schedules spaced review across everything you've studied. Neither has a timer, a streak, or a fail state.",
  },
  {
    icon: Sliders,
    title: 'Make It Yours',
    body: "Accessibility settings (top-right) cover typography (including OpenDyslexic), line spacing, ADHD focus mode, motion, haptics, and a volume-capped ambient soundscape — all saved automatically. Press ? anytime for keyboard shortcuts.",
  },
];

export default function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const closeButtonRef = useModalA11y(onClose);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-dialog-title"
      className="animate-scrim-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick Tour · {step + 1} of {STEPS.length}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div key={step} className="animate-fade-in-up overflow-y-auto p-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
            <Icon className="text-cyan-300" size={26} />
          </div>
          <h2 id="onboarding-dialog-title" className="mb-2 text-lg font-semibold text-slate-50">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">{current.body}</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <div className="flex gap-1.5" role="tablist" aria-label="Tour progress">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-cyan-400' : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex h-10 items-center gap-1 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
              className="flex h-10 items-center gap-1 rounded-lg bg-cyan-500/20 px-4 text-xs font-medium text-cyan-200 transition-all duration-200 hover:scale-[1.03] hover:bg-cyan-500/30 active:scale-[0.97]"
            >
              {isLast ? 'Get Started' : 'Next'} {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
