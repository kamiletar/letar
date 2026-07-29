'use client'

import type { ArpeggiatorParams, FmPatch, MelodicSequence, SubtractivePatch } from '@/lib/patch/schema'
import { useCallback, useRef } from 'react'
import { useArpeggiator } from './use-arpeggiator'
import { emptyMelodicSequence, usePianoRoll } from './use-piano-roll'

const DEFAULT_ARP: ArpeggiatorParams = { enabled: false, mode: 'up', stepsPerNote: 2, octaves: 1, gate: 0.8, bpm: 120 }

type EngineType = 'subtractive' | 'fm' | 'drumkit'

interface UseMelodicPerformanceOptions {
  engineType: EngineType
  patch: SubtractivePatch
  setPatch: (updater: (prev: SubtractivePatch) => SubtractivePatch) => void
  fmPatch: FmPatch
  setFmPatch: (updater: (prev: FmPatch) => FmPatch) => void
  soundNoteOn: (note: number, velocity: number) => void
  soundNoteOff: (note: number) => void
  clearActiveNotes: () => void
}

// Арпеджиатор + пиано-ролл для SUB/FM-движков: настройки живут в `patch.engine.arpeggiator`/
// `sequence`, как и секвенсор драм-кита. Вынесено из studio-client.tsx (Фаза 3, по образцу
// DrumkitColumn) — тот же приём: явные пропсы, без общего context-объекта.
export function useMelodicPerformance({
  engineType,
  patch,
  setPatch,
  fmPatch,
  setFmPatch,
  soundNoteOn,
  soundNoteOff,
  clearActiveNotes,
}: UseMelodicPerformanceOptions) {
  const engineTypeRef = useRef(engineType)
  engineTypeRef.current = engineType

  // Арпеджиатор активен только для текущего движка (SUB/FM)
  const currentArp =
    engineType === 'fm'
      ? (fmPatch.engine.arpeggiator ?? DEFAULT_ARP)
      : engineType === 'subtractive'
        ? (patch.engine.arpeggiator ?? DEFAULT_ARP)
        : DEFAULT_ARP
  const arpeggiator = useArpeggiator({ params: currentArp, noteOn: soundNoteOn, noteOff: soundNoteOff })
  const arpEnabledRef = useRef(currentArp.enabled)
  arpEnabledRef.current = currentArp.enabled

  const setArp = useCallback(
    (updater: (prev: ArpeggiatorParams) => ArpeggiatorParams) => {
      if (engineTypeRef.current === 'fm') {
        setFmPatch((p) => ({
          ...p,
          engine: { ...p.engine, arpeggiator: updater(p.engine.arpeggiator ?? DEFAULT_ARP) },
        }))
      } else if (engineTypeRef.current === 'subtractive') {
        setPatch((p) => ({ ...p, engine: { ...p.engine, arpeggiator: updater(p.engine.arpeggiator ?? DEFAULT_ARP) } }))
      }
    },
    [setPatch, setFmPatch]
  )

  const handleToggleArp = useCallback(() => {
    setArp((prev) => {
      const next = { ...prev, enabled: !prev.enabled }
      if (!next.enabled) {
        arpeggiator.stopAll()
        clearActiveNotes()
      }
      return next
    })
  }, [setArp, arpeggiator, clearActiveNotes])

  // Пиано-ролл SUB/FM — паттерн живёт в `patch.engine.sequence`/`fmPatch.engine.sequence`
  const setSubSequence = useCallback(
    (updater: (prev: MelodicSequence) => MelodicSequence) => {
      setPatch((p) => ({
        ...p,
        engine: { ...p.engine, sequence: updater(p.engine.sequence ?? emptyMelodicSequence()) },
      }))
    },
    [setPatch]
  )

  const setFmSequence = useCallback(
    (updater: (prev: MelodicSequence) => MelodicSequence) => {
      setFmPatch((p) => ({
        ...p,
        engine: { ...p.engine, sequence: updater(p.engine.sequence ?? emptyMelodicSequence()) },
      }))
    },
    [setFmPatch]
  )

  const subPianoRoll = usePianoRoll({
    sequence: patch.engine.sequence,
    setSequence: setSubSequence,
    noteOn: soundNoteOn,
    noteOff: soundNoteOff,
  })
  const fmPianoRoll = usePianoRoll({
    sequence: fmPatch.engine.sequence,
    setSequence: setFmSequence,
    noteOn: soundNoteOn,
    noteOff: soundNoteOff,
  })

  return { currentArp, arpeggiator, arpEnabledRef, setArp, handleToggleArp, subPianoRoll, fmPianoRoll }
}
