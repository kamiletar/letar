'use client'

import { decodeMidiMessage } from '@/lib/audio/midi-decode'
import { useCallback, useRef, useState } from 'react'

export interface MidiMonitorEntry {
  id: number
  time: string
  hex: string
  channel: number | null
  type: string
}

const MAX_ENTRIES = 40

export function useMidiMonitor() {
  const [entries, setEntries] = useState<MidiMonitorEntry[]>([])
  const idRef = useRef(0)

  const record = useCallback((bytes: Uint8Array) => {
    const { hex, channel, type } = decodeMidiMessage(bytes)
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false })
    idRef.current += 1
    setEntries((prev) => [{ id: idRef.current, time, hex, channel, type }, ...prev].slice(0, MAX_ENTRIES))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  return { entries, record, clear }
}
