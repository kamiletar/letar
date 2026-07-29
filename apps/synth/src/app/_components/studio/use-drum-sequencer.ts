'use client'

import { getAudioContext } from '@/lib/audio/context'
import type { DrumEngine } from '@/lib/audio/drums'
import { StepSequencer } from '@/lib/audio/sequencer'
import type { DrumkitPatch } from '@/lib/patch/schema'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export const SEQUENCER_PADS = 16
export const SEQUENCER_STEPS = 16

function emptyPattern(): boolean[][] {
  return Array.from({ length: SEQUENCER_PADS }, () => Array<boolean>(SEQUENCER_STEPS).fill(false))
}

interface UseDrumSequencerOptions {
  drumEngineRef: RefObject<DrumEngine | null>
  drumPatchRef: RefObject<DrumkitPatch>
  // Визуальная подсветка пэда — переиспользует существующий activePads-механизм студии,
  // сам звук секвенсор триггерит сам (не через handlePadHit, чтобы не дублировать логику).
  onPadHit: (index: number) => void
}

// Степ-секвенсор драм-кита: 16 пэдов × 16 шагов, планирование через StepSequencer (lookahead
// по аудио-часам). Паттерн живёт только в памяти студии — сохранение вместе с патчем не сделано.
export function useDrumSequencer({ drumEngineRef, drumPatchRef, onPadHit }: UseDrumSequencerOptions) {
  const [pattern, setPattern] = useState<boolean[][]>(emptyPattern)
  const [bpm, setBpm] = useState(120)
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

  const toggleStep = useCallback((padIndex: number, stepIndex: number) => {
    setPattern((prev) => {
      const next = prev.map((row) => [...row])
      next[padIndex] = [...next[padIndex]]
      next[padIndex][stepIndex] = !next[padIndex][stepIndex]
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setPattern(emptyPattern())
  }, [])

  return { pattern, bpm, setBpm, isPlaying, currentStep, toggle, toggleStep, clear }
}
