import { describe, expect, it } from 'vitest'
import { generateChordPattern } from './chord-pattern'

describe('generateChordPattern', () => {
  it('block-аккорд: все ноты стартуют одновременно', () => {
    const notes = generateChordPattern({ root: 60, chordType: 'major', style: 'block' })
    expect(notes.map((n) => n.note)).toEqual([60, 64, 67])
    expect(notes.every((n) => n.startMs === 0)).toBe(true)
  })

  it('minor-трезвучие: интервалы 0-3-7', () => {
    const notes = generateChordPattern({ root: 60, chordType: 'minor', style: 'block' })
    expect(notes.map((n) => n.note)).toEqual([60, 63, 67])
  })

  it('major7: 4 ноты, интервалы 0-4-7-11', () => {
    const notes = generateChordPattern({ root: 48, chordType: 'major7', style: 'block' })
    expect(notes.map((n) => n.note)).toEqual([48, 52, 55, 59])
  })

  it('arpeggio-up: ноты по возрастанию нот, с шагом arpeggioStepMs', () => {
    const notes = generateChordPattern({ root: 60, chordType: 'major', style: 'arpeggio-up', arpeggioStepMs: 100 })
    expect(notes.map((n) => n.note)).toEqual([60, 64, 67])
    expect(notes.map((n) => n.startMs)).toEqual([0, 100, 200])
  })

  it('arpeggio-down: та же тройка нот, но в обратном порядке проигрывания', () => {
    const notes = generateChordPattern({ root: 60, chordType: 'major', style: 'arpeggio-down', arpeggioStepMs: 100 })
    expect(notes.map((n) => n.note)).toEqual([67, 64, 60])
    expect(notes.map((n) => n.startMs)).toEqual([0, 100, 200])
  })

  it('дефолтные velocity/noteDurationMs/arpeggioStepMs применяются, если не заданы', () => {
    const notes = generateChordPattern({ root: 60, chordType: 'sus4', style: 'block' })
    expect(notes.every((n) => n.velocity === 100)).toBe(true)
    expect(notes.every((n) => n.durationMs === 800)).toBe(true)
  })

  it('sus2/sus4: интервалы без терции', () => {
    expect(generateChordPattern({ root: 60, chordType: 'sus2', style: 'block' }).map((n) => n.note)).toEqual([
      60, 62, 67,
    ])
    expect(generateChordPattern({ root: 60, chordType: 'sus4', style: 'block' }).map((n) => n.note)).toEqual([
      60, 65, 67,
    ])
  })
})
