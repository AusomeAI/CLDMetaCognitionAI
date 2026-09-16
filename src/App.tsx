import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Network,
  Mic as MicIcon,
  Volume2,
  BarChart3,
  Sliders,
  Layers,
} from 'lucide-react';
import ConceptGraphCanvas from './components/MetaCognition/ConceptGraphCanvas';
import FeynmanVoicePilot from './components/MetaCognition/FeynmanVoicePilot';
import ActiveRecallDeck from './components/MetaCognition/ActiveRecallDeck';
import TelemetryDashboard from './components/MetaCognition/TelemetryDashboard';
import AccessibilityPanel from './components/MetaCognition/AccessibilityPanel';
import { DEFAULT_FOCUS_NODE_ID, SEED_CONCEPT_NODES, SEED_GRAPH_EDGES } from './data/conceptGraphData';
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
  getAllRecallCards,
  getAllSocraticHistory,
  getAllTelemetryLogs,
  getGraphState,
  saveGraphState,
  saveRecallCard,
  saveRecallCards,
  saveTelemetryLog,
} from './lib/db';

const GRAPH_STATE_ID = 'ap-biology-unit-3';

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  fontProfile: 'default',
  lineHeight: 1.6,
  paragraphWidthCh: 70,
  focusMode: false,
  reduceMotion: false,
  hapticsEnabled: true,
  soundscape: 'off',
  masterVolume: 0.6,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialRecallCards(nodes: ConceptNode[]): ActiveRecallCard[] {
  return nodes.map((node) =>
    createInitialCard(
      `card-${node.id}`,
      node.id,
      `Free-response: explain the causal mechanism of "${node.label}" and its role in the AP Biology cellular energetics pathway.`,
      node.rubricCriteria,
    ),
  );
}

type RightPanelTab = 'dialogue' | 'recall';

export default function App() {
  const [nodes, setNodes] = useState<ConceptNode[]>(SEED_CONCEPT_NODES);
  const [edges, setEdges] = useState<GraphEdge[]>(SEED_GRAPH_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(DEFAULT_FOCUS_NODE_ID);
  const [turns, setTurns] = useState<SocraticTurn[]>([]);
  const [recallCards, setRecallCards] = useState<ActiveRecallCard[]>(() => buildInitialRecallCards(SEED_CONCEPT_NODES));
  const [telemetryLogs, setTelemetryLogs] = useState<AcademicTelemetryLog[]>([]);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY);
  const [rightTab, setRightTab] = useState<RightPanelTab>('dialogue');
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gapsResolvedToday, setGapsResolvedToday] = useState(0);
  const [explanationsToday, setExplanationsToday] = useState(0);

  const sessionStart = useRef(Date.now());
  const loadedFromDb = useRef(false);

  useEffect(() => {
    (async () => {
      const [storedGraph, storedCards, storedLogs, storedHistory] = await Promise.all([
        getGraphState(GRAPH_STATE_ID),
        getAllRecallCards(),
        getAllTelemetryLogs(),
        getAllSocraticHistory(),
      ]);
      if (storedGraph) {
        setNodes(storedGraph.nodes);
        setEdges(storedGraph.edges);
      }
      if (storedCards.length > 0) setRecallCards(storedCards);
      else void saveRecallCards(buildInitialRecallCards(SEED_CONCEPT_NODES));
      setTelemetryLogs(storedLogs);
      if (storedHistory.length > 0) {
        setTurns(storedHistory.filter((t) => t.targetedNodeId === DEFAULT_FOCUS_NODE_ID));
      }
      loadedFromDb.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!loadedFromDb.current) return;
    void saveGraphState(GRAPH_STATE_ID, nodes, edges);
  }, [nodes, edges]);

  useEffect(() => {
    document.body.setAttribute('data-font', accessibility.fontProfile);
    document.body.setAttribute('data-reduce-motion', String(accessibility.reduceMotion));
    audioEngine.setMasterVolume(accessibility.masterVolume);
    audioEngine.setAmbientSoundscape(accessibility.soundscape);
  }, [accessibility]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selectedNode = nodeById.get(selectedNodeId) ?? nodes[0];

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

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    audioEngine.playNodeTapChime();
    if (accessibility.hapticsEnabled && navigator.vibrate) navigator.vibrate(15);
  };

  const handleDragNode = (nodeId: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
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
    }
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, masteryStatus: newStatus } : n)));
    setEdges((prev) =>
      prev.map((e) =>
        e.targetNodeId === nodeId && newStatus === 'mastered' ? { ...e, isVerified: true } : e,
      ),
    );
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
      subject: selectedNode?.subject ?? 'biology',
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

        <RibbonPill icon={<Network size={14} />} label="AP Biology — Unit 3: Cellular Energetics" />
        <RibbonPill icon={<MicIcon size={14} />} label="Feynman Socratic Dialogue" />
        <RibbonPill
          icon={<Volume2 size={14} />}
          label={accessibility.soundscape === 'off' ? 'Sound Off' : '432Hz Focus Ambient (65dB Safe)'}
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <Sliders size={14} /> Accessibility
          </button>
          <button
            type="button"
            onClick={() => void handleEndSession()}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <BarChart3 size={14} /> Academic Telemetry
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[1fr_400px]">
        <section className="relative min-h-[320px] overflow-hidden">
          <ConceptGraphCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            focusMode={accessibility.focusMode}
            onSelectNode={handleSelectNode}
            onDragNode={handleDragNode}
          />
        </section>

        <section className="flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
          <div className="flex border-b border-slate-800">
            <TabButton active={rightTab === 'dialogue'} onClick={() => setRightTab('dialogue')} label="Socratic Dialogue" />
            <TabButton active={rightTab === 'recall'} onClick={() => setRightTab('recall')} label="Active Recall" />
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'dialogue' && selectedNode ? (
              <FeynmanVoicePilot
                targetNode={selectedNode}
                turns={conceptTurns}
                onNewTurn={handleNewTurn}
                onEvaluation={handleEvaluation}
                ttsEnabled={accessibility.soundscape !== 'off' || true}
              />
            ) : (
              <ActiveRecallDeck cards={recallCards} nodes={nodes} onCardReviewed={handleCardReviewed} />
            )}
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center gap-4 border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Layers size={14} className="text-emerald-400" /> Concept Health: <strong className="text-emerald-300">{masteryPercent}% Solidified</strong>
        </span>
        <span>⚡ {gapsResolvedToday} Knowledge Gaps Solved Today</span>
        <span>🟡 {activeGapCount} Active Gap{activeGapCount === 1 ? '' : 's'}</span>
        <span>🎙️ {explanationsToday} Explanations This Session</span>
        <span className="ml-auto">🎯 Exam Readiness: {examReadinessLabel}</span>
      </footer>

      {showTelemetry && <TelemetryDashboard logs={telemetryLogs} onClose={() => setShowTelemetry(false)} />}
      {showSettings && (
        <AccessibilityPanel
          settings={accessibility}
          onChange={setAccessibility}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function RibbonPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 sm:flex">
      {icon} {label}
    </span>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 flex-1 text-xs font-medium transition-colors ${
        active ? 'border-b-2 border-cyan-400 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
