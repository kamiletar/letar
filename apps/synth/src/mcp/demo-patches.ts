// Куратoрский набор демо-патчей для инструмента play_demo — используем существующие дефолты
// движков (не дублируем их), с готовой демо-фразой под каждый.
import { REESE_BASS } from '../lib/patch/defaults.js'
import { DRUM_KIT_1 } from '../lib/patch/drum-defaults.js'
import { FM_GLASS_BELLS } from '../lib/patch/fm-defaults.js'
import { DEFAULT_PAD_MIDI_BASE } from '../lib/patch/pad-midi-map.js'
import type { Patch } from '../lib/patch/schema.js'

export interface DemoNote {
  note: number
  velocity: number
  startMs: number
  durationMs: number
}

export interface DemoPatchEntry {
  patch: Patch
  /** Короткая демо-фраза, которая проигрывается сразу после загрузки патча */
  notes: DemoNote[]
}

// Бас-риф на C1/C2 — показывает раскатистость Reese-баса
const reeseDemo: DemoNote[] = [
  { note: 36, velocity: 110, startMs: 0, durationMs: 500 },
  { note: 36, velocity: 90, startMs: 600, durationMs: 250 },
  { note: 43, velocity: 100, startMs: 900, durationMs: 250 },
  { note: 36, velocity: 115, startMs: 1300, durationMs: 700 },
]

// Восходящее трезвучие — показывает стеклянную атаку FM-колокольчиков
const glassBellsDemo: DemoNote[] = [
  { note: 60, velocity: 100, startMs: 0, durationMs: 900 },
  { note: 64, velocity: 95, startMs: 250, durationMs: 900 },
  { note: 67, velocity: 100, startMs: 500, durationMs: 1200 },
  { note: 72, velocity: 90, startMs: 900, durationMs: 1400 },
]

// Простой брейкбит: kick-kick-snare-hat по раскладке DEFAULT_PAD_MIDI_BASE (пэд 0=kick, 2=snare, 6=hat)
const breakbeatDemo: DemoNote[] = [
  { note: DEFAULT_PAD_MIDI_BASE + 0, velocity: 110, startMs: 0, durationMs: 80 },
  { note: DEFAULT_PAD_MIDI_BASE + 0, velocity: 90, startMs: 250, durationMs: 80 },
  { note: DEFAULT_PAD_MIDI_BASE + 2, velocity: 100, startMs: 500, durationMs: 80 },
  { note: DEFAULT_PAD_MIDI_BASE + 6, velocity: 70, startMs: 625, durationMs: 60 },
  { note: DEFAULT_PAD_MIDI_BASE + 0, velocity: 100, startMs: 750, durationMs: 80 },
  { note: DEFAULT_PAD_MIDI_BASE + 2, velocity: 105, startMs: 1000, durationMs: 80 },
]

export const DEMO_PATCHES: Record<string, DemoPatchEntry> = {
  'reese-bass': { patch: REESE_BASS, notes: reeseDemo },
  'glass-bells': { patch: FM_GLASS_BELLS, notes: glassBellsDemo },
  'breakbeat-kit-1': { patch: DRUM_KIT_1, notes: breakbeatDemo },
}

export function listDemoPatchIds(): string[] {
  return Object.keys(DEMO_PATCHES)
}
