import type { SubtractivePatch } from './schema'

// Reese-бас: 2 пилы расстроены на 7 центов, LFO медленно дышит cutoff-ом
export const REESE_BASS: SubtractivePatch = {
  schemaVersion: 1,
  id: 'reese-bass-001',
  name: 'Reese Bass',
  author: 'synth',
  visibility: 'private',
  license: 'CC0-1.0',
  tags: ['bass', 'dnb', 'reese'],
  createdAt: '2026-01-01T00:00:00Z',
  color: null,
  render: { previewWav: null },
  type: 'subtractive',
  engine: {
    osc1: { wave: 'sawtooth', octave: 0, detune: 0, gain: 0.7 },
    osc2: { wave: 'sawtooth', octave: 0, detune: 7, gain: 0.6 },
    filter: {
      type: 'lowpass',
      cutoff: 0.35, // ~90 Hz — тёмный старт
      resonance: 0.25,
      envAmount: 0.0,
      adsr: { attack: 0.005, decay: 0.5, sustain: 1.0, release: 0.3 },
    },
    amp: {
      adsr: { attack: 0.005, decay: 0.1, sustain: 1.0, release: 0.25 },
      gain: 0.75,
    },
    lfo: {
      wave: 'sine',
      target: 'cutoff',
      rate: 0.35, // медленное дыхание (~2 такта при 88bpm)
      depth: 0.18,
    },
  },
}
