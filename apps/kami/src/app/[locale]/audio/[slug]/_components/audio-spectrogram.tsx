'use client'

import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

interface AudioSpectrogramProps {
  /** Ссылка на audio элемент */
  audioRef: React.RefObject<HTMLAudioElement | null>
  /** Воспроизводится ли аудио */
  isPlaying: boolean
  /** Получить общий AnalyserNode */
  getAnalyzer: () => AnalyserNode | null
  /** Высота спектрограммы в px */
  height?: number
  /** Цвет (используется для градиента) */
  color?: string
  /** Светлая тема — рисовать тёмным по светлому */
  lightMode?: boolean
}

/**
 * Canvas-спектрограмма (сонограмма) в стиле foobar2000.
 *
 * Y = частота (снизу басы, сверху высокие)
 * X = время (скроллится справа налево)
 * Яркость = амплитуда частоты
 */
export function AudioSpectrogram({
  audioRef,
  isPlaying,
  getAnalyzer,
  height = 100,
  color = '#00FF41',
  lightMode = false,
}: AudioSpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Парсим hex цвет в RGB для градиента
  const colorRgb = useRef({ r: 0, g: 255, b: 65 })
  useEffect(() => {
    const hex = color.replace('#', '')
    colorRgb.current = {
      r: Number.parseInt(hex.substring(0, 2), 16),
      g: Number.parseInt(hex.substring(2, 4), 16),
      b: Number.parseInt(hex.substring(4, 6), 16),
    }
  }, [color])

  /** Рендер спектрограммы — сдвиг влево + новый столбец справа */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyzer = getAnalyzer()
    if (!canvas || !analyzer) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Получаем данные частот
    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyzer.getByteFrequencyData(dataArray)

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    // Сдвигаем весь canvas на 1px влево
    const imageData = ctx.getImageData(dpr, 0, canvas.width - dpr, canvas.height)
    ctx.putImageData(imageData, 0, 0)

    // Очищаем правый столбец — белый для светлой, чёрный для тёмной темы
    ctx.fillStyle = lightMode ? '#f5f5f5' : 'black'
    ctx.fillRect(w - 1, 0, 1, h)

    // Рисуем новый столбец справа — частоты снизу вверх
    const { r, g, b } = colorRgb.current
    // В светлой теме рисуем насыщенным тёмно-зелёным
    const drawR = lightMode ? 0 : r
    const drawG = lightMode ? 140 : g
    const drawB = lightMode ? 20 : b
    // Берём 75% спектра (басы + средние, убираем шум высоких)
    const usableBins = Math.floor(bufferLength * 0.75)

    for (let i = 0; i < h; i++) {
      // Y=0 (верх) → высокие частоты, Y=h (низ) → басы
      const freqIndex = Math.floor(((h - 1 - i) / h) * usableBins)
      const value = dataArray[freqIndex] / 255

      if (value > 0.01) {
        // Светлая тема — линейная яркость для видимости, тёмная — квадратичная
        const intensity = lightMode ? Math.min(value * 1.5, 1) : value * value
        ctx.fillStyle = `rgba(${drawR}, ${drawG}, ${drawB}, ${intensity})`
        ctx.fillRect(w - 1, i, 1, 1)
      }
    }

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [getAnalyzer, lightMode])

  /** Запуск/остановка анимации */
  useEffect(() => {
    if (!isPlaying || !audioRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, audioRef, draw])

  /** Resize canvas при изменении размера контейнера */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: h } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = h * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${h}px`
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
      }
    })

    resizeObserver.observe(canvas.parentElement || canvas)

    return () => resizeObserver.disconnect()
  }, [])

  /** Очистка при размонтировании */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <Box
      width="100%"
      height={`${height}px`}
      bg={{ base: 'gray.100', _dark: 'black' }}
      borderRadius="md"
      overflow="hidden"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  )
}
