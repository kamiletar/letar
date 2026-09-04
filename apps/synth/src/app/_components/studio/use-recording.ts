'use client'

import { MasterRecorder } from '@/lib/audio/recorder'
import { useCallback, useEffect, useRef, useState } from 'react'

// Живая запись с мастер-шины (MediaRecorder) — кнопка запись/стоп + скачивание .webm.
// В отличие от детерминированного WAV-рендера (use-wav-render.ts) слышит реальное живое исполнение.
export function useRecording() {
  const recorderRef = useRef<MasterRecorder | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  // Имя файла для скачивания — фиксируется один раз, в момент готовности записи (внутри
  // колбэка recorder.stop().then, не в рендере компонента): Date.now() там — обычный
  // обработчик события, а не чтение времени во время рендера (react(purity)).
  const [downloadName, setDownloadName] = useState<string | null>(null)

  const attach = useCallback((ctx: AudioContext, source: AudioNode) => {
    recorderRef.current = new MasterRecorder(ctx, source)
  }, [])

  const toggle = useCallback(() => {
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
        setDownloadName(`synth-take-${Date.now()}.webm`)
      })
      setIsRecording(false)
    } else {
      recorder.start()
      setRecordingUrl(null)
      setDownloadName(null)
      setIsRecording(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose()
    }
  }, [])

  return { isRecording, recordingUrl, downloadName, attach, toggle }
}
