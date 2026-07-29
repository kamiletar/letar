'use client'

import { Arpeggiator } from '@/lib/audio/arpeggiator'
import { getAudioContext } from '@/lib/audio/context'
import type { ArpeggiatorParams } from '@/lib/patch/schema'
import { useCallback, useEffect, useRef } from 'react'

interface UseArpeggiatorOptions {
  params: ArpeggiatorParams
  noteOn: (note: number, velocity: number) => void
  noteOff: (note: number) => void
}

// Арпеджиатор живёт вне React state для звука — как и остальные аудио-движки, управляется через
// ref, параметры читаются из замыкания на каждый шаг (paramsRef), чтобы не пересоздавать
// экземпляр при каждом изменении ручки.
export function useArpeggiator({ params, noteOn, noteOff }: UseArpeggiatorOptions) {
  const paramsRef = useRef(params)
  paramsRef.current = params
  const noteOnRef = useRef(noteOn)
  noteOnRef.current = noteOn
  const noteOffRef = useRef(noteOff)
  noteOffRef.current = noteOff
  const arpRef = useRef<Arpeggiator | null>(null)

  useEffect(() => {
    arpRef.current?.updateTiming()
  }, [params.bpm])

  useEffect(() => {
    return () => {
      arpRef.current?.stop()
    }
  }, [])

  const ensure = useCallback((): Arpeggiator => {
    if (!arpRef.current) {
      arpRef.current = new Arpeggiator(
        getAudioContext(),
        (note, vel) => noteOnRef.current(note, vel),
        (note) => noteOffRef.current(note),
        () => paramsRef.current
      )
    }
    return arpRef.current
  }, [])

  const noteHeld = useCallback(
    (note: number) => {
      ensure().noteHeld(note)
    },
    [ensure]
  )

  const noteReleased = useCallback((note: number) => {
    arpRef.current?.noteReleased(note)
  }, [])

  const stopAll = useCallback(() => {
    arpRef.current?.stop()
  }, [])

  return { noteHeld, noteReleased, stopAll }
}
