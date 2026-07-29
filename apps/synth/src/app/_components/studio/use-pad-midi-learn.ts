'use client'

import {
  defaultPadMidiMap,
  learnPadNote,
  loadPadMidiMap,
  type PadMidiMap,
  resolvePad,
  savePadMidiMap,
} from '@/lib/patch/pad-midi-map'
import { useCallback, useRef, useState } from 'react'

export interface PadMidiLearn {
  map: PadMidiMap
  active: boolean
  armedPad: number | null
  toggleActive: () => void
  armPad: (index: number) => void
  /** Вызывается из обработчика Note On. true — нота «съедена» обучением, звук пэда не триггерим. */
  handleLearnNote: (note: number) => boolean
  resolve: (note: number) => number | null
  reset: () => void
}

// Ref-зеркала состояния (как patchRef/engineTypeRef в studio-client.tsx) — handleLearnNote/resolve
// нужны стабильными по идентичности, потому что MidiInputManager захватывает колбэки один раз
// при подключении и не пересоздаётся при каждом рендере.
export function usePadMidiLearn(): PadMidiLearn {
  const [map, setMap] = useState<PadMidiMap>(() => loadPadMidiMap())
  const [active, setActive] = useState(false)
  const [armedPad, setArmedPad] = useState<number | null>(null)

  const mapRef = useRef(map)
  mapRef.current = map
  const activeRef = useRef(active)
  activeRef.current = active
  const armedPadRef = useRef(armedPad)
  armedPadRef.current = armedPad

  const toggleActive = useCallback(() => {
    setActive((prev) => !prev)
    setArmedPad(null)
  }, [])

  const armPad = useCallback((index: number) => {
    setArmedPad(index)
  }, [])

  const handleLearnNote = useCallback((note: number): boolean => {
    if (!activeRef.current || armedPadRef.current === null) {
      return false
    }
    const target = armedPadRef.current
    setMap((prev) => {
      const next = learnPadNote(prev, target, note)
      savePadMidiMap(next)
      return next
    })
    setArmedPad(null)
    return true
  }, [])

  const resolve = useCallback((note: number) => resolvePad(mapRef.current, note), [])

  const reset = useCallback(() => {
    const next = defaultPadMidiMap()
    setMap(next)
    savePadMidiMap(next)
    setArmedPad(null)
  }, [])

  return { map, active, armedPad, toggleActive, armPad, handleLearnNote, resolve, reset }
}
