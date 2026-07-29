'use client'

import { getAudioContext } from '@/lib/audio/context'
import { type AudioInputDevice, listAudioInputDevices } from '@/lib/audio/hardware-recorder'
import { createLevelReader, type LevelReading } from '@/lib/audio/level-meter'
import { buildMusicalAudioConstraints } from '@/lib/audio/media-constraints'
import { MixRecorder } from '@/lib/audio/recorder'
import {
  applyVoiceChainParams,
  buildVoiceChain,
  DEFAULT_VOICE_CHAIN_PARAMS,
  type VoiceChainNodes,
  type VoiceChainParams,
} from '@/lib/audio/voice-chain'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MasterBus } from './use-master-bus'

const EMPTY_LEVEL: LevelReading = { peak: 0, rms: 0, clipping: false }

/**
 * Вокальный тракт студии (Фаза 5): микрофон → компрессор/EQ/де-эссер → монитор в наушники +
 * send в общую реверб-комнату мастер-шины. Независим от MIDI/аудио-движков SUB/FM/DRUM — как и
 * HardwareRecorder, источник звука — getUserMedia, а не наши синтезаторы.
 *
 * Репетиция: включённый монитор = «в наушниках то же, что будет на сцене» — не отдельный режим,
 * а просто активное состояние тракта (голос слышен сразу, живьём, без задержки записи).
 */
export function useVoiceChain(masterBus: MasterBus | null) {
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<VoiceChainParams>(DEFAULT_VOICE_CHAIN_PARAMS)
  const [level, setLevel] = useState<LevelReading>(EMPTY_LEVEL)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const nodesRef = useRef<VoiceChainNodes | null>(null)
  const levelRafRef = useRef<number | null>(null)
  const recorderRef = useRef<MixRecorder | null>(null)

  const refreshDevices = useCallback(async () => {
    setError(null)
    try {
      const list = await listAudioInputDevices()
      setDevices(list)
      setSelectedDeviceId((prev) => prev ?? list[0]?.deviceId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить доступ к микрофону')
    }
  }, [])

  const stopLevelLoop = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current)
      levelRafRef.current = null
    }
    setLevel(EMPTY_LEVEL)
  }, [])

  const stop = useCallback(() => {
    stopLevelLoop()
    recorderRef.current?.dispose()
    recorderRef.current = null
    setIsRecording(false)
    sourceRef.current?.disconnect()
    sourceRef.current = null
    nodesRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setActive(false)
  }, [stopLevelLoop])

  const start = useCallback(async () => {
    if (!selectedDeviceId || !masterBus) {
      setError('Сначала выбери микрофон и запусти студию')
      return
    }
    setError(null)
    try {
      const ctx = getAudioContext()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildMusicalAudioConstraints(selectedDeviceId),
      })
      const source = ctx.createMediaStreamSource(stream)
      const nodes = buildVoiceChain(ctx, params)
      source.connect(nodes.input)
      nodes.reverbSendGain.connect(masterBus.convolver)

      streamRef.current = stream
      sourceRef.current = source
      nodesRef.current = nodes

      const readLevel = createLevelReader(nodes.levelAnalyser)
      const tick = () => {
        setLevel(readLevel())
        levelRafRef.current = requestAnimationFrame(tick)
      }
      levelRafRef.current = requestAnimationFrame(tick)

      setActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключить микрофон')
    }
  }, [selectedDeviceId, masterBus, params])

  const toggleActive = useCallback(() => {
    if (active) {
      stop()
    } else {
      void start()
    }
  }, [active, start, stop])

  const updateParams = useCallback((next: VoiceChainParams) => {
    setParams(next)
    if (nodesRef.current) {
      applyVoiceChainParams(nodesRef.current, next)
    }
  }, [])

  // Запись комбинированного дубля: голос (пост-тракт) + текущий инструмент/бит мастер-шины
  // в один файл — «поверх патчей и битов» из PLAN.md.
  const toggleRecording = useCallback(() => {
    if (!nodesRef.current || !masterBus) {
      setError('Сначала включи микрофон')
      return
    }
    if (!recorderRef.current) {
      const ctx = getAudioContext()
      recorderRef.current = new MixRecorder(ctx, [masterBus.masterGain, nodesRef.current.output])
    }
    const recorder = recorderRef.current
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
  }, [masterBus])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    refreshDevices,
    active,
    toggleActive,
    error,
    params,
    updateParams,
    level,
    isRecording,
    recordingUrl,
    toggleRecording,
  }
}
