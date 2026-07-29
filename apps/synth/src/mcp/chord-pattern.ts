// Чистая генерация MIDI-последовательности аккорда — без побочных эффектов, отдельно
// тестируемо. Используется инструментом generate_chord_pattern (сам не шлёт события).
import type { DemoNote } from './demo-patches.js'

export const CHORD_TYPES = ['major', 'minor', 'major7', 'minor7', 'dom7', 'sus2', 'sus4'] as const
export type ChordType = (typeof CHORD_TYPES)[number]

export const CHORD_STYLES = ['block', 'arpeggio-up', 'arpeggio-down'] as const
export type ChordStyle = (typeof CHORD_STYLES)[number]

const CHORD_INTERVALS: Record<ChordType, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
}

export interface GenerateChordPatternParams {
  /** MIDI-нота корня аккорда (0-127) */
  root: number
  chordType: ChordType
  style: ChordStyle
  /** Скорость арпеджио между нотами (мс), игнорируется для style='block' */
  arpeggioStepMs?: number
  /** Длительность звучания ноты (мс) */
  noteDurationMs?: number
  velocity?: number
}

export function generateChordPattern(params: GenerateChordPatternParams): DemoNote[] {
  const { root, chordType, style, arpeggioStepMs = 150, noteDurationMs = 800, velocity = 100 } = params
  const intervals = CHORD_INTERVALS[chordType]
  const notes = intervals.map((interval) => root + interval)
  const ordered = style === 'arpeggio-down' ? [...notes].reverse() : notes

  if (style === 'block') {
    return notes.map((note) => ({ note, velocity, startMs: 0, durationMs: noteDurationMs }))
  }

  return ordered.map((note, index) => ({
    note,
    velocity,
    startMs: index * arpeggioStepMs,
    durationMs: noteDurationMs,
  }))
}
