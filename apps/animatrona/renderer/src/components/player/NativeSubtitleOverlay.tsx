'use client'

/**
 * NativeSubtitleOverlay - Отображение VTT/SRT субтитров поверх видео
 *
 * Читает cues из TextTrack и рендерит их как абсолютно позиционированный текст
 * Поддерживает HTML-разметку (<i>, <b>, <u>) и корректно работает в fullscreen
 * Вычисляет позицию относительно реального видео (учитывает letterbox)
 */

import { Box } from '@chakra-ui/react'
import DOMPurify from 'dompurify'
import { type RefObject, useCallback, useEffect, useState } from 'react'

interface NativeSubtitleOverlayProps {
  /** Ссылка на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** VTT URL (blob URL) */
  vttUrl: string | null
}

/** Разрешённые теги для субтитров — никаких атрибутов! */
const ALLOWED_TAGS = ['i', 'b', 'u', 'em', 'strong', 'br']

/**
 * Санитизация HTML через DOMPurify — защита от XSS в субтитрах
 * Разрешаем только базовые теги форматирования без атрибутов
 */
function sanitizeSubtitleHtml(text: string): string {
  // Заменяем переводы строк на <br>, затем санитизируем
  const withBreaks = text.replace(/\n/g, '<br/>')
  return DOMPurify.sanitize(withBreaks, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [], // Никаких атрибутов — защита от onclick и т.п.
  })
}

/**
 * Вычисляет отступ снизу для субтитров на основе реального размера видео
 * Учитывает letterbox (чёрные полосы) для видео с разным соотношением сторон
 */
function calculateVideoBottom(video: HTMLVideoElement): number {
  const containerWidth = video.clientWidth
  const containerHeight = video.clientHeight
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight

  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return 80 // fallback
  }

  const containerAspect = containerWidth / containerHeight
  const videoAspect = videoWidth / videoHeight

  let letterboxBottom = 0

  if (videoAspect > containerAspect) {
    // Видео шире контейнера — чёрные полосы сверху и снизу
    const scaledHeight = containerWidth / videoAspect
    letterboxBottom = (containerHeight - scaledHeight) / 2
  }
  // Если видео уже контейнера — чёрные полосы по бокам, снизу отступ не нужен

  // Отступ от нижней границы видео + padding для контролов (~100px)
  return letterboxBottom + 100
}

/**
 * Компонент для отображения субтитров поверх видео
 */
export function NativeSubtitleOverlay({ videoRef, vttUrl }: NativeSubtitleOverlayProps) {
  const [currentText, setCurrentText] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(80)

  // Пересчитываем позицию субтитров при изменении размера видео
  const updatePosition = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setBottomOffset(calculateVideoBottom(video))
    }
  }, [videoRef])

  // Отслеживаем fullscreen режим
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Пересчитываем позицию при входе/выходе из fullscreen
      setTimeout(updatePosition, 100)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [updatePosition])

  // Обновляем позицию при загрузке метаданных видео и ресайзе
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const handleLoadedMetadata = () => updatePosition()
    const handleResize = () => updatePosition()

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    window.addEventListener('resize', handleResize)

    // Начальная позиция
    updatePosition()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      window.removeEventListener('resize', handleResize)
    }
  }, [videoRef, updatePosition])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !vttUrl) {
      setCurrentText('')
      return
    }

    // Ждём пока track загрузится
    const checkTrack = () => {
      if (video.textTracks.length === 0) {
        return
      }

      const track = video.textTracks[0]

      // Скрываем нативное отображение
      track.mode = 'hidden'

      // Слушаем изменения активных cues
      const handleCueChange = () => {
        if (track.activeCues && track.activeCues.length > 0) {
          // Собираем текст из всех активных cues
          const texts: string[] = []
          for (let i = 0; i < track.activeCues.length; i++) {
            const cue = track.activeCues[i] as VTTCue
            if (cue.text) {
              texts.push(cue.text)
            }
          }
          setCurrentText(texts.join('\n'))
        } else {
          setCurrentText('')
        }
      }

      track.addEventListener('cuechange', handleCueChange)

      // Начальная проверка
      handleCueChange()

      return () => {
        track.removeEventListener('cuechange', handleCueChange)
      }
    }

    // Пробуем сразу и с задержкой (track может загружаться асинхронно)
    const cleanup1 = checkTrack()
    const timer = setTimeout(() => {
      checkTrack()
    }, 500)

    return () => {
      cleanup1?.()
      clearTimeout(timer)
    }
  }, [videoRef, vttUrl])

  if (!currentText) {
    return null
  }

  // В fullscreen используем fixed позиционирование
  // bottomOffset вычисляется на основе реального размера видео (учитывает letterbox)
  const positionStyle = isFullscreen
    ? { position: 'fixed' as const, bottom: `${bottomOffset}px` }
    : { position: 'absolute' as const, bottom: `${bottomOffset}px` }

  return (
    <Box
      {...positionStyle}
      left="50%"
      transform="translateX(-50%)"
      maxW="80%"
      textAlign="center"
      pointerEvents="none"
      zIndex={9999}
      fontSize="xl"
      fontWeight="medium"
      color="white"
      textShadow="0 0 4px black, 0 0 4px black, 2px 2px 4px black"
      px={4}
      py={2}
      bg="blackAlpha.600"
      borderRadius="md"
      css={{
        '& i, & em': { fontStyle: 'italic' },
        '& b, & strong': { fontWeight: 'bold' },
        '& u': { textDecoration: 'underline' },
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeSubtitleHtml(currentText) }}
    />
  )
}
