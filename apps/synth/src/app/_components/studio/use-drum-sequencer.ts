'use client'

import { getAudioContext } from '@/lib/audio/context'
import type { DrumEngine } from '@/lib/audio/drums'
import { StepSequencer } from '@/lib/audio/sequencer'
import type { DrumkitPatch, SequencerPattern } from '@/lib/patch/schema'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export const SEQUENCER_PADS = 16
export const SEQUENCER_STEPS = 16

function emptyPattern(): boolean[][] {
  return Array.from({ length: SEQUENCER_PADS }, () => Array<boolean>(SEQUENCER_STEPS).fill(false))
}

function emptySequence(): SequencerPattern {
  return { pattern: emptyPattern(), bpm: 120 }
}

interface UseDrumSequencerOptions {
  drumEngineRef: RefObject<DrumEngine | null>
  drumPatchRef: RefObject<DrumkitPatch>
  setDrumPatch: Dispatch<SetStateAction<DrumkitPatch>>
  // Визуальная подсветка пэда — переиспользует существующий activePads-механизм студии,
  // сам звук секвенсор триггерит сам (не через handlePadHit, чтобы не дублировать логику).
  onPadHit: (index: number) => void
}

// Степ-секвенсор драм-кита: 16 пэдов × 16 шагов, планирование через StepSequencer (lookahead
// по аудио-часам). Паттерн хранится прямо в `drumPatch.engine.sequence` — сохраняется/грузится
// через обычный поток PatchLibrary (IndexedDB), отдельного стораджа для секвенсора не заводили.
export function useDrumSequencer({ drumEngineRef, drumPatchRef, setDrumPatch, onPadHit }: UseDrumSequencerOptions) {
  const sequence = drumPatchRef.current.engine.sequence ?? emptySequence()
  const pattern = sequence.pattern
  const bpm = sequence.bpm

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)

  const patternRef = useRef(pattern)
  patternRef.current = pattern
  const schedulerRef = useRef<StepSequencer | null>(null)

  const handleStep = useCallback(
    (stepIndex: number, time: number) => {
      const ctx = getAudioContext()
      const visualDelayMs = Math.max(0, (time - ctx.currentTime) * 1000)
      for (let pad = 0; pad < SEQUENCER_PADS; pad++) {
        if (!patternRef.current[pad][stepIndex]) {
          continue
        }
        const synth = drumPatchRef.current.engine.pads[pad]?.synth
        if (!synth) {
          continue
        }
        drumEngineRef.current?.trigger(synth, 0.9, time)
        setTimeout(() => onPadHit(pad), visualDelayMs)
      }
      setTimeout(() => setCurrentStep(stepIndex), visualDelayMs)
    },
    [drumEngineRef, drumPatchRef, onPadHit]
  )

  useEffect(() => {
    schedulerRef.current?.setBpm(bpm)
  }, [bpm])

  useEffect(() => {
    return () => {
      schedulerRef.current?.stop()
    }
  }, [])

  const play = useCallback(() => {
    if (!schedulerRef.current) {
      schedulerRef.current = new StepSequencer(getAudioContext(), handleStep)
    }
    schedulerRef.current.setBpm(bpm)
    schedulerRef.current.start()
    setIsPlaying(true)
  }, [bpm, handleStep])

  const stop = useCallback(() => {
    schedulerRef.current?.stop()
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

  // Пишет напрямую в drumPatch.engine.sequence — так паттерн живёт вместе с остальным
  // патчем и сохраняется/грузится через PatchLibrary без отдельного кода.
  const updateSequence = useCallback(
    (updater: (prev: SequencerPattern) => SequencerPattern) => {
      setDrumPatch((prev) => ({
        ...prev,
        engine: { ...prev.engine, sequence: updater(prev.engine.sequence ?? emptySequence()) },
      }))
    },
    [setDrumPatch]
  )

  const setBpm = useCallback(
    (next: number) => {
      updateSequence((prev) => ({ ...prev, bpm: Math.max(40, Math.min(240, next)) }))
    },
    [updateSequence]
  )

  const toggleStep = useCallback(
    (padIndex: number, stepIndex: number) => {
      updateSequence((prev) => {
        const next = prev.pattern.map((row) => [...row])
        next[padIndex] = [...next[padIndex]]
        next[padIndex][stepIndex] = !next[padIndex][stepIndex]
        return { ...prev, pattern: next }
      })
    },
    [updateSequence]
  )

  const clear = useCallback(() => {
    updateSequence((prev) => ({ ...prev, pattern: emptyPattern() }))
  }, [updateSequence])

  return { pattern, bpm, setBpm, isPlaying, currentStep, toggle, toggleStep, clear }
}
