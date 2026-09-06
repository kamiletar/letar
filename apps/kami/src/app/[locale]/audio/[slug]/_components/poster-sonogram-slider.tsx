'use client'

import { Box, Image } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface PosterSonogramSliderProps {
  /** Путь к обложке (через /api/files/) */
  coverPath: string | null
  title: string
  /** Ссылка на audio элемент — читаем currentTime напрямую, без React state (60fps) */
  audioRef: React.RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  /** Длительность трека в секундах — из БД, уточняется через loadedmetadata */
  duration: number | null
  /** Столбцы офлайн-анализа всего трека (useOfflineSpectrogram) */
  staticColumns: Uint8Array[] | null
  lightMode?: boolean
  /** Высота блока в px — и высота контейнера, и сторона квадратной обложки */
  height?: number
}

/** Сколько пикселей трека на секунду при обычной длительности */
const PX_PER_SECOND = 100
/** Верхняя граница ширины canvas — иначе очень длинный трек даёт canvas в десятки тысяч px
 * (риск для GPU/памяти в части браузеров). Для длинных треков пиксель/секунда просто уменьшается. */
const MAX_TRACK_WIDTH = 12000

/**
 * Постер + сонограмма всего трека, слайдящиеся синхронно с воспроизведением (Фаза 9.5).
 *
 * Обложка и сонограмма стоят в ряд (`[cover][sonogram]`), общий блок сдвигается через
 * `translateX` так, чтобы точка трека, соответствующая `currentTime`, всегда была по центру
 * контейнера. При `currentTime = 0` эта точка — ровно граница между обложкой и сонограммой,
 * поэтому до старта воспроизведения обложка видна слева, а сонограмма начинается правее центра —
 * ровно как описано в плане, без отдельной ветки для «начального» состояния.
 *
 * Перемотка — drag прямо по сонограмме (pointer events, без нативного range-инпута).
 */
export function PosterSonogramSlider({
  coverPath,
  title,
  audioRef,
  isPlaying,
  duration,
  staticColumns,
  lightMode = false,
  height = 320,
}: PosterSonogramSliderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [effectiveDuration, setEffectiveDuration] = useState(duration ?? 0)

  // Уточняем длительность из самого audio-элемента, как только она известна
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setEffectiveDuration(audio.duration)
      }
    }
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => audio.removeEventListener('loadedmetadata', onLoadedMetadata)
  }, [audioRef])

  const pxPerSecond = effectiveDuration > 0
    ? Math.min(PX_PER_SECOND, MAX_TRACK_WIDTH / effectiveDuration)
    : PX_PER_SECOND
  const trackWidthPx = Math.max(Math.round(effectiveDuration * pxPerSecond), 1)
  const coverWidthPx = height

  /** Сдвигает трек так, чтобы currentTime оказался по центру контейнера */
  const updateTransform = useCallback(() => {
    const track = trackRef.current
    const audio = audioRef.current
    if (!track) {
      return
    }
    const currentTime = audio?.currentTime ?? 0
    const offsetPx = currentTime * pxPerSecond
    const translateX = containerWidth / 2 - coverWidthPx - offsetPx
    track.style.transform = `translateX(${translateX}px)`
  }, [audioRef, containerWidth, coverWidthPx, pxPerSecond])

  /** Рисует весь офлайн-анализ трека на всю ширину canvas (один раз на изменение данных) */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !staticColumns || staticColumns.length === 0) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    canvas.width = trackWidthPx * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.scale(dpr, dpr)

    ctx.fillStyle = lightMode ? '#f5f5f5' : 'black'
    ctx.fillRect(0, 0, trackWidthPx, height)

    const columnWidth = trackWidthPx / staticColumns.length
    for (let ci = 0; ci < staticColumns.length; ci++) {
      const bins = staticColumns[ci]
      const x = ci * columnWidth

      for (let i = 0; i < height; i++) {
        const freqIndex = Math.floor(((height - 1 - i) / height) * bins.length)
        const value = bins[freqIndex] / 255
        if (value > 0.01) {
          const drawR = lightMode ? 0 : 0
          const drawG = lightMode ? 140 : 255
          const drawB = lightMode ? 20 : 65
          const intensity = lightMode ? Math.min(value * 1.5, 1) : value * value
          ctx.fillStyle = `rgba(${drawR}, ${drawG}, ${drawB}, ${intensity})`
          ctx.fillRect(x, i, Math.max(columnWidth, 1), 1)
        }
      }
    }
  }, [staticColumns, trackWidthPx, height, lightMode])

  // Измеряем ширину контейнера
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    resizeObserver.observe(wrapper)
    return () => resizeObserver.disconnect()
  }, [])

  // Анимация сдвига — rAF, независимо от React state (иначе 60 ре-рендеров/сек)
  useEffect(() => {
    updateTransform()

    if (!isPlaying) {
      return
    }

    function loop() {
      updateTransform()
      animationFrameRef.current = requestAnimationFrame(loop)
    }
    animationFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateTransform])

  // Drag для перемотки прямо по слайдеру
  const dragState = useRef<{ startX: number; startTime: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || effectiveDuration <= 0) {
        return
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      dragState.current = { startX: e.clientX, startTime: audio.currentTime }
    },
    [audioRef, effectiveDuration],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current
      const audio = audioRef.current
      if (!drag || !audio) {
        return
      }
      const deltaX = e.clientX - drag.startX
      const newTime = Math.min(Math.max(drag.startTime - deltaX / pxPerSecond, 0), effectiveDuration)
      audio.currentTime = newTime
      updateTransform()
    },
    [audioRef, pxPerSecond, effectiveDuration, updateTransform],
  )

  const handlePointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  return (
    <Box
      ref={wrapperRef}
      position="relative"
      width="100%"
      height={`${height}px`}
      overflow="hidden"
      borderRadius="md"
      bg={{ base: 'gray.100', _dark: 'black' }}
      cursor="grab"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      touchAction="none"
    >
      {/* Трек: обложка + сонограмма в ряд, сдвигается через translateX */}
      <Box ref={trackRef} position="absolute" top={0} left={0} height="100%" display="flex" willChange="transform">
        <Box flexShrink={0} width={`${coverWidthPx}px`} height="100%">
          {coverPath && (
            <Image src={`/api/files/${coverPath}`} alt={title} width="100%" height="100%" objectFit="cover" />
          )}
        </Box>
        <Box flexShrink={0} width={`${trackWidthPx}px`} height="100%">
          <canvas ref={canvasRef} style={{ width: `${trackWidthPx}px`, height: '100%', display: 'block' }} />
        </Box>
      </Box>

      {/* Центральная линия — текущий момент воспроизведения */}
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left="50%"
        width="2px"
        transform="translateX(-50%)"
        bgGradient="to-b"
        gradientFrom="transparent"
        gradientVia={{ base: 'purple.500', _dark: 'green.400' }}
        gradientTo="transparent"
        pointerEvents="none"
        zIndex={1}
      />
    </Box>
  )
}
