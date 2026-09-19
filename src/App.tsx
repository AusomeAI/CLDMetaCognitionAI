import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Mic as MicIcon,
  Volume2,
  BarChart3,
  Sliders,
  Layers,
  Box,
  LayoutGrid,
  ChevronDown,
  Dna,
  Landmark,
  HelpCircle,
} from 'lucide-react';
import ConceptGraphCanvas from './components/MetaCognition/ConceptGraphCanvas';
import FeynmanVoicePilot from './components/MetaCognition/FeynmanVoicePilot';
import ActiveRecallDeck from './components/MetaCognition/ActiveRecallDeck';
import FRQPracticeMode from './components/MetaCognition/FRQPracticeMode';
import TelemetryDashboard from './components/MetaCognition/TelemetryDashboard';
import AccessibilityPanel from './components/MetaCognition/AccessibilityPanel';
import ConceptDetailPanel from './components/MetaCognition/ConceptDetailPanel';
import GraphErrorBoundary from './components/GraphErrorBoundary';
import OnboardingTour from './components/OnboardingTour';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import { CONCEPT_UNITS, type ConceptUnit } from './data/conceptUnits';
import type {
  AcademicTelemetryLog,
  AccessibilitySettings,
  ActiveRecallCard,
  ConceptNode,
  GraphEdge,
  NodeMasteryStatus,
  SocraticTurn,
} from './types';
import { createInitialCard } from './lib/recallScheduler';
import { audioEngine } from './lib/audioEngine';
import {
  appendSocraticTurn,
  getAccessibilitySettings,
  getAllRecallCards,
  getAllSocraticHistory,
  getAllTelemetryLogs,
  getGraphState,
  saveAccessibilitySettings,
  saveGraphState,
  saveRecallCard,
  saveRecallCards,
  saveTelemetryLog,
} from './lib/db';

const ConceptGraphCanvas3D = lazy(() => import('./components/MetaCognition/ConceptGraphCanvas3D'));
const MasteryRipple3D = lazy(() => import('./components/MetaCognition/MasteryRipple3D'));

const MASTERY_RIPPLE_COLOR = '#10B981';
const ONBOARDING_STORAGE_KEY = 'metacognition-ai:onboarded-v1';

function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // Private browsing / storage disabled — the tour will just show again next visit.
  }
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontProfile: 'default',
  lineHeight: 1.6,
  paragraphWidthCh: 70,
  focusMode: false,
  reduceMotion: false,
  hapticsEnabled: true,
  soundscape: 'off',
  masterVolume: 0.6,
  voiceNarrationEnabled: true,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialRecallCards(nodes: ConceptNode[]): ActiveRecallCard[] {
  return nodes.map((node) =>
    createInitialCard(
      `card-${node.id}`,
      node.id,
      `Free-response: explain the causal mechanism of "${node.label}" and its role in ${node.unit}.`,
      node.rubricCriteria,
    ),
  );
}

type RightPanelTab = 'dialogue' | 'recall' | 'frq';
type GraphViewMode = '2d' | '3d';
type UnitsData = Record<string, { nodes: ConceptNode[]; edges: GraphEdge[] }>;

const UNIT_ICONS = { dna: Dna, landmark: Landmark } as const;

