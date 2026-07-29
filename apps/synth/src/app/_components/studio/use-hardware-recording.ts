'use client'

import { type AudioInputDevice, HardwareRecorder, listAudioInputDevices } from '@/lib/audio/hardware-recorder'
import { useCallback, useEffect, useRef, useState } from 'react'

// Запись реального звука с внешнего аудиоустройства (SMK-37 в режиме USB-audio interface и т.п.).
// В отличие от useRecording (recorder.ts) источник — не наш AudioContext, а getUserMedia.
export function useHardwareRecording() {
  const recorderRef = useRef<HardwareRecorder | null>(null)
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshDevices = useCallback(async () => {
    setError(null)
    try {
      const list = await listAudioInputDevices()
      setDevices(list)
      setSelectedDeviceId((prev) => prev ?? list[0]?.deviceId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить доступ к аудиовходу')
    }
  }, [])

  const toggle = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new HardwareRecorder()
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
      return
    }
    if (!selectedDeviceId) {
      setError('Сначала выбери аудиовход')
      return
    }
    setError(null)
    void recorder
      .start(selectedDeviceId)
      .then(() => {
        setRecordingUrl(null)
        setIsRecording(true)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Не удалось начать запись')
      })
  }, [selectedDeviceId])

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose()
    }
  }, [])

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isRecording,
    recordingUrl,
    error,
    refreshDevices,
    toggle,
  }
}
