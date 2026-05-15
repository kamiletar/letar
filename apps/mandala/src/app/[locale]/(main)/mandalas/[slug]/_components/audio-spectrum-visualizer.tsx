'use client'

import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

interface AudioSpectrumVisualizerProps {
  /** Ссылка на audio элемент */
  audioElement: HTMLAudioElement | null
  /** Показывать ли визуализатор */
  visible?: boolean
  /** Цвет спектра (CSS color) */
  color?: string
  /** Интенсивность (0-100) */
  intensity?: number
  /** Количество лучей */
  bars?: number
  /** Минимальная высота луча (в % от радиуса) */
  minBarHeight?: number
  /** Максимальная высота луча (в % от радиуса) */
  maxBarHeight?: number
  /** Радиус внутреннего круга (в % от размера) */
  innerRadiusPercent?: number
  /** Режим отображения */
  mode?: 'radial' | 'circular'
}

/**
 * Радиальный Canvas-визуализатор аудио спектра.
 * - 64 "луча" от центра мандалы
 * - Высота = амплитуда частоты
 * - Плавные анимации через requestAnimationFrame
 */
export function AudioSpectrumVisualizer({
  audioElement,
  visible = true,
  color = '#8B5CF6',
  intensity = 50,
  bars = 64,
  minBarHeight = 2,
  maxBarHeight = 30,
  innerRadiusPercent = 52,
  mode = 'radial',
}: AudioSpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const connectedElementRef = useRef<HTMLAudioElement | null>(null)

  /**
   * Инициализация Web Audio API
   */
  const initAudio = useCallback(() => {
    if (!audioElement || connectedElementRef.current === audioElement) {
      return
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current
      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = bars * 4 // Больше точек для лучшего анализа
      analyzer.smoothingTimeConstant = 0.8
      analyzerRef.current = analyzer

      const source = ctx.createMediaElementSource(audioElement)
      source.connect(analyzer)
      analyzer.connect(ctx.destination)
      sourceRef.current = source
      connectedElementRef.current = audioElement
    } catch {
      // Элемент уже подключен к другому AudioContext — это нормально
    }
  }, [audioElement, bars])

  /**
   * Рендер спектра
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const analyzer = analyzerRef.current
    if (!canvas || !analyzer || !visible) {
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

    // Размеры canvas
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const innerRadius = (Math.min(width, height) / 2) * (innerRadiusPercent / 100)
    const maxRadius = Math.min(width, height) / 2

    // Очистка
    ctx.clearRect(0, 0, width, height)

    // Рисуем лучи
    const angleStep = (2 * Math.PI) / bars
    const intensityMultiplier = intensity / 50 // 1.0 при intensity=50

    for (let i = 0; i < bars; i++) {
      // Берём данные из соответствующего бина
      const binIndex = Math.floor((i / bars) * bufferLength * 0.75) // Используем 75% спектра (басы/средние)
      const value = dataArray[binIndex] / 255

      // Высота луча
      const barHeightPercent = minBarHeight + value * (maxBarHeight - minBarHeight) * intensityMultiplier
      const barHeight = (maxRadius - innerRadius) * (barHeightPercent / 100)

      // Угол (начинаем сверху)
      const angle = i * angleStep - Math.PI / 2

      // Координаты начала и конца луча
      const x1 = centerX + Math.cos(angle) * innerRadius
      const y1 = centerY + Math.sin(angle) * innerRadius
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight)
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight)

      // Градиент для луча
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      gradient.addColorStop(0, `${color}00`) // Прозрачный у центра
      gradient.addColorStop(0.3, `${color}40`)
      gradient.addColorStop(1, color)

      // Рисуем луч
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = gradient
      ctx.lineWidth = mode === 'radial' ? 2 : Math.max(1, (2 * Math.PI * innerRadius) / bars - 1)
      ctx.lineCap = 'round'
      ctx.stroke()

      // Свечение на кончике (для высоких значений)
      if (value > 0.6) {
        ctx.beginPath()
        ctx.arc(x2, y2, 2 + value * 2, 0, 2 * Math.PI)
        ctx.fillStyle = `${color}${Math.floor(value * 200)
          .toString(16)
          .padStart(2, '0')}`
        ctx.fill()
      }
    }

    // Следующий кадр
    animationFrameRef.current = requestAnimationFrame(draw)
  }, [visible, color, intensity, bars, minBarHeight, maxBarHeight, innerRadiusPercent, mode])

  /**
   * Инициализация и запуск анимации
   */
  useEffect(() => {
    if (!visible || !audioElement) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    initAudio()

    // Возобновляем AudioContext если был приостановлен
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }

    // Запускаем анимацию
    animationFrameRef.current = requestAnimationFrame(draw)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [visible, audioElement, initAudio, draw])

  /**
   * Resize canvas при изменении размера контейнера
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        // Используем devicePixelRatio для чёткости на Retina
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
      }
    })

    resizeObserver.observe(canvas.parentElement || canvas)

    return () => resizeObserver.disconnect()
  }, [])

  /**
   * Очистка при размонтировании
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        // Не закрываем AudioContext — он может использоваться анализатором
      }
    }
  }, [])

  if (!visible) {
    return null
  }

  return (
    <Box position="absolute" top={0} left={0} width="100%" height="100%" pointerEvents="none" zIndex={5}>
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
