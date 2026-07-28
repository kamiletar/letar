'use client'

import { getAudioContext, resumeContext } from '@/lib/audio/context'
import { DrumEngine } from '@/lib/audio/drums'
import { FmEngine } from '@/lib/audio/fm'
import { type MidiDevice, MidiInputManager } from '@/lib/audio/midi-input'
import { MasterRecorder } from '@/lib/audio/recorder'
import { renderPatchToWav } from '@/lib/audio/render'
import { buildReverbIR } from '@/lib/audio/reverb'
import { SubtractiveEngine } from '@/lib/audio/subtractive'
import { REESE_BASS } from '@/lib/patch/defaults'
import { DRUM_KIT_1 } from '@/lib/patch/drum-defaults'
import { decodeSingleVoiceSysex, encodeSingleVoiceSysex, encodeVoiceDumpRequest } from '@/lib/patch/dx7-sysex'
import { FM_GLASS_BELLS } from '@/lib/patch/fm-defaults'
import type { DrumkitPatch, DrumPad, FmPatch, SubtractivePatch } from '@/lib/patch/schema'
import { Box, Button, Link, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DrumPads } from './drum-pads'
import { DrumPanel } from './drum-panel'
import { FmPanel } from './fm-panel'
import { Keyboard } from './keyboard'
import { MidiStatus } from './midi-status'
import { ParamPanel } from './param-panel'
import { PatchLibrary } from './patch-library'

type EngineType = 'subtractive' | 'fm' | 'drumkit'

// Дефолтный маппинг MIDI-пэдов на слоты нашего драм-кита (нота 36 = пэд 0, как в GM/большинстве контроллеров)
const DRUM_MIDI_BASE = 36

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// CC-маппинг для 4 физических фейдеров SMK-37 PRO (реальные номера подтверждены на железе
// 2026-07-08: CC 68-71, НЕ 70-77 как предполагалось раньше). Абсолютные значения 0-127.
function applyCC(patch: SubtractivePatch, cc: number, raw: number): SubtractivePatch {
  const norm = raw / 127
  const e = patch.engine
  switch (cc) {
    case 68:
      return { ...patch, engine: { ...e, filter: { ...e.filter, cutoff: norm } } }
    case 69:
      return { ...patch, engine: { ...e, filter: { ...e.filter, resonance: norm * 0.99 } } }
    case 70:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, attack: norm * 2 } } } }
    case 71:
      return { ...patch, engine: { ...e, amp: { ...e.amp, adsr: { ...e.amp.adsr, release: norm * 3 } } } }
    default:
      return patch
  }
}

// Маппинг для 8 крутилок-энкодеров SMK-37 PRO (относительный шаг, см. MidiInputManager.onEncoder) —
// каждый тик прибавляет/убавляет delta к своему параметру, а не задаёт абсолютное положение.
function applyEncoderDelta(patch: SubtractivePatch, index: number, delta: number): SubtractivePatch {
  const e = patch.engine
  switch (index) {
    case 0:
      return { ...patch, engine: { ...e, osc1: { ...e.osc1, detune: clamp(e.osc1.detune + delta, -100, 100) } } }
    case 1:
      return {
        ...patch,
        engine: { ...e, filter: { ...e.filter, envAmount: clamp(e.filter.envAmount + delta * 0.01, -1, 1) } },
      }
    case 2:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, rate: clamp(e.lfo.rate + delta * 0.05, 0.01, 20) } } }
    case 3:
      return { ...patch, engine: { ...e, lfo: { ...e.lfo, depth: clamp(e.lfo.depth + delta * 0.01, 0, 1) } } }
    case 4:
      return { ...patch, engine: { ...e, amp: { ...e.amp, gain: clamp(e.amp.gain + delta * 0.01, 0, 1) } } }
    case 5:
      return {
        ...patch,
        engine: { ...e, fx: { ...e.fx, reverb: { ...e.fx.reverb, wet: clamp(e.fx.reverb.wet + delta * 0.01, 0, 1) } } },
      }
    case 6:
      return {
        ...patch,
        engine: {
          ...e,
          fx: { ...e.fx, reverb: { ...e.fx.reverb, decay: clamp(e.fx.reverb.decay + delta * 0.05, 0.1, 8) } },
        },
      }
    case 7:
      return { ...patch, engine: { ...e, osc2: { ...e.osc2, detune: clamp(e.osc2.detune + delta, -100, 100) } } }
    default:
      return patch
  }
}

