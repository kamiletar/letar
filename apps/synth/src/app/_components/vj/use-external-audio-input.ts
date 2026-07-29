'use client'

import { getAudioContext } from '@/lib/audio/context'
import { type AudioInputDevice, ExternalAudioInput, listAudioInputDevices } from '@/lib/audio/external-audio-input'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Переключатель источника VJ между «своей» студией и внешним звуком (mic/line) —
 * для реакции визуала на чужую музыку на вечеринке/фаершоу без нашего звука на сцене.
 */
export function useExternalAudioInput() {
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<ExternalAudioInput | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      const list = await listAudioInputDevices()
      setDevices(list)
      setSelectedDeviceId((prev) => prev ?? list[0]?.deviceId ?? null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нет доступа к аудиовходу')
    }
  }, [])

  const start = useCallback(async () => {
    if (!selectedDeviceId) {
      return
    }
    try {
      const input = new ExternalAudioInput(getAudioContext())
      await input.start(selectedDeviceId)
      inputRef.current = input
      setActive(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключить вход')
    }
  }, [selectedDeviceId])

  const stop = useCallback(() => {
    inputRef.current?.stop()
    inputRef.current = null
    setActive(false)
  }, [])

  const toggle = useCallback(() => {
    if (active) {
      stop()
    } else {
      void start()
    }
  }, [active, start, stop])

  useEffect(() => {
    return () => inputRef.current?.stop()
  }, [])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    active,
    error,
    refreshDevices,
    toggle,
    analyser: inputRef.current?.analyser ?? null,
  }
}
