'use client'

import type { FocusSection, MentorStateReport, MidiSequenceNote } from '@/lib/mentor/schema'
import { MentorEventSchema } from '@/lib/mentor/schema'
import type { Patch } from '@/lib/patch/schema'
import { useEffect, useRef, useState } from 'react'

export interface MentorHighlight {
  name: string
  message: string
}

export type MentorFocusSection = FocusSection | null

interface UseMentorEventsOptions {
  /** Загрузить патч, пришедший от MCP-инструмента load_patch/play_demo */
  onLoadPatch: (patch: Patch) => void
  /** Проиграть последовательность нот, пришедшую от send_midi_sequence/play_demo */
  onMidiSequence: (notes: MidiSequenceNote[]) => void
}

const HIGHLIGHT_TIMEOUT_MS = 7000

/** Подписка на SSE-канал ментора (/api/mentor/events) — превращает MCP-инструменты в реакции UI */
export function useMentorEvents({ onLoadPatch, onMidiSequence }: UseMentorEventsOptions) {
  const [highlight, setHighlight] = useState<MentorHighlight | null>(null)
  const [focusSection, setFocusSection] = useState<MentorFocusSection>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onLoadPatchRef = useRef(onLoadPatch)
  onLoadPatchRef.current = onLoadPatch
  const onMidiSequenceRef = useRef(onMidiSequence)
  onMidiSequenceRef.current = onMidiSequence

  useEffect(() => {
    const source = new EventSource('/api/mentor/events/')

    source.onmessage = (raw) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw.data)
      } catch {
        return
      }
      const result = MentorEventSchema.safeParse(parsed)
      if (!result.success) {
        return
      }
      const event = result.data

      switch (event.kind) {
        case 'highlight_param':
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current)
          }
          setHighlight({ name: event.name, message: event.message })
          highlightTimeoutRef.current = setTimeout(() => setHighlight(null), HIGHLIGHT_TIMEOUT_MS)
          break
        case 'dim_all':
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current)
          }
          setHighlight(null)
          setFocusSection(null)
          break
        case 'focus_section':
          setFocusSection(event.section)
          break
        case 'load_patch':
          onLoadPatchRef.current(event.patch)
          break
        case 'midi_sequence':
          onMidiSequenceRef.current(event.notes)
          break
      }
    }

    return () => {
      source.close()
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  return {
    highlight,
    focusSection,
    dismissHighlight: () => setHighlight(null),
  }
}

/** Репортит текущее состояние студии на сервер (heartbeat) — читает MCP-ресурс daw://current-state */
export function useMentorStateReport(report: MentorStateReport) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reportRef = useRef(report)
  reportRef.current = report

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      fetch('/api/mentor/state/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportRef.current),
      }).catch(() => {
        // heartbeat необязателен — тихо игнорируем сбой сети
      })
    }, 400)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [report.engineType, report.patchName, report.started])
}
