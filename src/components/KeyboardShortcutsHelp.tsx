import { Keyboard, RotateCcw, X } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
  onReplayTour: () => void;
}

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: '?', description: 'Open this shortcuts overlay from anywhere' },
  { keys: 'Esc', description: 'Close the open dialog, panel, or overlay' },
  { keys: 'Tab / Shift+Tab', description: 'Move focus between nodes, tabs, and controls' },
  { keys: 'Enter / Space', description: 'Select the focused concept node' },
  { keys: '↑ ↓ ← → or W A S D', description: 'Nudge the focused node around the 2D graph' },
  { keys: 'Scroll / + / −', description: 'Zoom the 2D graph canvas in or out' },
  { keys: 'Drag', description: 'Reposition a node (2D) or orbit the camera (3D)' },
];

export default function KeyboardShortcutsHelp({ onClose, onReplayTour }: KeyboardShortcutsHelpProps) {
  const closeButtonRef = useModalA11y(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="animate-scrim-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-in flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="text-cyan-400" size={20} />
            <h2 id="shortcuts-dialog-title" className="text-sm font-semibold text-slate-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="space-y-1 overflow-y-auto p-4">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-800/50"
            >
              <span className="text-slate-300">{s.description}</span>
              <kbd className="shrink-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-mono text-slate-300">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onReplayTour}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 transition-all duration-200 hover:scale-[1.01] hover:bg-slate-800 active:scale-[0.99]"
          >
            <RotateCcw size={14} /> Replay Welcome Tour
          </button>
        </div>
      </div>
    </div>
  );
}
