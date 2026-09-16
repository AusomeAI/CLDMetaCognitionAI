# MetaCognition AI

Socratic Feynman knowledge-graph & interactive concept synthesis engine — part of the
NeuroBloom AI / Synapse Lab suite for teen and pre-college academic excellence.

Turns a unit of study (seeded here with AP Biology Unit 3: Cellular Energetics —
chemiosmosis and ATP synthesis) into an interactive concept graph, then coaches the
student to explain each concept in their own words using the Feynman technique. A
rule-based Socratic evaluator scores each explanation across causal mechanism, analogy,
and edge-case awareness, updates the graph in real time, and schedules spaced-retrieval
review using an SM-2-derived algorithm.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4 (dark cyber-slate sensory theme)
- `lucide-react` icons
- Native Web Audio API (ambient soundscapes, mastery chimes, TTS) and Web Speech API
  (voice-to-text explanations)
- IndexedDB (via `idb`) for 100% on-device telemetry, recall-card, and graph-state persistence

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## Key modules

- `src/types.ts` — shared data models (`ConceptNode`, `GraphEdge`, `SocraticTurn`,
  `FeynmanEvaluation`, `ActiveRecallCard`, `AcademicTelemetryLog`)
- `src/data/conceptGraphData.ts` — seed concept graph
- `src/components/MetaCognition/ConceptGraphCanvas.tsx` — force-style draggable SVG graph
- `src/components/MetaCognition/FeynmanVoicePilot.tsx` — voice/text Socratic dialogue UI
- `src/components/MetaCognition/ActiveRecallDeck.tsx` — spaced-retrieval review deck
- `src/components/MetaCognition/TelemetryDashboard.tsx` — academic mastery analytics + PDF export
- `src/components/MetaCognition/AccessibilityPanel.tsx` — dyslexia/ADHD sensory settings
- `src/lib/feynmanEvaluator.ts` — deterministic explanation scoring engine
- `src/lib/recallScheduler.ts` — SM-2-derived spaced-repetition scheduler
- `src/lib/audioEngine.ts` — Web Audio ambient/chime synthesis, clamped to a safe gain ceiling
- `src/lib/db.ts` — IndexedDB persistence layer
