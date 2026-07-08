import type { DrumkitPatch, DrumPad } from './schema'

// Пустой пэд — заготовка под будущий звук/сэмпл
function emptyPad(index: number, name: string): DrumPad {
  return { index, name, synth: null }
}

// Первый «геройский» драм-кит: 808/909-стиль, заточен под DnB/breakbeat
// (12 звучащих пэдов + 4 пустых под будущие сэмплы/перкуссию)
const PADS: DrumPad[] = [
  { index: 0, name: 'Kick 808', synth: { type: '808kick', pitch: 24, decay: 0.6, tone: 0.2, level: 0.9 } },
  { index: 1, name: 'Kick Tight', synth: { type: '808kick', pitch: 30, decay: 0.25, tone: 0.45, level: 0.85 } },
  { index: 2, name: 'Snare', synth: { type: 'snare', pitch: 60, decay: 0.2, tone: 0.55, level: 0.85 } },
  { index: 3, name: 'Snare Rim', synth: { type: 'snare', pitch: 64, decay: 0.12, tone: 0.75, level: 0.7 } },
  { index: 4, name: 'Clap', synth: { type: 'clap', pitch: 60, decay: 0.3, tone: 0.6, level: 0.8 } },
  { index: 5, name: 'Hat Closed', synth: { type: 'hat-closed', pitch: 80, decay: 0.06, tone: 0.8, level: 0.6 } },
  { index: 6, name: 'Hat Open', synth: { type: 'hat-open', pitch: 80, decay: 0.35, tone: 0.75, level: 0.6 } },
  { index: 7, name: 'Hat Tight', synth: { type: 'hat-closed', pitch: 84, decay: 0.03, tone: 0.9, level: 0.55 } },
  { index: 8, name: 'Tom Low', synth: { type: 'tom', pitch: 45, decay: 0.35, tone: 0.3, level: 0.75 } },
  { index: 9, name: 'Tom Mid', synth: { type: 'tom', pitch: 52, decay: 0.3, tone: 0.3, level: 0.75 } },
  { index: 10, name: 'Tom Hi', synth: { type: 'tom', pitch: 60, decay: 0.25, tone: 0.3, level: 0.75 } },
  { index: 11, name: 'Perc', synth: { type: 'clap', pitch: 65, decay: 0.2, tone: 0.35, level: 0.7 } },
  emptyPad(12, 'Empty'),
  emptyPad(13, 'Empty'),
  emptyPad(14, 'Empty'),
  emptyPad(15, 'Empty'),
]

export const DRUM_KIT_1: DrumkitPatch = {
  schemaVersion: 1,
  id: 'drum-kit-001',
  name: 'Breakbeat Kit 1',
  author: 'synth',
  visibility: 'private',
  license: 'CC0-1.0',
  tags: ['drums', '808', '909', 'dnb', 'breakbeat'],
  createdAt: '2026-01-01T00:00:00Z',
  color: null,
  render: { previewWav: null },
  type: 'drumkit',
  engine: { pads: PADS },
}
