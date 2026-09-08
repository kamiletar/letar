/**
 * Потоковый старт воспроизведения для Hi10P-видео (стратегия `video-and-audio`, PLAN.md §10).
 *
 * Раньше плеер ждал, пока ffmpeg перекодирует ВЕСЬ файл, и только потом отдавал готовый MP4 в
 * `<video>`. Здесь вместо этого сразу создаётся `MediaSource`, а байты фрагментированного MP4
 * (`frag_keyframe+empty_moov+default_base_moof`, см. `transcode.service.ts`) добавляются в
 * `SourceBuffer` по мере поступления от ffmpeg через IPC — воспроизведение может начаться через
 * секунды, не дожидаясь конца кодирования всей серии.
 *
 * Кодек-строка `video/mp4; codecs="vp09.02.10.10,mp4a.40.2"` фиксированная и всегда верна для
 * видео — цель перекодирования (VP9 profile 2, AAC-LC) задаём мы сами в `buildCodecArgs`, не
 * угадываем по исходнику. Для звука это верно и при `audioAction: 'transcode'` (мы сами кодируем
 * в AAC-LC), и в подавляющем большинстве `audioAction: 'copy'` (исходный AAC в аниме-рипах почти
 * всегда LC-профиля) — но здесь остаётся небольшой риск для редкого HE-AAC источника; браузеры
 * при этом заметно менее строги к точности codec-строки звука, чем видео.
 *
 * Поддерживается только `plan.videoAction === 'transcode'` — для `audio-only`/`remux`
 * (`-c:v copy`) исходный видеокодек и его профиль неизвестны заранее, честная codec-строка
 * недостижима без разбора битстрима, поэтому эти стратегии остаются на прежнем пути ожидания
 * целого файла (и так быстрые — секунды/десятки секунд, не минуты).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { TranscodePlan } from '@shared/transcode-plan'

const MIME_CODEC = 'video/mp4; codecs="vp09.02.10.10,mp4a.40.2"'

export interface UseTranscodeStreamInput {
  filePath: string
  plan: TranscodePlan
  /** Длительность исходника в мс (из mediainfo) — выставляется как `MediaSource.duration` сразу */
  durationMs: number
  audioTrackIndex?: number
}

export type TranscodeStreamPhase = 'idle' | 'connecting' | 'streaming' | 'done' | 'error'

export interface UseTranscodeStreamResult {
  /** Можно ли вообще пробовать потоковый путь для этого плана и в этом окружении */
  supported: boolean
  phase: TranscodeStreamPhase
  /** blob:-URL для `<VideoPlayer src>` — появляется, как только MediaSource открылся */
  src: string | null
  /** Путь к готовому файлу в кэше — приходит по завершении, для информации/повторного просмотра */
  outputPath: string | null
  progressPercent: number | null
  error: string | null
  start: () => void
  cancel: () => void
}