export function StudioClient() {
  const [started, setStarted] = useState(false)
  const [patch, setPatch] = useState<SubtractivePatch>(REESE_BASS)
  const [fmPatch, setFmPatch] = useState<FmPatch>(FM_GLASS_BELLS)
  const [drumPatch, setDrumPatch] = useState<DrumkitPatch>(DRUM_KIT_1)
  const [engineType, setEngineType] = useState<EngineType>('subtractive')
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [selectedPad, setSelectedPad] = useState(0)
  const [activePads, setActivePads] = useState<Set<number>>(new Set())

  // MIDI состояние
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([])
  const [midiError, setMidiError] = useState<string | null>(null)
  const [octaveShift, setOctaveShift] = useState(0)
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [readStatus, setReadStatus] = useState<'idle' | 'requested' | 'received' | 'error'>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle')
  const [renderUrl, setRenderUrl] = useState<string | null>(null)

  const engineRef = useRef<SubtractiveEngine | null>(null)
  const fmEngineRef = useRef<FmEngine | null>(null)
  const drumEngineRef = useRef<DrumEngine | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const midiRef = useRef<MidiInputManager | null>(null)
  const readTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recorderRef = useRef<MasterRecorder | null>(null)

  // Ref-зеркала для использования в аудио-коллбэках без stale-замыканий
  const patchRef = useRef(patch)
  patchRef.current = patch
  const fmPatchRef = useRef(fmPatch)
  fmPatchRef.current = fmPatch
  const drumPatchRef = useRef(drumPatch)
  drumPatchRef.current = drumPatch
  const engineTypeRef = useRef(engineType)
  engineTypeRef.current = engineType

  // Reverb-шина: masterGain → [dryGain → dest] + [convolver → reverbWet → dest]
  const convolverRef = useRef<ConvolverNode | null>(null)
  const reverbWetRef = useRef<GainNode | null>(null)

  // Ударяет по пэду драм-кита (one-shot — без note-off), подсвечивает его на короткое время
  const handlePadHit = useCallback((index: number, velocity: number) => {
    const pad = drumPatchRef.current.engine.pads[index]
    if (pad?.synth) {
      drumEngineRef.current?.trigger(pad.synth, velocity)
    }
    setActivePads((prev) => new Set([...prev, index]))
    setTimeout(() => {
      setActivePads((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }, 100)
  }, [])

  const handlePadChange = useCallback((pad: DrumPad) => {
    setDrumPatch((p) => {
      const pads = [...p.engine.pads] as DrumkitPatch['engine']['pads']
      pads[pad.index] = pad
      return { ...p, engine: { pads } }
    })
  }, [])

  const handleNoteOn = useCallback(
    (midiNote: number, velocity: number) => {
      if (engineTypeRef.current === 'drumkit') {
        const padIndex = midiNote - DRUM_MIDI_BASE
        if (padIndex >= 0 && padIndex < 16) {
          handlePadHit(padIndex, velocity)
        }
        return
      }
      if (engineTypeRef.current === 'fm') {
        fmEngineRef.current?.noteOn(midiNote, velocity)
      } else {
        engineRef.current?.noteOn(midiNote, patchRef.current.engine, velocity)
      }
      setActiveNotes((prev) => new Set([...prev, midiNote]))
    },
    [handlePadHit]
  )

  const handleNoteOff = useCallback((midiNote: number) => {
    if (engineTypeRef.current === 'drumkit') {
      return // ударные — one-shot, note-off не нужен
    }
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

  // Энкодеры пока управляют только SUB-патчем (как и фейдеры) — FM/DRUM живой контроль ручками
  // за железом — открытый пункт Фазы 1.5
  const handleEncoder = useCallback((index: number, delta: number) => {
    setPatch((p) => applyEncoderDelta(p, index, delta))
  }, [])

  // Входящий SysEx от железа — ответ на запрос дампа патча (см. handleRequestFromHardware)
  const handleSysex = useCallback((bytes: Uint8Array) => {
    try {
      const { name, engine } = decodeSingleVoiceSysex(bytes)
      setFmPatch((p) => ({ ...p, name, engine }))
      fmEngineRef.current?.updatePatch(engine)
      if (readTimeoutRef.current) {
        clearTimeout(readTimeoutRef.current)
      }
      setReadStatus('received')
      readTimeoutRef.current = setTimeout(() => setReadStatus('idle'), 2000)
    } catch {
      // Не каждый входящий SysEx — ответ на наш запрос (например, эхо чужого сообщения) — тихо игнорируем
    }
  }, [])

  const handleMidiConnect = useCallback(async () => {
    setMidiError(null)
    if (!midiRef.current) {
      midiRef.current = new MidiInputManager({
        onNoteOn: handleNoteOn,
        onNoteOff: handleNoteOff,
        onCC: handleCC,
        onSysex: handleSysex,
        onEncoder: handleEncoder,
      })
    }
    try {
      const devices = await midiRef.current.connect()
      setMidiDevices(devices)
    } catch (err) {
      setMidiError(err instanceof Error ? err.message : 'Ошибка MIDI')
    }
  }, [handleNoteOn, handleNoteOff, handleCC, handleSysex, handleEncoder])

  // Запрашивает у железа дамп текущего голоса (voice edit buffer) по SysEx
  const handleRequestFromHardware = useCallback(() => {
    try {
      midiRef.current?.send(encodeVoiceDumpRequest())
      setReadStatus('requested')
      if (readTimeoutRef.current) {
        clearTimeout(readTimeoutRef.current)
      }
      readTimeoutRef.current = setTimeout(() => setReadStatus('idle'), 3000)
    } catch {
      setReadStatus('error')
      readTimeoutRef.current = setTimeout(() => setReadStatus('idle'), 2000)
    }
  }, [])

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
    recorderRef.current = new MasterRecorder(ctx, masterGain)
    setStarted(true)
    void handleMidiConnect()
  }, [handleMidiConnect])

  // Запись живого выступления с мастер-шины (см. PLAN.md Фаза 1 «Запись»)
  const handleToggleRecord = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) {
      return
    }
    if (recorder.isRecording()) {
      void recorder.stop().then((blob) => {
        setRecordingUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return URL.createObjectURL(blob)
        })
      })
      setIsRecording(false)
    } else {
      recorder.start()
      setRecordingUrl(null)
      setIsRecording(true)
    }
  }, [])

  // Детерминированный рендер текущего патча в WAV (OfflineAudioContext) — в отличие от живой
  // записи не зависит от системного аудиостека и всегда даёт один и тот же файл
  const handleRenderWav = useCallback(() => {
    const current =
      engineTypeRef.current === 'fm'
        ? fmPatchRef.current
        : engineTypeRef.current === 'drumkit'
          ? drumPatchRef.current
          : patchRef.current
    setRenderStatus('rendering')
    void renderPatchToWav(current)
      .then((blob) => {
        setRenderUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return URL.createObjectURL(blob)
        })
        setRenderStatus('done')
      })
      .catch(() => setRenderStatus('error'))
  }, [])

  // Загрузка сохранённого патча — по типу текущего движка
  const handleLoadSubtractive = useCallback((p: SubtractivePatch) => {
    engineRef.current?.allNotesOff(0.05)
    setActiveNotes(new Set())
    setPatch(p)
  }, [])

  const handleLoadFm = useCallback((p: FmPatch) => {
    setFmPatch(p)
    fmEngineRef.current?.updatePatch(p.engine)
  }, [])

  const handleLoadDrumkit = useCallback((p: DrumkitPatch) => {
    setDrumPatch(p)
  }, [])

  // Переключение движка с ленивым созданием FmEngine/DrumEngine
  const handleSwitchEngine = useCallback(
    async (type: EngineType) => {
      if (started) {
        // Останавливаем все ноты текущего движка (ударные — one-shot, останавливать нечего)
        if (engineTypeRef.current === 'fm') {
          fmEngineRef.current?.allNotesOff()
        } else if (engineTypeRef.current === 'subtractive') {
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

        // Создаём драм-движок при первом переключении
        if (type === 'drumkit' && !drumEngineRef.current && masterGainRef.current) {
          const ctx = getAudioContext()
          drumEngineRef.current = new DrumEngine(ctx, masterGainRef.current)
        }

        setEngineType(type)
      }
    },
    [started]
  )

  const handleEngineChange = useCallback(
    (engine: SubtractivePatch['engine']) => {
      if (engineRef.current && activeNotes.size > 0) {
        engineRef.current.allNotesOff(0.05)
        setActiveNotes(new Set())
      }
      setPatch((p) => ({ ...p, engine }))
    },
    [activeNotes]
  )

  // FM-патч обновляется синхронно в воркслет при изменении любого параметра
  const handleFmEngineChange = useCallback((engine: FmPatch['engine']) => {
    setFmPatch((p) => ({ ...p, engine }))
    fmEngineRef.current?.updatePatch(engine)
  }, [])

  // Отправляет текущий FM-патч на реальное железо через DX7 SysEx (single-voice dump)
  const handleSendToHardware = useCallback(() => {
    try {
      const sysex = encodeSingleVoiceSysex(fmPatchRef.current.engine, fmPatchRef.current.name)
      midiRef.current?.send(sysex)
      setSendStatus('sent')
    } catch {
      setSendStatus('error')
    }
    setTimeout(() => setSendStatus('idle'), 2000)
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
      drumEngineRef.current?.dispose()
      midiRef.current?.dispose()
      recorderRef.current?.dispose()
      if (readTimeoutRef.current) {
        clearTimeout(readTimeoutRef.current)
      }
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
            {engineType === 'fm' ? fmPatch.name : engineType === 'drumkit' ? drumPatch.name : patch.name}
          </Text>
          <Link asChild fontSize="9px" color="fg.subtle" letterSpacing="0.08em" _hover={{ color: 'accent.DEFAULT' }}>
            <NextLink href="/gallery">витрина ↗</NextLink>
          </Link>
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
              <button
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${engineType === 'drumkit' ? '#D4AF37' : '#2A2018'}`,
                  background: engineType === 'drumkit' ? '#3A2E08' : '#0E0A00',
                  color: engineType === 'drumkit' ? '#EEC835' : '#706860',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
                onClick={() => void handleSwitchEngine('drumkit')}
              >
                DRUM
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

          {started && (
            <Box display="flex" alignItems="center" gap={2}>
              <button
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${isRecording ? '#e05555' : '#5a3a10'}`,
                  background: isRecording ? '#3A0808' : 'transparent',
                  color: isRecording ? '#ff8080' : '#D4AF37',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
                onClick={handleToggleRecord}
              >
                {isRecording ? '● стоп' : '● запись'}
              </button>
              {recordingUrl && !isRecording && (
                <a
                  href={recordingUrl}
                  download={`synth-take-${Date.now()}.webm`}
                  style={{ fontSize: '9px', color: '#7fd88f', letterSpacing: '0.04em' }}
                >
                  ↓ скачать запись
                </a>
              )}
              <button
                style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: '1px solid #5a3a10',
                  background: 'transparent',
                  color: '#D4AF37',
                  cursor: renderStatus === 'rendering' ? 'wait' : 'pointer',
                  letterSpacing: '0.04em',
                }}
                disabled={renderStatus === 'rendering'}
                onClick={handleRenderWav}
              >
                {renderStatus === 'rendering' ? '… рендер' : '⇄ рендер WAV'}
              </button>
              {renderStatus === 'done' && renderUrl && (
                <a
                  href={renderUrl}
                  download={`synth-render-${Date.now()}.wav`}
                  style={{ fontSize: '9px', color: '#7fd88f', letterSpacing: '0.04em' }}
                >
                  ↓ скачать .wav
                </a>
              )}
              {renderStatus === 'error' && (
                <Text fontSize="9px" color="red.400">
                  ✗ не удалось отрендерить
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Основное содержимое */}
      <Box flex={1} overflow="auto" p={4} display="flex" flexDir="column" gap={4}>
        {/* Панели параметров — переключаемые по движку */}
        {engineType === 'subtractive' ? (
          <Box display="flex" flexDir="column" gap={2}>
            <ParamPanel engine={patch.engine} onChange={handleEngineChange} />
            <PatchLibrary
              type="subtractive"
              currentPatch={patch}
              onLoad={(p) => handleLoadSubtractive(p as SubtractivePatch)}
            />
          </Box>
        ) : engineType === 'drumkit' ? (
          <Box display="flex" flexDir="column" gap={2}>
            <DrumPanel pad={drumPatch.engine.pads[selectedPad]} onChange={handlePadChange} />
            <PatchLibrary
              type="drumkit"
              currentPatch={drumPatch}
              onLoad={(p) => handleLoadDrumkit(p as DrumkitPatch)}
            />
          </Box>
        ) : (
          <Box display="flex" flexDir="column" gap={2}>
            <FmPanel engine={fmPatch.engine} onChange={handleFmEngineChange} />
            <PatchLibrary type="fm" currentPatch={fmPatch} onLoad={(p) => handleLoadFm(p as FmPatch)} />
            {midiDevices.length > 0 && (
              <Box display="flex" alignItems="center" gap={2}>
                <button
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: '1px solid #5a3a10',
                    background: 'transparent',
                    color: '#D4AF37',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                  onClick={handleSendToHardware}
                >
                  Отправить в железо
                </button>
                {sendStatus === 'sent' && (
                  <Text fontSize="9px" color="green.400">
                    ✓ отправлено на {midiDevices[0].name}
                  </Text>
                )}
                {sendStatus === 'error' && (
                  <Text fontSize="9px" color="red.400">
                    ✗ не удалось отправить
                  </Text>
                )}
                <button
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: '1px solid #5a3a10',
                    background: 'transparent',
                    color: '#D4AF37',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                  onClick={handleRequestFromHardware}
                  title="SMK-37 PRO не отвечает на этот запрос (прошивка не поддерживает dump request) — оставлено для другого DX7-совместимого железа"
                >
                  Прочитать из железа
                </button>
                {readStatus === 'requested' && (
                  <Text fontSize="9px" color="fg.subtle">
                    … ждём ответ
                  </Text>
                )}
                {readStatus === 'received' && (
                  <Text fontSize="9px" color="green.400">
                    ✓ патч прочитан
                  </Text>
                )}
                {readStatus === 'error' && (
                  <Text fontSize="9px" color="red.400">
                    ✗ не удалось прочитать
                  </Text>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* MIDI-статус */}
        <MidiStatus
          devices={midiDevices}
          octaveShift={octaveShift}
          onOctaveShift={handleOctaveShift}
          onConnect={handleMidiConnect}
          error={midiError}
        />

        {/* Подсказка по клавиатуре/пэдам */}
        <Text fontSize="9px" color="fg.subtle" letterSpacing="0.06em" textAlign="center">
          {engineType === 'drumkit'
            ? 'Клавиши: 1 2 3 4 / Q W E R / A S D F / Z X C V — или кликай по пэдам ниже'
            : 'Клавиши: A W S E D F T G Y H U J K O L P ; — или кликай по клавишам ниже'}
        </Text>

        {/* Клавиатура или пэды — прилипает к низу */}
        <Box mt="auto" pb={4} display="flex" justifyContent="center" overflow="auto">
          {engineType === 'drumkit' ? (
            <DrumPads
              pads={drumPatch.engine.pads}
              selectedIndex={selectedPad}
              activePads={activePads}
              onSelect={setSelectedPad}
              onHit={handlePadHit}
            />
          ) : (
            <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeNotes={activeNotes} />
          )}
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