export default function App() {
  const [unitsData, setUnitsData] = useState<UnitsData>(() =>
    Object.fromEntries(CONCEPT_UNITS.map((u) => [u.id, { nodes: u.nodes, edges: u.edges }])),
  );
  const [activeUnitId, setActiveUnitId] = useState<string>(CONCEPT_UNITS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(CONCEPT_UNITS[0].defaultFocusNodeId);
  const [turns, setTurns] = useState<SocraticTurn[]>([]);
  const [recallCards, setRecallCards] = useState<ActiveRecallCard[]>(() =>
    buildInitialRecallCards(CONCEPT_UNITS.flatMap((u) => u.nodes)),
  );
  const [telemetryLogs, setTelemetryLogs] = useState<AcademicTelemetryLog[]>([]);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY);
  const [rightTab, setRightTab] = useState<RightPanelTab>('dialogue');
  const [graphView, setGraphView] = useState<GraphViewMode>('2d');
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gapsResolvedToday, setGapsResolvedToday] = useState(0);
  const [explanationsToday, setExplanationsToday] = useState(0);
  const [showMasteryRipple, setShowMasteryRipple] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [showShortcuts, setShowShortcuts] = useState(false);

  const sessionStart = useRef(0);
  const loadedFromDb = useRef(false);

  const activeUnit: ConceptUnit = useMemo(
    () => CONCEPT_UNITS.find((u) => u.id === activeUnitId) ?? CONCEPT_UNITS[0],
    [activeUnitId],
  );
  const nodes = unitsData[activeUnitId].nodes;
  const edges = unitsData[activeUnitId].edges;

  useEffect(() => {
    sessionStart.current = Date.now();
    (async () => {
      const [storedGraphs, storedCards, storedLogs, storedHistory, storedSettings] = await Promise.all([
        Promise.all(CONCEPT_UNITS.map((u) => getGraphState(u.id))),
        getAllRecallCards(),
        getAllTelemetryLogs(),
        getAllSocraticHistory(),
        getAccessibilitySettings(),
      ]);

      setUnitsData((prev) => {
        const next = { ...prev };
        storedGraphs.forEach((stored, i) => {
          if (stored) next[CONCEPT_UNITS[i].id] = { nodes: stored.nodes, edges: stored.edges };
        });
        return next;
      });

      if (storedCards.length > 0) setRecallCards(storedCards);
      else void saveRecallCards(buildInitialRecallCards(CONCEPT_UNITS.flatMap((u) => u.nodes)));

      setTelemetryLogs(storedLogs);
      setTurns(storedHistory);
      if (storedSettings) setAccessibility({ ...DEFAULT_ACCESSIBILITY, ...storedSettings });

      loadedFromDb.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!loadedFromDb.current) return;
    const current = unitsData[activeUnitId];
    void saveGraphState(activeUnitId, current.nodes, current.edges);
  }, [unitsData, activeUnitId]);

  useEffect(() => {
    if (!loadedFromDb.current) return;
    void saveAccessibilitySettings(accessibility);
  }, [accessibility]);

  useEffect(() => {
    document.body.setAttribute('data-font', accessibility.fontProfile);
    document.body.setAttribute('data-reduce-motion', String(accessibility.reduceMotion));
    audioEngine.setMasterVolume(accessibility.masterVolume);
    audioEngine.setAmbientSoundscape(accessibility.soundscape);
  }, [accessibility]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '?') return;
      const target = e.target as HTMLElement | null;
      const isTyping = target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (isTyping || showOnboarding || showShortcuts || showTelemetry || showSettings) return;
      e.preventDefault();
      setShowShortcuts(true);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showOnboarding, showShortcuts, showTelemetry, showSettings]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = nodeById.get(selectedNodeId) ?? nodes[0];

  const allNodesFlat = useMemo(
    () => CONCEPT_UNITS.flatMap((u) => unitsData[u.id]?.nodes ?? u.nodes),
    [unitsData],
  );

  const conceptTurns = useMemo(
    () => turns.filter((t) => t.targetedNodeId === selectedNodeId),
    [turns, selectedNodeId],
  );

  const masteryPercent = useMemo(() => {
    if (nodes.length === 0) return 0;
    const mastered = nodes.filter((n) => n.masteryStatus === 'mastered').length;
    return Math.round((mastered / nodes.length) * 100);
  }, [nodes]);

  const activeGapCount = useMemo(
    () => nodes.filter((n) => n.masteryStatus === 'gap_detected').length,
    [nodes],
  );

  const examReadinessLabel = useMemo(() => {
    if (masteryPercent >= 90) return 'AP Level 5 Track';
    if (masteryPercent >= 70) return 'AP Level 4 Track';
    if (masteryPercent >= 50) return 'AP Level 3 Track';
    return 'Building Foundations';
  }, [masteryPercent]);

  const updateActiveUnit = (updater: (prev: UnitsData[string]) => UnitsData[string]) => {
    setUnitsData((prev) => ({ ...prev, [activeUnitId]: updater(prev[activeUnitId]) }));
  };

  const handleSelectUnit = (unitId: string) => {
    if (unitId === activeUnitId) return;
    const unit = CONCEPT_UNITS.find((u) => u.id === unitId);
    if (!unit) return;
    setActiveUnitId(unitId);
    setSelectedNodeId(unit.defaultFocusNodeId);
    setRightTab('dialogue');
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    audioEngine.playNodeTapChime();
    if (accessibility.hapticsEnabled && navigator.vibrate) navigator.vibrate(15);
  };

  const handleDragNode = (nodeId: string, x: number, y: number) => {
    updateActiveUnit((u) => ({ ...u, nodes: u.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)) }));
  };

  const handlePracticeNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setRightTab('dialogue');
  };

  const handleNewTurn = (turn: SocraticTurn) => {
    setTurns((prev) => [...prev, turn]);
    void appendSocraticTurn(turn);
    if (turn.speaker === 'student') setExplanationsToday((c) => c + 1);
  };

  const handleEvaluation = (nodeId: string, newStatus: NodeMasteryStatus) => {
    const prevNode = nodeById.get(nodeId);
    if (prevNode && prevNode.masteryStatus !== 'mastered' && newStatus === 'mastered') {
      setGapsResolvedToday((c) => c + 1);
      // Only in the 3D view, where the three.js chunk is already loaded — 2D-only
      // users never pay for it, matching the existing audio/haptic mastery cue instead.
      if (graphView === '3d' && !accessibility.reduceMotion) setShowMasteryRipple(true);
    }
    updateActiveUnit((u) => ({
      nodes: u.nodes.map((n) => (n.id === nodeId ? { ...n, masteryStatus: newStatus } : n)),
      edges: u.edges.map((e) => (e.targetNodeId === nodeId && newStatus === 'mastered' ? { ...e, isVerified: true } : e)),
    }));
  };

  const handleCardReviewed = (updated: ActiveRecallCard) => {
    setRecallCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    void saveRecallCard(updated);
  };

  const handleEndSession = async () => {
    const durationMinutes = Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000));
    const studentTurns = turns.filter((t) => t.speaker === 'student');
    const clarityScores = turns
      .filter((t) => t.speaker === 'ai_copilot' && t.recognizedAnalogy)
      .map(() => 75);
    const log: AcademicTelemetryLog = {
      sessionDate: todayKey(),
      subject: selectedNode?.subject ?? activeUnit.subject,
      durationMinutes,
      explanationsSubmitted: studentTurns.length,
      gapsIdentifiedCount: nodes.filter((n) => n.masteryStatus === 'gap_detected').length,
      gapsResolvedCount: gapsResolvedToday,
      averageClarityScore: clarityScores.length
        ? Math.round(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length)
        : 60,
      overallGraphMasteryPercent: masteryPercent,
    };
    await saveTelemetryLog(log);
    setTelemetryLogs((prev) => {
      const withoutToday = prev.filter((l) => l.sessionDate !== log.sessionDate);
      return [...withoutToday, log];
    });
    setShowTelemetry(true);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0B0F19] text-slate-200" style={{ lineHeight: accessibility.lineHeight }}>
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="text-cyan-400" size={22} />
          <span className="text-sm font-semibold text-slate-100">MetaCognition AI</span>
        </div>

        <SubjectSwitcher activeUnit={activeUnit} onSelect={handleSelectUnit} />
        <RibbonPill icon={<MicIcon size={14} />} label="Feynman Socratic Dialogue" />
        <RibbonPill
          icon={<Volume2 size={14} />}
          label={accessibility.soundscape === 'off' ? 'Sound Off' : '432Hz Focus Ambient (65dB Safe)'}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="flex h-11 items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setGraphView('2d')}
              aria-pressed={graphView === '2d'}
              className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-200 ${
                graphView === '2d' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={14} /> 2D
            </button>
            <button
              type="button"
              onClick={() => setGraphView('3d')}
              aria-pressed={graphView === '3d'}
              className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-200 ${
                graphView === '3d' ? 'bg-purple-500/20 text-purple-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box size={14} /> 3D Neural
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-all duration-200 hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.97]"
          >
            <Sliders size={14} /> Accessibility
          </button>
          <button
            type="button"
            onClick={() => void handleEndSession()}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-all duration-200 hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.97]"
          >
            <BarChart3 size={14} /> Academic Telemetry
          </button>
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-all duration-200 hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.97]"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[1fr_400px]">
        <section className="animate-fade-in-up relative min-h-[320px] overflow-hidden" key={`${activeUnitId}-${graphView}`}>
          <GraphErrorBoundary onReset={() => setGraphView('2d')}>
            {graphView === '3d' ? (
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-800 bg-[#05070d] text-xs text-slate-500">
                    Loading 3D neural constellation…
                  </div>
                }
              >
                <ConceptGraphCanvas3D
                  nodes={nodes}
                  edges={edges}
                  selectedNodeId={selectedNodeId}
                  focusMode={accessibility.focusMode}
                  reduceMotion={accessibility.reduceMotion}
                  onSelectNode={handleSelectNode}
                />
              </Suspense>
            ) : (
              <ConceptGraphCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                focusMode={accessibility.focusMode}
                onSelectNode={handleSelectNode}
                onDragNode={handleDragNode}
              />
            )}
          </GraphErrorBoundary>
        </section>

        <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
          {selectedNode && <ConceptDetailPanel node={selectedNode} />}
          <div className="flex border-b border-slate-800">
            <TabButton active={rightTab === 'dialogue'} onClick={() => setRightTab('dialogue')} label="Socratic Dialogue" />
            <TabButton active={rightTab === 'frq'} onClick={() => setRightTab('frq')} label="FRQ Practice" />
            <TabButton active={rightTab === 'recall'} onClick={() => setRightTab('recall')} label="Active Recall" />
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'dialogue' && selectedNode ? (
              <FeynmanVoicePilot
                targetNode={selectedNode}
                turns={conceptTurns}
                onNewTurn={handleNewTurn}
                onEvaluation={handleEvaluation}
                ttsEnabled={accessibility.voiceNarrationEnabled}
              />
            ) : rightTab === 'frq' ? (
              <FRQPracticeMode key={activeUnitId} nodes={nodes} onPracticeNode={handlePracticeNode} />
            ) : (
              <ActiveRecallDeck cards={recallCards} nodes={allNodesFlat} onCardReviewed={handleCardReviewed} />
            )}
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center gap-4 border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 transition-colors duration-500">
          <Layers size={14} className="text-emerald-400" /> Concept Health:{' '}
          <strong key={masteryPercent} className="animate-fade-in-up text-emerald-300">
            {masteryPercent}% Solidified
          </strong>
        </span>
        <span key={`gaps-${gapsResolvedToday}`} className="animate-fade-in-up">
          ⚡ {gapsResolvedToday} Knowledge Gaps Solved Today
        </span>
        <span>🟡 {activeGapCount} Active Gap{activeGapCount === 1 ? '' : 's'}</span>
        <span key={`exp-${explanationsToday}`} className="animate-fade-in-up">
          🎙️ {explanationsToday} Explanations This Session
        </span>
        <span className="ml-auto">🎯 Exam Readiness: {examReadinessLabel}</span>
      </footer>

      {showTelemetry && (
        <TelemetryDashboard
          logs={telemetryLogs}
          currentMasteryPercent={masteryPercent}
          reduceMotion={accessibility.reduceMotion}
          onClose={() => setShowTelemetry(false)}
        />
      )}
      {showSettings && (
        <AccessibilityPanel
          settings={accessibility}
          onChange={setAccessibility}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showMasteryRipple && (
        <Suspense fallback={null}>
          <MasteryRipple3D color={MASTERY_RIPPLE_COLOR} onComplete={() => setShowMasteryRipple(false)} />
        </Suspense>
      )}

      {showOnboarding && (
        <OnboardingTour
          onClose={() => {
            markOnboardingComplete();
            setShowOnboarding(false);
          }}
        />
      )}
      {showShortcuts && (
        <KeyboardShortcutsHelp
          onClose={() => setShowShortcuts(false)}
          onReplayTour={() => {
            setShowShortcuts(false);
            setShowOnboarding(true);
          }}
        />
      )}
    </div>
  );
}

