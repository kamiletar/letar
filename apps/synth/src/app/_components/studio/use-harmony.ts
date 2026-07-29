'use client'

import { KEYBOARD_START_NOTE } from '@/lib/audio/midi'
import {
  type DiatonicChord,
  getDiatonicChords,
  getScaleNotes,
  getScalePitchClasses,
  type ScaleId,
  SCALES,
} from '@/lib/patch/harmony'
import { useCallback, useMemo, useState } from 'react'
import type { usePianoRoll } from './use-piano-roll'

const CHORD_LENGTH_STEPS = 4 // блок аккорда в шагах пиано-ролла (16-е доли) — четверть такта
const PREVIEW_HOLD_MS = 600

// Помощник по гармонии: выбираешь тональный центр и лад по ощущению (не по имени), слышишь его
// звучание, кликаешь по аккордам ступеней — они и звучат сразу, и ложатся в пиано-ролл блоками
// подряд (курсор сам продвигается). Настройки самого помощника не сохраняются в патче — это
// инструмент момента, а не часть звука.
export function useHarmony(pianoRoll: ReturnType<typeof usePianoRoll>) {
  const [root, setRoot] = useState(KEYBOARD_START_NOTE) // C2 — тот же тональный центр, что REESE_BASS
  const [scaleId, setScaleId] = useState<ScaleId>('natural-minor')
  const [cursor, setCursor] = useState(0)

  const scale = SCALES[scaleId]
  const pitchClasses = useMemo(() => getScalePitchClasses(root, scale.intervals), [root, scale])
  const chords = useMemo(() => getDiatonicChords(root, scale.intervals), [root, scale])

  const previewNotes = useCallback(
    (notes: number[], durationMs = PREVIEW_HOLD_MS) => {
      for (const note of notes) {
        pianoRoll.noteOn(note, 0.8)
      }
      setTimeout(() => {
        for (const note of notes) {
          pianoRoll.noteOff(note)
        }
      }, durationMs)
    },
    [pianoRoll]
  )

  // Проигрывает лад по одной ноте вверх на октаву от корня — «на что похож этот лад».
  const previewScale = useCallback(() => {
    const notes = getScaleNotes(root, scale.intervals, root, root + 12)
    const stepMs = 220
    notes.forEach((note, i) => {
      setTimeout(() => {
        pianoRoll.noteOn(note, 0.8)
        setTimeout(() => pianoRoll.noteOff(note), stepMs - 20)
      }, i * stepMs)
    })
  }, [root, scale, pianoRoll])

  // Клик по аккорду: сразу слышен (ухо решает) + ложится в пиано-ролл на текущий курсор
  // (глаз видит, как из услышанного вырастает партия) — курсор едет дальше по кругу паттерна.
  const playChord = useCallback(
    (chord: DiatonicChord) => {
      previewNotes(chord.notes)
      const steps = pianoRoll.sequence.steps
      const at = cursor % steps
      pianoRoll.insertChord(chord.notes, at, CHORD_LENGTH_STEPS)
      setCursor((c) => (c + CHORD_LENGTH_STEPS) % steps)
    },
    [previewNotes, pianoRoll, cursor]
  )

  const resetCursor = useCallback(() => setCursor(0), [])

  return { root, setRoot, scaleId, setScaleId, scale, pitchClasses, chords, previewScale, playChord, resetCursor }
}
