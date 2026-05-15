'use client'

import { RECIPES } from '@/app/_components/matrix-rain'
import { Box } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { useCallback, useEffect, useRef } from 'react'

interface AudioSpectrumVisualizerProps {
  /** Ссылка на audio элемент */
  audioRef: React.RefObject<HTMLAudioElement | null>
  /** Воспроизводится ли аудио */
  isPlaying: boolean
  /** Получить общий AnalyserNode */
  getAnalyzer: () => AnalyserNode | null
  /** Размер шрифта символов (определяет и ширину столбца) */
  fontSize?: number
  /** Прозрачность trail-эффекта (меньше = длиннее след) */
  fadeOpacity?: number
}

/**
 * Canvas-визуализатор спектра аудио в стиле Matrix rain.
 *
 * Количество столбцов динамическое — `columns = Math.floor(width / fontSize)`,
 * точно как Matrix rain на главной. Каждый столбец показывает символ из
 * случайного рецепта, позиция Y определяется амплитудой соответствующей частоты.
 */
export function AudioSpectrumVisualizer({
  audioRef,
  isPlaying,
  getAnalyzer,
  fontSize = 16,
  fadeOpacity = 0.05,
}: AudioSpectrumVisualizerProps) {
  const { resolvedColorMode } = useColorMode()
  const isLight = resolvedColorMode === 'light'

  // Цвета зависят от темы: тёмно-зелёный на белом, яркий на чёрном
  const color = isLight ? '#047857' : '#00FF41'
  const bgRgb = isLight ? '255, 255, 255' : '0, 0, 0'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  /** Индекс рецепта для каждого столбца */
  const columnRecipeRef = useRef<number[]>([])
  /** Позиция внутри текста рецепта для каждого столбца */
  const columnCharIdxRef = useRef<number[]>([])

  /** Инициализация столбцов — каждому назначается случайный рецепт (как на главной) */
  const initColumns = useCallback((columns: number) => {
    columnRecipeRef.current = Array.from({ length: columns }, () => Math.floor(Math.random() * RECIPES.length))
    columnCharIdxRef.current = Array.from({ length: columns }, () => Math.floor(Math.random() * 100))
  }, [])

  /** Рендер спектра — один символ за кадр на каждый столбец, trail-эффект */
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

    // Размеры canvas (в CSS-пикселях, без dpr)
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    // Динамическое количество столбцов — как на главной
    const columns = Math.floor(w / fontSize)

    // Trail-эффект — как на главной: медленное затухание
    ctx.fillStyle = `rgba(${bgRgb}, ${fadeOpacity})`
    ctx.fillRect(0, 0, w, h)

    // Настройки текста
    ctx.fillStyle = color
    ctx.font = `${fontSize}px monospace`

    // Инициализация столбцов при первом рендере или при изменении ширины
    if (columnRecipeRef.current.length !== columns) {
      initColumns(columns)
    }

    for (let i = 0; i < columns; i++) {
      // Маппинг столбца на частотный bin (75% спектра — басы и средние)
      const binIndex = Math.floor((i / columns) * bufferLength * 0.75)
      const value = dataArray[binIndex] / 255

      // Пропускаем тишину
      if (value < 0.02) {
        continue
      }

      // Позиция символа определяется амплитудой:
      // value=1 → вверху canvas, value=0 → внизу
      const targetY = h - value * (h - fontSize)

      // Берём следующий символ из рецепта (как на главной)
      const recipe = RECIPES[columnRecipeRef.current[i]]
      const charIdx = columnCharIdxRef.current[i] % recipe.length
      const char = recipe[charIdx]
      columnCharIdxRef.current[i]++

      // Позиция X — ширина столбца = fontSize (как на главной)
      const x = i * fontSize

      ctx.fillText(char, x, targetY)
    }

    animationFrameRef.current = requestAnimationFrame(draw)
  }, [color, fontSize, fadeOpacity, bgRgb, initColumns, getAnalyzer])

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

        // Пересчёт столбцов при resize
        const columns = Math.floor(width / fontSize)
        initColumns(columns)
      }
    })

    resizeObserver.observe(canvas.parentElement || canvas)

    return () => resizeObserver.disconnect()
  }, [fontSize, initColumns])

  /** Очистка canvas при смене темы */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const fillColor = isLight ? 'white' : 'black'
      ctx.fillStyle = fillColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [isLight])

  /** Очистка при размонтировании */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <Box position="absolute" inset={0} zIndex={0} bg={{ base: 'white', _dark: 'black' }} overflow="hidden">
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
