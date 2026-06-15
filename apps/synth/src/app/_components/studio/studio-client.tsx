'use client'

import { getAudioContext, resumeContext } from '@/lib/audio/context'
import { FmEngine } from '@/lib/audio/fm'
import { type MidiDevice, MidiInputManager } from '@/lib/audio/midi-input'
import { buildReverbIR } from '@/lib/audio/reverb'
import { SubtractiveEngine } from '@/lib/audio/subtractive'
import { REESE_BASS } from '@/lib/patch/defaults'
import { FM_GLASS_BELLS } from '@/lib/patch/fm-defaults'
import type { FmPatch, SubtractivePatch } from '@/lib/patch/schema'
import { Box, Button, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FmPanel } from './fm-panel'
import { Keyboard } from './keyboard'
import { MidiStatus } from './midi-status'
import { ParamPanel } from './param-panel'

type EngineType = 'subtractive' | 'fm'

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
    case 91: // GM: reverb send — wet
      return { ...patch, engine: { ...e, fx: { ...e.fx, reverb: { ...e.fx.reverb, wet: norm } } } }
    default:
      return patch
  }
}

export function StudioClient() {
  const [started, setStarted] = useState(false)
  const [patch, setPatch] = useState<SubtractivePatch>(REESE_BASS)
  const [fmPatch, setFmPatch] = useState<FmPatch>(FM_GLASS_BELLS)
  const [engineType, setEngineType] = useState<EngineType>('subtractive')
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())

  // MIDI состояние
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([])
  const [midiError, setMidiError] = useState<string | null>(null)
  const [octaveShift, setOctaveShift] = useState(0)

  const engineRef = useRef<SubtractiveEngine | null>(null)
  const fmEngineRef = useRef<FmEngine | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const midiRef = useRef<MidiInputManager | null>(null)

  // Ref-зеркала для использования в аудио-коллбэках без stale-замыканий
  const patchRef = useRef(patch)
  patchRef.current = patch
  const fmPatchRef = useRef(fmPatch)
  fmPatchRef.current = fmPatch
  const engineTypeRef = useRef(engineType)
  engineTypeRef.current = engineType

  // Reverb-шина: masterGain → [dryGain → dest] + [convolver → reverbWet → dest]
  const convolverRef = useRef<ConvolverNode | null>(null)
  const reverbWetRef = useRef<GainNode | null>(null)

  const handleNoteOn = useCallback((midiNote: number, velocity: number) => {
    if (engineTypeRef.current === 'fm') {
      fmEngineRef.current?.noteOn(midiNote, velocity)
    } else {
      engineRef.current?.noteOn(midiNote, patchRef.current.engine, velocity)
    }
    setActiveNotes((prev) => new Set([...prev, midiNote]))
  }, [])

  const handleNoteOff = useCallback((midiNote: number) => {
    if (engineTypeRef.current === 'fm') {
      fmEngineRef.current?.noteOff(midiNote)
    } else {
      engineRef.current?.noteOff(midiNote, patchRef.current.engine.amp.adsr.release)
    }
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

    // Мастер-шина: сухой сигнал + reverb send
    const masterGain = ctx.createGain()
    masterGainRef.current = masterGain

    const dryGain = ctx.createGain()
    dryGain.gain.value = 1

    const convolver = ctx.createConvolver()
    convolverRef.current = convolver

    const reverbWet = ctx.createGain()
    reverbWetRef.current = reverbWet
    reverbWet.gain.value = patchRef.current.engine.fx.reverb.wet

    masterGain.connect(dryGain)
    dryGain.connect(ctx.destination)
    masterGain.connect(convolver)
    convolver.connect(reverbWet)
    reverbWet.connect(ctx.destination)

    // Строим IR асинхронно (не блокирует старт — сначала услышишь dry)
    void buildReverbIR(ctx, patchRef.current.engine.fx.reverb.decay).then((buf) => {
      convolver.buffer = buf
    })

    engineRef.current = new SubtractiveEngine(ctx, masterGain)
    setStarted(true)
    void handleMidiConnect()
  }, [handleMidiConnect])

  // Переключение движка с ленивым созданием FmEngine
  const handleSwitchEngine = useCallback(
    async (type: EngineType) => {
      if (started) {
        // Останавливаем все ноты текущего движка
        if (engineTypeRef.current === 'fm') {
          fmEngineRef.current?.allNotesOff()
        } else {
          engineRef.current?.allNotesOff(0.05)
        }
        setActiveNotes(new Set())

        // Создаём FM-движок при первом переключении
        if (type === 'fm' && !fmEngineRef.current && masterGainRef.current) {
          const ctx = getAudioContext()
          const fm = await FmEngine.create(ctx, masterGainRef.current)
          fm.updatePatch(fmPatchRef.current.engine)
          fmEngineRef.current = fm
        }

        setEngineType(type)
      }
    },
    [started],
  )

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

  // FM-патч обновляется синхронно в воркслет при изменении любого параметра
  const handleFmEngineChange = useCallback((engine: FmPatch['engine']) => {
    setFmPatch((p) => ({ ...p, engine }))
    fmEngineRef.current?.updatePatch(engine)
  }, [])

  // Мгновенно обновляем wet gain при движении ручки
  useEffect(() => {
    if (!reverbWetRef.current) {
      return
    }
    reverbWetRef.current.gain.value = patch.engine.fx.reverb.wet
  }, [patch.engine.fx.reverb.wet])

  // Пересоздаём IR при смене decay (не при старте — там уже строится в handleStart)
  useEffect(() => {
    if (!convolverRef.current) {
      return
    }
    const ctx = getAudioContext()
    void buildReverbIR(ctx, patch.engine.fx.reverb.decay).then((buf) => {
      if (convolverRef.current) {
        convolverRef.current.buffer = buf
      }
    })
  }, [patch.engine.fx.reverb.decay])

  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      fmEngineRef.current?.dispose()
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
            {engineType === 'fm' ? fmPatch.name : patch.name}
          </Text>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          {/* Переключатель движка */}
          {started && (
            <Box display="flex" gap={1}>
              <button
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${engineType === 'subtractive' ? '#D4AF37' : '#2A2018'}`,
                  background: engineType === 'subtractive' ? '#3A2E08' : '#0E0A00',
                  color: engineType === 'subtractive' ? '#EEC835' : '#706860',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
                onClick={() => void handleSwitchEngine('subtractive')}
              >
                SUB
              </button>
              <button
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${engineType === 'fm' ? '#D4AF37' : '#2A2018'}`,
                  background: engineType === 'fm' ? '#3A2E08' : '#0E0A00',
                  color: engineType === 'fm' ? '#EEC835' : '#706860',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
                onClick={() => void handleSwitchEngine('fm')}
              >
                FM
              </button>
            </Box>
          )}

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
      </Box>

      {/* Основное содержимое */}
      <Box flex={1} overflow="auto" p={4} display="flex" flexDir="column" gap={4}>
        {/* Панели параметров — переключаемые по движку */}
        {engineType === 'subtractive'
          ? <ParamPanel engine={patch.engine} onChange={handleEngineChange} />
          : <FmPanel engine={fmPatch.engine} onChange={handleFmEngineChange} />}

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
