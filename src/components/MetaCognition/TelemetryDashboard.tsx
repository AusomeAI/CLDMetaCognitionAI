import { lazy, Suspense, useMemo } from 'react';
import { Award, Layers, X } from 'lucide-react';
import type { AcademicTelemetryLog } from '../../types';
import { useModalA11y } from '../../lib/useModalA11y';
import GraphErrorBoundary from '../GraphErrorBoundary';

const MasteryOrb3D = lazy(() => import('./MasteryOrb3D'));

interface TelemetryDashboardProps {
  logs: AcademicTelemetryLog[];
  currentMasteryPercent: number;
  reduceMotion: boolean;
  onClose: () => void;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export default function TelemetryDashboard({
  logs,
  currentMasteryPercent,
  reduceMotion,
  onClose,
}: TelemetryDashboardProps) {
  const closeButtonRef = useModalA11y(onClose);
  const totals = useMemo(() => {
    return {
      sessions: logs.length,
      minutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
      explanations: logs.reduce((sum, l) => sum + l.explanationsSubmitted, 0),
      gapsIdentified: logs.reduce((sum, l) => sum + l.gapsIdentifiedCount, 0),
      gapsResolved: logs.reduce((sum, l) => sum + l.gapsResolvedCount, 0),
      avgClarity: average(logs.map((l) => l.averageClarityScore)),
      avgMastery: average(logs.map((l) => l.overallGraphMasteryPercent)),
    };
  }, [logs]);

  const handleExport = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="telemetry-dialog-title"
      className="animate-scrim-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm print:static print:bg-white"
    >
      <div className="animate-modal-in mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl print:max-h-none print:border-none print:bg-white print:text-black">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="text-emerald-400" size={20} />
            <h2 id="telemetry-dialog-title" className="text-sm font-semibold text-slate-100">
              Academic Mastery &amp; Cognitive Telemetry
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close telemetry dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5" id="telemetry-report">
          <h1 className="mb-4 hidden text-xl font-bold print:block">MetaCognition AI — Study Portfolio</h1>

          <div className="mb-5 flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:flex-row print:hidden">
            <div
              role="img"
              aria-label={`Current unit mastery: ${Math.round(currentMasteryPercent)} percent`}
              className="h-40 w-40 shrink-0"
            >
              <GraphErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex h-40 w-40 items-center justify-center text-2xl font-bold text-slate-50">
                      {Math.round(currentMasteryPercent)}%
                    </div>
                  }
                >
                  <MasteryOrb3D masteryPercent={currentMasteryPercent} reduceMotion={reduceMotion} />
                </Suspense>
              </GraphErrorBoundary>
            </div>
            <p className="text-center text-xs text-slate-400 sm:text-left">
              Live mastery for the unit currently on screen — the orb's fill ring and color track how solidified
              your concept graph is right now.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sessions Logged" value={totals.sessions} />
            <StatTile label="Study Minutes" value={totals.minutes} />
            <StatTile label="Explanations Submitted" value={totals.explanations} />
            <StatTile label="Avg. Clarity Index" value={`${totals.avgClarity}%`} />
            <StatTile label="Gaps Identified" value={totals.gapsIdentified} tone="amber" />
            <StatTile label="Gaps Resolved" value={totals.gapsResolved} tone="emerald" />
            <StatTile label="Graph Mastery (avg.)" value={`${totals.avgMastery}%`} tone="emerald" />
            <StatTile
              label="Gap Closure Rate"
              value={totals.gapsIdentified ? `${Math.round((totals.gapsResolved / totals.gapsIdentified) * 100)}%` : '—'}
            />
          </div>

          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
            <Layers size={14} /> Session History
          </div>
          <div className="mt-2 space-y-2">
            {logs.length === 0 && <p className="text-sm text-slate-500">No sessions recorded yet.</p>}
            {[...logs].reverse().map((log) => (
              <div
                key={log.sessionDate}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300 print:border-slate-300 print:text-black"
              >
                <span className="font-medium">{log.sessionDate}</span>
                <span className="capitalize text-slate-500 print:text-black">{log.subject.replace('_', ' ')}</span>
                <span>{log.durationMinutes} min</span>
                <span>{log.gapsResolvedCount}/{log.gapsIdentifiedCount} gaps closed</span>
                <span>{log.overallGraphMasteryPercent}% mastery</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 p-4 print:hidden">
          <button
            type="button"
            onClick={handleExport}
            className="h-12 w-full rounded-xl bg-emerald-500/20 text-sm font-medium text-emerald-300 transition-all duration-200 hover:scale-[1.01] hover:bg-emerald-500/30 active:scale-[0.99]"
          >
            Export Study Portfolio (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = 'cyan',
}: {
  label: string;
  value: string | number;
  tone?: 'cyan' | 'amber' | 'emerald';
}) {
  const toneClass = {
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
  }[tone];

  return (
    <div className="animate-fade-in-up rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition-transform duration-200 hover:-translate-y-0.5 print:border-slate-300">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 print:text-black">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass} print:text-black`}>{value}</p>
    </div>
  );
}