export function useTranscodeStream(input: UseTranscodeStreamInput): UseTranscodeStreamResult {
  const { filePath, plan, durationMs, audioTrackIndex } = input

  const supported = plan.videoAction === 'transcode'
    && typeof MediaSource !== 'undefined'
    && MediaSource.isTypeSupported(MIME_CODEC)

  const [phase, setPhase] = useState<TranscodeStreamPhase>('idle')
  const [src, setSrc] = useState<string | null>(null)
  const [outputPath, setOutputPath] = useState<string | null>(null)
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaSourceRef = useRef<MediaSource | null>(null)
  const sourceBufferRef = useRef<SourceBuffer | null>(null)
  const pendingChunksRef = useRef<Uint8Array[]>([])
  const objectUrlRef = useRef<string | null>(null)

  const appendNext = useCallback(() => {
    const sourceBuffer = sourceBufferRef.current
    if (!sourceBuffer || sourceBuffer.updating) {
      return
    }
    const next = pendingChunksRef.current.shift()
    if (next) {
      // Байты приходят из Electron IPC как Uint8Array<ArrayBufferLike> — реально всегда
      // ArrayBuffer, но тип `appendBuffer` в lib.dom строже (`BufferSource`/ArrayBuffer)
      sourceBuffer.appendBuffer(next as Uint8Array<ArrayBuffer>)
    }
  }, [])

  const cleanup = useCallback(() => {
    sourceBufferRef.current = null
    pendingChunksRef.current = []
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    mediaSourceRef.current = null
  }, [])

  const start = useCallback(() => {
    if (!supported || phase === 'connecting' || phase === 'streaming') {
      return
    }

    setError(null)
    setOutputPath(null)
    setProgressPercent(null)
    setPhase('connecting')

    const mediaSource = new MediaSource()
    mediaSourceRef.current = mediaSource
    const objectUrl = URL.createObjectURL(mediaSource)
    objectUrlRef.current = objectUrl

    mediaSource.addEventListener('sourceopen', () => {
      if (mediaSourceRef.current !== mediaSource) {
        return
      }
      try {
        mediaSource.duration = durationMs / 1000
        const sourceBuffer = mediaSource.addSourceBuffer(MIME_CODEC)
        sourceBuffer.mode = 'sequence'
        sourceBuffer.addEventListener('updateend', appendNext)
        sourceBufferRef.current = sourceBuffer
        appendNext()
      } catch (mseError) {
        setPhase('error')
        setError(mseError instanceof Error ? mseError.message : String(mseError))
      }
    }, { once: true })

    setSrc(objectUrl)
    setPhase('streaming')

    window.electronAPI.transcode.prepareStreaming({ filePath, plan, durationMs, audioTrackIndex })
      .then((result) => {
        if (!result.success) {
          setPhase('error')
          setError(result.error ?? 'Не удалось начать потоковую подготовку')
          cleanup()
          return
        }
        if (result.cached && result.outputPath) {
          // Файл уже в кэше — потока не будет, воспроизведение пойдёт обычным путём поверх
          // готового файла; сигнализируем через outputPath, src остаётся null
          setPhase('done')
          setOutputPath(result.outputPath)
          setSrc(null)
          cleanup()
        }
      })
      .catch((invokeError: unknown) => {
        setPhase('error')
        setError(invokeError instanceof Error ? invokeError.message : String(invokeError))
        cleanup()
      })
  }, [supported, phase, filePath, plan, durationMs, audioTrackIndex, appendNext, cleanup])

  const cancel = useCallback(() => {
    window.electronAPI.transcode.cancel().catch(() => {})
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      try {
        mediaSourceRef.current.endOfStream()
      } catch {
        // MediaSource уже закрывается — не критично
      }
    }
    cleanup()
    setSrc(null)
    setPhase('idle')
  }, [cleanup])

  useEffect(() => {
    const unsubscribeChunk = window.electronAPI.transcode.onStreamChunk((chunk) => {
      pendingChunksRef.current.push(chunk)
      appendNext()
    })
    const unsubscribeProgress = window.electronAPI.transcode.onStreamProgress((progress) => {
      if (progress.percent !== undefined) {
        setProgressPercent(progress.percent)
      }
    })
    const unsubscribeEnd = window.electronAPI.transcode.onStreamEnd((result) => {
      setOutputPath(result.outputPath)
      setProgressPercent(100)
      setPhase((prev) => (prev === 'error' ? prev : 'done'))
      const mediaSource = mediaSourceRef.current
      if (mediaSource && mediaSource.readyState === 'open' && !sourceBufferRef.current?.updating) {
        try {
          mediaSource.endOfStream()
        } catch {
          // Плеер уже мог отсоединить MediaSource — не критично
        }
      }
    })
    const unsubscribeError = window.electronAPI.transcode.onStreamError((message) => {
      setPhase('error')
      setError(message)
      cleanup()
      setSrc(null)
    })

    return () => {
      unsubscribeChunk()
      unsubscribeProgress()
      unsubscribeEnd()
      unsubscribeError()
    }
  }, [appendNext, cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  return { supported, phase, src, outputPath, progressPercent, error, start, cancel }
}
