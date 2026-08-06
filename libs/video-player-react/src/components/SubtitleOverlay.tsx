/**
 * SubtitleOverlay — компонент для рендеринга ASS/SSA субтитров
 *
 * Использует SubtitlesOctopus (libass-wasm) для рендеринга
 * сложных субтитров с поддержкой стилей, анимаций и позиционирования.
 *
 * ВАЖНО: Компонент не рендерит собственный UI — SubtitlesOctopus сам создаёт
 * canvas элемент рядом с video. Это необходимо для корректной работы resize().
 */

import { type RefObject, useEffect, useRef } from 'react'

/** Пропсы компонента SubtitleOverlay */
export interface SubtitleOverlayProps {
  /** Ссылка на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** URL к файлу субтитров (.ass, .ssa) */
  subtitleUrl?: string | null
  /** Содержимое субтитров (альтернатива URL) */
  subtitleContent?: string
  /** Массив URL к шрифтам */
  fonts?: string[]
  /** URL к worker файлу (по умолчанию '/libassjs-worker.js') */
  workerUrl?: string
  /** URL к fallback шрифту (по умолчанию '/default.woff2') */
  fallbackFont?: string
  /** Обработчик ошибки */
  onError?: (error: Error) => void
  /** Обработчик успешной загрузки */
  onReady?: () => void
  /** Debug режим */
  debug?: boolean
  /** Отступ сверху (пиксели) — сжимает область субтитров при видимом хедере */
  topOffset?: number
  /** Отступ снизу (пиксели) — сжимает область субтитров при видимых контролах */
  bottomOffset?: number
}

/** Тип для SubtitlesOctopus инстанса */
interface SubtitlesOctopusInstance {
  setTrackByUrl: (url: string) => void
  setTrack: (content: string) => void
  freeTrack: () => void
  setCurrentTime: (time: number) => void
  dispose: () => void
  resize: (width: number, height: number, top?: number, left?: number) => void
}

/** Тип для SubtitlesOctopus конструктора */
interface SubtitlesOctopusOptions {
  video?: HTMLVideoElement
  subUrl?: string
  subContent?: string
  fonts?: string[]
  workerUrl?: string
  legacyWorkerUrl?: string
  fallbackFont?: string
  onReady?: () => void
  onError?: (error: Error) => void
  debug?: boolean
}

declare global {
  interface Window {
    SubtitlesOctopus?: new(options: SubtitlesOctopusOptions) => SubtitlesOctopusInstance
  }
}

/**
 * SubtitleOverlay компонент
 *
 * Рендерит ASS/SSA субтитры поверх видео используя libass-wasm.
 * Компонент не создаёт собственный canvas — SubtitlesOctopus сам создаёт
 * canvasParent div рядом с video элементом для корректного позиционирования.
 */
