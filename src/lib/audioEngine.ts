import type { SoundscapeId } from '../types';

/**
 * Gain-stage ceiling chosen so that, combined with typical device output levels,
 * sustained playback stays under a 65dB(A) perceived-loudness target.
 */
const MASTER_GAIN_CEILING = 0.35;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientNodes: { stop: () => void } | null = null;
  private ambientId: SoundscapeId = 'off';

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = MASTER_GAIN_CEILING;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMasterVolume(volume01: number) {
    const ctx = this.ensureContext();
    const clamped = Math.max(0, Math.min(1, volume01));
    this.masterGain!.gain.setTargetAtTime(clamped * MASTER_GAIN_CEILING, ctx.currentTime, 0.05);
  }

  /** Gentle glass chime for node taps / connection confirmations. */
  playNodeTapChime() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /** Soothing harmonic harp arpeggio played when a knowledge gap is closed / node mastered. */
  playMasteryArpeggio() {
    const ctx = this.ensureContext();
    const baseFreqs = [261.63, 329.63, 392.0, 523.25, 659.25];
    baseFreqs.forEach((freq, i) => {
      const startAt = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.5, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.1);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(startAt);
      osc.stop(startAt + 1.2);
    });
  }

  /** Rhythmic double-pulse "haptic-style" audio cue paired with device vibration. */
  playGapResolvedPulse() {
    const ctx = this.ensureContext();
    [0, 0.18].forEach((offset) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.25);
    });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 60, 40]);
    }
  }

  setAmbientSoundscape(id: SoundscapeId) {
    if (id === this.ambientId) return;
    this.ambientNodes?.stop();
    this.ambientNodes = null;
    this.ambientId = id;
    if (id === 'off') return;

    const ctx = this.ensureContext();
    if (id === 'focus_432') {
      this.ambientNodes = this.buildBinauralDrone(ctx, 432, 6);
    } else if (id === 'rain' || id === 'white_noise') {
      this.ambientNodes = this.buildNoiseBed(ctx, id === 'rain');
    }
  }

  private buildBinauralDrone(ctx: AudioContext, baseFreq: number, beatFreq: number) {
    const merger = ctx.createChannelMerger(2);
    const gain = ctx.createGain();
    gain.gain.value = 0.18;

    const left = ctx.createOscillator();
    left.type = 'sine';
    left.frequency.value = baseFreq;
    const right = ctx.createOscillator();
    right.type = 'sine';
    right.frequency.value = baseFreq + beatFreq;

    const leftGain = ctx.createGain();
    leftGain.gain.value = 0.5;
    const rightGain = ctx.createGain();
    rightGain.gain.value = 0.5;

    left.connect(leftGain).connect(merger, 0, 0);
    right.connect(rightGain).connect(merger, 0, 1);
    merger.connect(gain).connect(this.masterGain!);

    left.start();
    right.start();

    return {
      stop: () => {
        left.stop();
        right.stop();
        merger.disconnect();
        gain.disconnect();
      },
    };
  }

  private buildNoiseBed(ctx: AudioContext, filtered: boolean) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filtered ? 'lowpass' : 'highpass';
    filter.frequency.value = filtered ? 1200 : 80;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    noise.connect(filter).connect(gain).connect(this.masterGain!);
    noise.start();

    return {
      stop: () => {
        noise.stop();
        filter.disconnect();
        gain.disconnect();
      },
    };
  }

  /** Warm text-to-speech reader, rate-limited for calm pacing. */
  speak(text: string, rate = 0.95) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioEngine = new AudioEngine();
