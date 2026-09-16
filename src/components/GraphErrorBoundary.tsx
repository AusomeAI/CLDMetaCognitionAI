import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface GraphErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface GraphErrorBoundaryState {
  error: Error | null;
}

/**
 * Isolates the concept graph canvas (2D or 3D) so a rendering failure there — e.g. a
 * WebGL context loss or a bad node coordinate — shows a recoverable fallback instead
 * of blanking the whole app. Socratic dialogue, recall deck, and telemetry keep working.
 *
 * The caller should mount this under an element keyed on whatever identifies "which
 * graph" (unit id, view mode, ...) so that switching away and back remounts the
 * boundary fresh, rather than the boundary reaching for setState in
 * componentDidUpdate to reset itself.
 */
export default class GraphErrorBoundary extends Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
  state: GraphErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Concept graph rendering failed:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/30 bg-slate-950/60 p-6 text-center">
          <AlertTriangle className="text-amber-400" size={28} />
          <p className="text-sm font-medium text-slate-200">The concept graph hit a rendering error.</p>
          <p className="max-w-sm text-xs text-slate-500">
            Your progress is safe — dialogue, recall cards, and telemetry are unaffected. Try switching views or
            retrying the graph.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-700 px-4 text-xs font-medium text-slate-200 transition-all duration-200 hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.97]"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
