'use client'

import { resumeContext } from '@/lib/audio/context'
import { type MidiDevice, MidiInputManager } from '@/lib/audio/midi-input'
import { SubtractiveEngine } from '@/lib/audio/subtractive'
import { REESE_BASS } from '@/lib/patch/defaults'
import type { SubtractivePatch } from '@/lib/patch/schema'
import { Box, Button, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard } from './keyboard'
import { MidiStatus } from './midi-status'
import { ParamPanel } from './param-panel'

// CC-маппинг для 8 энкодеров (стандартные GM + диапазон 70-77)
// Точный маппинг SMK-37 PRO уточняется в Фазе 1.5
function applyCC(patch: SubtractivePatch, cc: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (cc) {
    case 7:
      return { ...patch, engine: { ...e, amp: { ...e.amp, gain: norm } } }
    case 70:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, detune: (norm - 0.5) * 100 } } }
    case 71:
      return { ...patch, engine: { ...e, filter: { ...e.filter, resonance: norm * 0.99 } } }
    case 72:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, release: norm * 3 } } } }
    case 73:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, attack: norm * 2 } } } }
    case 74:
      return { ...patch, engine: { ...e, filter: { ...e.filter, cutoff: norm } } }
    case 75:
      return { ...patch, engine: { ...e, filter: { ...e.filter, envAmount: (norm - 0.5) * 2 } } }
    case 76:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, rate: norm * 8 } } }
    case 77:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, depth: norm } } }
    default:
      return patch
  }
}

export function StudioClient() {
  const [started, setStarted] = useState(false)
  const [patch, setPatch] = useState<SubtractivePatch>(REESE_BASS)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())

  // MIDI состояние
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([])
  const [midiError, setMidiError] = useState<string | null>(null)
  const [octaveShift, setOctaveShift] = useState(0)

  const engineRef = useRef<SubtractiveEngine | null>(null)
  const midiRef = useRef<MidiInputManager | null>(null)
  // Актуальный патч в ref — аудио-коллбэки не видят stale-замыкания
  const patchRef = useRef(patch)
  patchRef.current = patch

  const handleNoteOn = useCallback((midiNote: number, velocity: number) => {
    engineRef.current?.noteOn(midiNote, patchRef.current.engine, velocity)
    setActiveNotes((prev) => new Set([...prev, midiNote]))
  }, [])

  const handleNoteOff = useCallback((midiNote: number) => {
    engineRef.current?.noteOff(midiNote, patchRef.current.engine.amp.adsr.release)
    setActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(midiNote)
      return next
    })
  }, [])

  const handleCC = useCallback((cc: number, value: number) => {
    setPatch((p) => applyCC(p, cc, value))
  }, [])

  const handleMidiConnect = useCallback(async () => {
    setMidiError(null)
    if (!midiRef.current) {
      midiRef.current = new MidiInputManager({
        onNoteOn: handleNoteOn,
        onNoteOff: handleNoteOff,
        onCC: handleCC,
      })
    }
    try {
      const devices = await midiRef.current.connect()
      setMidiDevices(devices)
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : 'Ошибка MIDI')
    }
  }, [handleNoteOn, handleNoteOff, handleCC])

  const handleOctaveShift = useCallback((delta: number) => {
    midiRef.current?.shiftOctave(delta)
    setOctaveShift(midiRef.current?.getOctaveShift() ?? 0)
  }, [])

  const handleStart = useCallback(async () => {
    const ctx = await resumeContext()
    engineRef.current = new SubtractiveEngine(ctx, ctx.destination)
    setStarted(true)
    // Автоподключение MIDI при старте (не блокирует, ошибки молчим — юзер сам нажмёт)
    void handleMidiConnect()
  }, [handleMidiConnect])

  const handleEngineChange = useCallback(
    (engine: SubtractivePatch['engine']) => {
      if (engineRef.current && activeNotes.size > 0) {
        engineRef.current.allNotesOff(0.05)
        setActiveNotes(new Set())
      }
      setPatch((p) => ({ ...p, engine }))
    },
    [activeNotes],
  )

  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      midiRef.current?.dispose()
    }
  }, [])

  return (
    <Box minH="100dvh" bg="bg.DEFAULT" display="flex" flexDir="column">
      {/* Шапка */}
      <Box
        px={6}
        py={3}
        borderBottom="1px solid"
        borderColor="border.subtle"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Text fontSize="sm" color="accent.DEFAULT" fontWeight="100" letterSpacing="0.2em">
            ✦
          </Text>
          <Text fontSize="xs" color="fg.muted" letterSpacing="0.15em" textTransform="uppercase">
            {patch.name}
          </Text>
        </Box>

        {!started && (
          <Button
            size="sm"
            variant="outline"
            borderColor="accent.DEFAULT"
            color="accent.emphasized"
            _hover={{ bg: 'accent.muted' }}
            onClick={handleStart}
            letterSpacing="0.1em"
            fontSize="xs"
          >
            ▶ Запустить звук
          </Button>
        )}

        {started && (
          <Text fontSize="9px" color="fg.subtle" letterSpacing="0.08em">
            ● активен · клавиши A–; · мышь · MIDI
          </Text>
        )}
      </Box>

      {/* Основное содержимое */}
      <Box flex={1} overflow="auto" p={4} display="flex" flexDir="column" gap={4}>
        {/* Панель параметров */}
        <ParamPanel engine={patch.engine} onChange={handleEngineChange} />

        {/* MIDI-статус */}
        <MidiStatus
          devices={midiDevices}
          octaveShift={octaveShift}
          onOctaveShift={handleOctaveShift}
          onConnect={handleMidiConnect}
          error={midiError}
        />

        {/* Подсказка по клавиатуре */}
        <Text fontSize="9px" color="fg.subtle" letterSpacing="0.06em" textAlign="center">
          Клавиши: A W S E D F T G Y H U J K O L P ; — или кликай по клавишам ниже
        </Text>

        {/* Клавиатура — прилипает к низу */}
        <Box mt="auto" pb={4} display="flex" justifyContent="center" overflow="auto">
          <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeNotes={activeNotes} />
        </Box>
      </Box>

      {/* Оверлей «нажми чтобы начать» */}
      {!started && (
        <Box
          position="fixed"
          inset={0}
          bg="bg.overlay"
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          gap={6}
          zIndex={10}
          onClick={handleStart}
          cursor="pointer"
        >
          <Text fontSize="4xl" color="accent.DEFAULT" fontWeight="100">
            ✦
          </Text>
          <Text fontSize="lg" color="fg.DEFAULT" fontWeight="200" letterSpacing="0.2em">
            Нажми чтобы услышать
          </Text>
          <Text fontSize="xs" color="fg.subtle" letterSpacing="0.08em">
            Web Audio требует жест пользователя
          </Text>
        </Box>
      )}
    </Box>
  )
}
