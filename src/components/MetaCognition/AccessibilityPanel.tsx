import { Sliders, X } from 'lucide-react';
import type { AccessibilitySettings, FontProfile, SoundscapeId } from '../../types';
import { useModalA11y } from '../../lib/useModalA11y';

interface AccessibilityPanelProps {
  settings: AccessibilitySettings;
  onChange: (settings: AccessibilitySettings) => void;
  onClose: () => void;
}

const FONT_OPTIONS: { id: FontProfile; label: string }[] = [
  { id: 'default', label: 'System Default' },
  { id: 'lexend', label: 'Lexend' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible' },
  { id: 'opendyslexic', label: 'OpenDyslexic' },
];

const SOUND_OPTIONS: { id: SoundscapeId; label: string }[] = [
  { id: 'off', label: 'Silent' },
  { id: 'focus_432', label: '432Hz Focus Ambient' },
  { id: 'rain', label: 'Soft Rain' },
  { id: 'white_noise', label: 'White Noise' },
];

export default function AccessibilityPanel({ settings, onChange, onClose }: AccessibilityPanelProps) {
  const update = (partial: Partial<AccessibilitySettings>) => onChange({ ...settings, ...partial });
  const closeButtonRef = useModalA11y(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-dialog-title"
      className="animate-scrim-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="animate-modal-in mx-4 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="text-cyan-400" size={20} />
            <h2 id="accessibility-dialog-title" className="text-sm font-semibold text-slate-100">
              Sensory &amp; Accessibility Settings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Typography</legend>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ fontProfile: opt.id })}
                  className={`h-12 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    settings.fontProfile === opt.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="line-height">
              Line Height ({settings.lineHeight.toFixed(1)})
            </label>
            <input
              id="line-height"
              type="range"
              min={1.2}
              max={2.2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => update({ lineHeight: parseFloat(e.target.value) })}
              className="h-8 w-full accent-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="para-width">
              Paragraph Width ({settings.paragraphWidthCh}ch)
            </label>
            <input
              id="para-width"
              type="range"
              min={55}
              max={85}
              step={5}
              value={settings.paragraphWidthCh}
              onChange={(e) => update({ paragraphWidthCh: parseInt(e.target.value, 10) })}
              className="h-8 w-full accent-cyan-500"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ambient Soundscape</legend>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ soundscape: opt.id })}
                  className={`h-12 rounded-xl border text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    settings.soundscape === opt.id
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="volume">
              Volume (65dB Safe Ceiling)
            </label>
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => update({ masterVolume: parseFloat(e.target.value) })}
              className="h-8 w-full accent-purple-500"
            />
          </div>

          <div className="flex flex-col gap-3">
            <ToggleRow
              label="ADHD Focus Mode (dim secondary graph nodes)"
              checked={settings.focusMode}
              onChange={(v) => update({ focusMode: v })}
            />
            <ToggleRow
              label="Reduce Motion"
              checked={settings.reduceMotion}
              onChange={(v) => update({ reduceMotion: v })}
            />
            <ToggleRow
              label="Haptic Feedback"
              checked={settings.hapticsEnabled}
              onChange={(v) => update({ hapticsEnabled: v })}
            />
            <ToggleRow
              label="Voice Narration (Socratic prompts read aloud)"
              checked={settings.voiceNarrationEnabled}
              onChange={(v) => update({ voiceNarrationEnabled: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[64px] cursor-pointer items-center justify-between rounded-xl border border-slate-800 px-4 py-3 transition-colors duration-200 hover:border-slate-700 hover:bg-slate-800/40">
      <span className="text-sm text-slate-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-11 cursor-pointer accent-cyan-500"
      />
    </label>
  );
}
