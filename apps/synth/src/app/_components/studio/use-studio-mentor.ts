'use client'

import type { DrumkitPatch, FmPatch, Patch, SubtractivePatch } from '@/lib/patch/schema'
import { useCallback } from 'react'
import { useMentorEvents, useMentorStateReport } from './use-mentor-events'

type EngineType = 'subtractive' | 'fm' | 'drumkit'

interface UseStudioMentorOptions {
  started: boolean
  engineType: EngineType
  patch: SubtractivePatch
  fmPatch: FmPatch
  drumPatch: DrumkitPatch
  setEngineType: (type: EngineType) => void
  handleSwitchEngine: (type: EngineType) => Promise<void>
  handleLoadSubtractive: (p: SubtractivePatch) => void
  handleLoadFm: (p: FmPatch) => void
  handleLoadDrumkit: (p: DrumkitPatch) => void
  handleNoteOn: (midiNote: number, velocity: number) => void
  handleNoteOff: (midiNote: number) => void
}

// Интеграция с MCP-ментором (Claude Desktop): загрузка патчей/MIDI-последовательностей от
// load_patch/play_demo/send_midi_sequence + heartbeat текущего состояния студии на daw://current-state
export function useStudioMentor({
  started,
  engineType,
  patch,
  fmPatch,
  drumPatch,
  setEngineType,
  handleSwitchEngine,
  handleLoadSubtractive,
  handleLoadFm,
  handleLoadDrumkit,
  handleNoteOn,
  handleNoteOff,
}: UseStudioMentorOptions) {
  // Загружает патч, пришедший от MCP-инструмента load_patch/play_demo — переключает движок при необходимости
  const handleMentorLoadPatch = useCallback(
    async (incoming: Patch) => {
      if (incoming.type !== engineType) {
        if (started) {
          await handleSwitchEngine(incoming.type)
        } else {
          setEngineType(incoming.type)
        }
      }
      if (incoming.type === 'fm') {
        handleLoadFm(incoming)
      } else if (incoming.type === 'drumkit') {
        handleLoadDrumkit(incoming)
      } else {
        handleLoadSubtractive(incoming)
      }
    },
    [engineType, started, setEngineType, handleSwitchEngine, handleLoadFm, handleLoadDrumkit, handleLoadSubtractive]
  )

  // Проигрывает последовательность нот от send_midi_sequence/play_demo — без запущенного звука нечего проигрывать
  const handleMentorMidiSequence = useCallback(
    (notes: { note: number; velocity: number; startMs: number; durationMs: number }[]) => {
      if (!started) {
        return
      }
      for (const n of notes) {
        setTimeout(() => handleNoteOn(n.note, n.velocity), n.startMs)
        setTimeout(() => handleNoteOff(n.note), n.startMs + n.durationMs)
      }
    },
    [started, handleNoteOn, handleNoteOff]
  )

  const mentor = useMentorEvents({
    onLoadPatch: (p) => void handleMentorLoadPatch(p),
    onMidiSequence: handleMentorMidiSequence,
  })

  useMentorStateReport({
    engineType,
    patchName: engineType === 'fm' ? fmPatch.name : engineType === 'drumkit' ? drumPatch.name : patch.name,
    started,
  })

  return mentor
}
