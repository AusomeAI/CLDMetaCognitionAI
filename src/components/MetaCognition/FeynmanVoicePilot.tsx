import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';
import type { ConceptNode, SocraticTurn } from '../../types';
import { evaluateFeynmanExplanation } from '../../lib/feynmanEvaluator';
import { audioEngine } from '../../lib/audioEngine';

interface FeynmanVoicePilotProps {
  targetNode: ConceptNode;
  turns: SocraticTurn[];
  onNewTurn: (turn: SocraticTurn) => void;
  onEvaluation: (nodeId: string, newStatus: ConceptNode['masteryStatus']) => void;
  ttsEnabled: boolean;
}

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

const FIRST_PROMPT = (label: string) =>
  `Explain in your own words: how does the mechanism behind "${label}" actually work? Imagine you're explaining it to a smart 10-year-old.`;

export default function FeynmanVoicePilot({
  targetNode,
  turns,
  onNewTurn,
  onEvaluation,
  ttsEnabled,
}: FeynmanVoicePilotProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [draftText, setDraftText] = useState('');
  const [waveform, setWaveform] = useState<number[]>(new Array(28).fill(2));
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const supportsSpeech = !!getSpeechRecognitionCtor();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    if (turns.length === 0 && ttsEnabled) {
      const prompt = FIRST_PROMPT(targetNode.label);
      audioEngine.speak(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNode.id]);

  const stopWaveformLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startWaveformLoop = (analyser: AnalyserNode) => {
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buffer);
      const step = Math.floor(buffer.length / 28) || 1;
      const bars: number[] = [];
      for (let i = 0; i < 28; i++) {
        bars.push(Math.max(2, buffer[i * step] / 8));
      }
      setWaveform(bars);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      startWaveformLoop(analyser);
    } catch {
      // Microphone unavailable — waveform stays flat, transcript still works via typed input.
    }

    const Ctor = getSpeechRecognitionCtor();
    if (Ctor) {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        if (finalText) setDraftText((prev) => `${prev} ${finalText}`.trim());
        setLiveTranscript(interimText);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      recognitionRef.current = recognition;
    }

    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    stopWaveformLoop();
    setWaveform(new Array(28).fill(2));
    setLiveTranscript('');
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else void startRecording();
  };

  const submitExplanation = () => {
    const text = draftText.trim();
    if (!text) return;

    const studentTurn: SocraticTurn = {
      id: `turn-${Date.now()}-student`,
      speaker: 'student',
      timestamp: Date.now(),
      text,
      targetedNodeId: targetNode.id,
    };
    onNewTurn(studentTurn);

    const evaluation = evaluateFeynmanExplanation(targetNode, text);
    const update = evaluation.nodesToUpdate[0];
    onEvaluation(targetNode.id, update.newStatus);

    if (update.newStatus === 'mastered') {
      audioEngine.playMasteryArpeggio();
    } else if (update.newStatus === 'gap_detected') {
      audioEngine.playGapResolvedPulse();
    }

    const feedbackPrefix =
      update.newStatus === 'mastered'
        ? '✨ Spot on! '
        : evaluation.analogyDetected
          ? '👍 Good instinct with that analogy. '
          : '';

    const aiTurn: SocraticTurn = {
      id: `turn-${Date.now()}-ai`,
      speaker: 'ai_copilot',
      timestamp: Date.now() + 1,
      text: `${feedbackPrefix}${evaluation.recommendedSocraticQuestion}`,
      targetedNodeId: targetNode.id,
      recognizedAnalogy: evaluation.analogyDetected ? text : undefined,
      highlightedGap: evaluation.identifiedGaps[0],
    };
    onNewTurn(aiTurn);

    if (ttsEnabled) {
      audioEngine.speak(aiTurn.text);
    }

    setDraftText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-400">
          Feynman Socratic Co-Pilot
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {turns.length === 0 ? FIRST_PROMPT(targetNode.label) : `Target concept: ${targetNode.label}`}
        </p>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-100">
            {FIRST_PROMPT(targetNode.label)}
          </div>
        )}
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`animate-fade-in-up max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow ${
              turn.speaker === 'student'
                ? 'ml-auto border border-cyan-500/30 bg-cyan-500/10 text-cyan-50'
                : 'mr-auto border border-purple-500/30 bg-purple-500/10 text-purple-50 shadow-[0_0_24px_-12px_rgba(139,92,246,0.6)]'
            }`}
          >
            <p>{turn.text}</p>
            {turn.highlightedGap && (
              <p className="mt-2 text-xs text-amber-300">⚠ {turn.highlightedGap}</p>
            )}
          </div>
        ))}
        {liveTranscript && (
          <div className="ml-auto max-w-[92%] rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm italic text-cyan-200/70">
            {liveTranscript}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 flex h-10 items-end justify-center gap-[3px]" aria-hidden="true">
          {waveform.map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-cyan-400 transition-all duration-100 ease-out"
              style={{ height: `${Math.min(40, h)}px`, opacity: isRecording ? 1 : 0.25 }}
            />
          ))}
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={!supportsSpeech && !navigator.mediaDevices}
            aria-pressed={isRecording}
            aria-label={isRecording ? 'Stop recording explanation' : 'Hold or tap to speak your explanation'}
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
              isRecording
                ? 'animate-pulse border-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]'
                : 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
            }`}
          >
            {isRecording ? <Mic size={26} /> : <MicOff size={26} />}
          </button>

          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Speak or type your explanation here…"
            rows={2}
            className="min-h-[64px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={submitExplanation}
            disabled={!draftText.trim()}
            aria-label="Submit explanation"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 transition-all duration-200 hover:scale-105 hover:bg-emerald-500/30 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          >
            <Send size={22} />
          </button>
        </div>

        {!supportsSpeech && (
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Volume2 size={12} /> Voice recognition isn't supported in this browser — typed explanations work the same way.
          </p>
        )}
      </div>
    </div>
  );
}