function SubjectSwitcher({ activeUnit, onSelect }: { activeUnit: ConceptUnit; onSelect: (unitId: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = UNIT_ICONS[activeUnit.icon];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 max-w-[65vw] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-xs text-slate-300 transition-colors duration-200 hover:border-slate-700 sm:max-w-none"
      >
        <Icon size={14} className="shrink-0 text-cyan-400" />
        <span className="truncate">
          {activeUnit.subjectLabel}
          <span className="hidden sm:inline"> — {activeUnit.unitLabel}</span>
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="animate-fade-in-up fixed inset-x-3 top-28 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-1.5 sm:w-80 sm:max-w-[calc(100vw-2rem)]"
        >
          {CONCEPT_UNITS.map((unit) => {
            const UnitIcon = UNIT_ICONS[unit.icon];
            const isActive = unit.id === activeUnit.id;
            return (
              <button
                key={unit.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(unit.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-3 text-left text-xs transition-colors duration-150 ${
                  isActive ? 'bg-cyan-500/10 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UnitIcon size={16} className={isActive ? 'text-cyan-300' : 'text-slate-500'} />
                <span>
                  <span className="block font-medium">{unit.subjectLabel}</span>
                  <span className="block text-slate-500">{unit.unitLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RibbonPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition-colors duration-200 hover:border-slate-700 sm:flex">
      {icon} {label}
    </span>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 flex-1 text-xs font-medium transition-all duration-200 ${
        active ? 'border-b-2 border-cyan-400 text-cyan-300' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
