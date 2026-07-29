'use client'

import { getAudioContext } from '@/lib/audio/context'
import { MelodicSequencer } from '@/lib/audio/melodic-sequencer'
import type { MelodicSequence } from '@/lib/patch/schema'
import { useCallback, useEffect, useRef, useState } from 'react'

// Длины нот, между которыми циклится клик по ячейке пиано-ролла (в шагах-16-х).
const CYCLE_LENGTHS = [1, 2, 4]

export function emptyMelodicSequence(steps = 16): MelodicSequence {
  return { notes: [], steps, bpm: 120, swing: 0 }
}

interface UsePianoRollOptions {
  sequence: MelodicSequence | undefined
  setSequence: (updater: (prev: MelodicSequence) => MelodicSequence) => void
  noteOn: (note: number, velocity: number) => void
  noteOff: (note: number) => void
}

// Пиано-ролл для SUB/FM: ноты с высотой и длительностью (в отличие от булевой драм-сетки).
// Паттерн хранится прямо в `patch.engine.sequence` — сохраняется/грузится через PatchLibrary
// вместе с остальным патчем, как и у драм-секвенсора (use-drum-sequencer.ts).
export function usePianoRoll({ sequence, setSequence, noteOn, noteOff }: UsePianoRollOptions) {
  const current = sequence ?? emptyMelodicSequence()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)

  const sequenceRef = useRef(current)
  sequenceRef.current = current
  const noteOnRef = useRef(noteOn)
  noteOnRef.current = noteOn
  const noteOffRef = useRef(noteOff)
  noteOffRef.current = noteOff
  const schedulerRef = useRef<MelodicSequencer | null>(null)

  useEffect(() => {
    schedulerRef.current?.updateTiming()
  }, [current.bpm, current.swing])

  useEffect(() => {
    return () => {
      schedulerRef.current?.stop()
    }
  }, [])

  const play = useCallback(() => {
    if (!schedulerRef.current) {
      schedulerRef.current = new MelodicSequencer(
        getAudioContext(),
        (note, vel) => noteOnRef.current(note, vel),
        (note) => noteOffRef.current(note),
        () => sequenceRef.current
      )
    }
    schedulerRef.current.start((step) => setCurrentStep(step))
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    schedulerRef.current?.stop()
    schedulerRef.current = null
    setIsPlaying(false)
    setCurrentStep(-1)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      play()
    }
  }, [isPlaying, play, stop])

  const setBpm = useCallback(
    (bpm: number) => {
      setSequence((prev) => ({ ...prev, bpm: Math.max(40, Math.min(240, bpm)) }))
    },
    [setSequence]
  )

  const setSwing = useCallback(
    (swing: number) => {
      setSequence((prev) => ({ ...prev, swing: Math.max(0, Math.min(1, swing)) }))
    },
    [setSequence]
  )

  // Клик по ячейке: пусто → нота длиной 1 шаг; клик по существующей ноте — удлиняет по циклу
  // CYCLE_LENGTHS, на последней длине — удаляет. Так одним кликом можно и создать, и вырастить,
  // и убрать ноту без отдельного режима «редактирования длины».
  const toggleCell = useCallback(
    (note: number, step: number) => {
      setSequence((prev) => {
        const existing = prev.notes.find((n) => n.note === note && step >= n.step && step < n.step + n.length)
        if (existing) {
          const idx = CYCLE_LENGTHS.indexOf(existing.length)
          const nextLength = CYCLE_LENGTHS[idx + 1]
          const withoutIt = prev.notes.filter((n) => n !== existing)
          if (nextLength === undefined) {
            return { ...prev, notes: withoutIt }
          }
          return { ...prev, notes: [...withoutIt, { ...existing, length: nextLength }] }
        }
        return { ...prev, notes: [...prev.notes, { note, step, length: CYCLE_LENGTHS[0], velocity: 0.8 }] }
      })
    },
    [setSequence]
  )

  const clear = useCallback(() => {
    setSequence((prev) => ({ ...prev, notes: [] }))
  }, [setSequence])

  return { sequence: current, isPlaying, currentStep, toggle, setBpm, setSwing, toggleCell, clear }
}
