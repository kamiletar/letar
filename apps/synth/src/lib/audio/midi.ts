// MIDI-утилиты: ноты ↔ частоты, имена нот

/** MIDI-нота → частота в Гц. A4 = 69 = 440 Hz. */
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

/** Нормализованный cutoff [0,1] → частота в Гц (лог-масштаб 20–20000) */
export function cutoffNormToFreq(n: number): number {
  return 20 * Math.pow(1000, Math.max(0, Math.min(1, n)))
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiNoteName(note: number): string {
  const name = NOTE_NAMES[note % 12]
  const octave = Math.floor(note / 12) - 1
  return `${name}${octave}`
}

/** Является ли нота «чёрной» клавишей (диез) */
export function isBlackKey(semitone: number): boolean {
  return [1, 3, 6, 8, 10].includes(semitone % 12)
}
