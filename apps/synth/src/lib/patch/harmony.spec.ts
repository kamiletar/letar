import { describe, expect, it } from 'vitest'
import { getDiatonicChords, getScaleNotes, getScalePitchClasses, SCALES } from './harmony'

describe('getScalePitchClasses', () => {
  it('строит классы высоты натурального минора от C (0)', () => {
    const classes = getScalePitchClasses(0, SCALES['natural-minor'].intervals)
    expect([...classes].sort((a, b) => a - b)).toEqual([0, 2, 3, 5, 7, 8, 10])
  })

  it('корректно переносит корень через границу октавы (MIDI 127)', () => {
    const classes = getScalePitchClasses(127, [0, 3, 7])
    expect(classes.has((127 + 3) % 12)).toBe(true)
  })
})

describe('getScaleNotes', () => {
  it('возвращает только ноты лада внутри диапазона, по возрастанию', () => {
    const notes = getScaleNotes(60, SCALES.major.intervals, 60, 72)
    expect(notes).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })

  it('пустой диапазон без совпадений даёт пустой массив', () => {
    expect(getScaleNotes(60, SCALES.major.intervals, 61, 61)).toEqual([])
  })
})

describe('getDiatonicChords', () => {
  it('натуральный минор от C: i ii° III iv v VI VII', () => {
    const chords = getDiatonicChords(60, SCALES['natural-minor'].intervals)
    expect(chords.map((c) => c.quality)).toEqual(['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'])
    expect(chords[0].notes).toEqual([60, 63, 67]) // Cm: C Eb G
  })

  it('мажор от C: I ii iii IV V vi vii°', () => {
    const chords = getDiatonicChords(60, SCALES.major.intervals)
    expect(chords.map((c) => c.quality)).toEqual(['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'])
    expect(chords[0].notes).toEqual([60, 64, 67]) // C: C E G
  })

  it('гармонический минор: V становится мажорным (доминанта с изломом)', () => {
    const chords = getDiatonicChords(60, SCALES['harmonic-minor'].intervals)
    expect(chords[4].quality).toBe('major')
  })

  it('пентатоника (5 ступеней) — диатонические трезвучия не определены', () => {
    expect(getDiatonicChords(60, SCALES['pentatonic-minor'].intervals)).toEqual([])
  })
})