export function SubtitleOverlay({
  videoRef,
  subtitleUrl,
  subtitleContent,
  fonts = [],
  workerUrl = '/libassjs-worker.js',
  fallbackFont = '/default.woff2',
  onError,
  onReady,
  debug = false,
  topOffset = 0,
  bottomOffset = 0,
}: SubtitleOverlayProps) {
  const instanceRef = useRef<SubtitlesOctopusInstance | null>(null)

  // Refs для callback'ов — чтобы избежать пересоздания при изменении
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)
  const fontsRef = useRef(fonts)

  // Refs для offset'ов — доступны из onReady callback'а без пересоздания эффекта
  const topOffsetRef = useRef(topOffset)
  const bottomOffsetRef = useRef(bottomOffset)

  // Обновляем refs
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])
  useEffect(() => {
    fontsRef.current = fonts
  }, [fonts])
  useEffect(() => {
    topOffsetRef.current = topOffset
  }, [topOffset])
  useEffect(() => {
    bottomOffsetRef.current = bottomOffset
  }, [bottomOffset])

  // Инициализация SubtitlesOctopus — только при изменении subtitleUrl или subtitleContent
  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return
    }
    if (!subtitleUrl && !subtitleContent) {
      return
    }

    // Проверяем доступность SubtitlesOctopus
    if (!window.SubtitlesOctopus) {
      if (debug) {
        console.warn('[SubtitleOverlay] SubtitlesOctopus not loaded')
      }
      return
    }

    let initialized = false

    // Функция инициализации — возвращает true если успешно
    const initOctopus = (): boolean => {
      // Проверяем что video имеет размеры
      const rect = video.getBoundingClientRect()

      if (!video.videoWidth || !video.videoHeight || !rect.width || !rect.height) {
        return false
      }

      if (initialized || instanceRef.current) {
        return true
      }

      try {
        const options: SubtitlesOctopusOptions = {
          video,
          fonts: fontsRef.current,
          workerUrl,
          fallbackFont,
          onReady: () => {
            if (debug) {
              console.warn('[SubtitleOverlay] Ready')
            }
            onReadyRef.current?.()
            // Применяем offset'ы после инициализации (SubtitlesOctopus уже авто-ресайзился)
            requestAnimationFrame(() => {
              const inst = instanceRef.current
              if (!inst || !video) {
                return
              }
              const top = topOffsetRef.current
              const bottom = bottomOffsetRef.current
              if (top > 0 || bottom > 0) {
                const r = video.getBoundingClientRect()
                if (r.width && r.height) {
                  inst.resize(r.width, r.height - top - bottom, top, 0)
                }
              }
            })
          },
          onError: (error) => {
            if (debug) {
              console.error('[SubtitleOverlay] Error:', error)
            }
            onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)))
          },
          debug,
        }

        // Добавляем источник субтитров
        if (subtitleUrl) {
          options.subUrl = subtitleUrl
        } else if (subtitleContent) {
          options.subContent = subtitleContent
        }

        instanceRef.current = new window.SubtitlesOctopus!(options)
        initialized = true

        return true
      } catch (error) {
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)))
        return false
      }
    }

    // Пробуем инициализировать сразу (если video уже готов)
    if (!initOctopus()) {
      // Video ещё не готов — ждём события готовности
      let cancelled = false
      let retryCount = 0
      const MAX_RETRIES = 60 // ~1 секунда при 60fps

      const tryInit = () => {
        if (cancelled || initialized) {
          return
        }
        if (!initOctopus() && retryCount < MAX_RETRIES) {
          retryCount++
          requestAnimationFrame(tryInit)
        }
      }

      const handleVideoReady = () => {
        tryInit()
      }

      // Слушаем несколько событий для надёжности
      video.addEventListener('loadedmetadata', handleVideoReady)
      video.addEventListener('loadeddata', handleVideoReady)
      video.addEventListener('canplay', handleVideoReady)

      // Cleanup для event listeners
      return () => {
        cancelled = true
        video.removeEventListener('loadedmetadata', handleVideoReady)
        video.removeEventListener('loadeddata', handleVideoReady)
        video.removeEventListener('canplay', handleVideoReady)
        if (instanceRef.current) {
          try {
            instanceRef.current.dispose()
          } catch {
            // Игнорируем ошибки dispose() — DOM элементы могут быть уже удалены
          }
          instanceRef.current = null
        }
      }
    }

    // Video был готов сразу — cleanup без event listener
    return () => {
      if (instanceRef.current) {
        try {
          instanceRef.current.dispose()
        } catch {
          // Игнорируем ошибки dispose() — DOM элементы могут быть уже удалены
        }
        instanceRef.current = null
      }
    }
  }, [videoRef, subtitleUrl, subtitleContent, workerUrl, fallbackFont, debug]) // Убрали fonts, onError, onReady из dependencies!

  // Обновление субтитров при изменении источника
  useEffect(() => {
    if (!instanceRef.current) {
      return
    }

    if (subtitleUrl) {
      instanceRef.current.setTrackByUrl(subtitleUrl)
    } else if (subtitleContent) {
      instanceRef.current.setTrack(subtitleContent)
    } else {
      instanceRef.current.freeTrack()
    }
  }, [subtitleUrl, subtitleContent])

  // Сжатие области субтитров при видимых контролах — через resize() API
  // SubtitlesOctopus's внутренний ResizeObserver ресайзит canvas на весь video,
  // а мы переопределяем после него через requestAnimationFrame
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const applyResize = () => {
      const instance = instanceRef.current
      if (!instance) {
        return
      }

      const rect = video.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      const top = topOffset
      const bottom = bottomOffset

      if (top > 0 || bottom > 0) {
        instance.resize(rect.width, rect.height - top - bottom, top, 0)
      } else {
        // Без offset'ов — восстанавливаем полный размер
        instance.resize(rect.width, rect.height, 0, 0)
      }
    }

    // Применяем при изменении offset'ов
    requestAnimationFrame(applyResize)

    // ResizeObserver переопределяет после SubtitlesOctopus auto-resize
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(applyResize)
    })
    observer.observe(video)

    return () => observer.disconnect()
  }, [videoRef, topOffset, bottomOffset])

  // Компонент не рендерит UI — SubtitlesOctopus сам создаёт canvas рядом с video
  return null
}
