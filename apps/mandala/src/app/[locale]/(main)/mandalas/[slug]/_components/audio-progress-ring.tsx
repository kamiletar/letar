'use client'

import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface AudioProgressRingProps {
  /** Ссылка на audio элемент */
  audioElement: HTMLAudioElement | null
  /** Интенсивность пульсации (0-1, от анализатора) */
  pulseIntensity?: number
  /** Радиус кольца в процентах от размера контейнера */
  radiusPercent?: number
  /** Толщина линии */
  strokeWidth?: number
  /** Цвет прогресса */
  progressColor?: string
  /** Цвет фона */
  backgroundColor?: string
  /** Показывать ли кольцо */
  visible?: boolean
  /** Включена ли пульсация */
  pulseEnabled?: boolean
}

/**
 * SVG-кольцо прогресса воспроизведения вокруг мандалы.
 * - Показывает текущую позицию трека
 * - Кликабельно для перемотки (seek)
 * - Пульсирует в такт музыке
 */
export function AudioProgressRing({
  audioElement,
  pulseIntensity = 0,
  radiusPercent = 48,
  strokeWidth = 3,
  progressColor = '#8B5CF6',
  backgroundColor = 'rgba(139, 92, 246, 0.2)',
  visible = true,
  pulseEnabled = true,
}: AudioProgressRingProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  // Refs для использования в document listeners (избегаем stale closure)
  const isDraggingRef = useRef(false)
  const progressRef = useRef(0)
  const durationRef = useRef(0)

  // Синхронизируем refs
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  /**
   * Обновление прогресса
   */
  useEffect(() => {
    if (!audioElement) {
      return
    }

    const handleTimeUpdate = () => {
      if (!isDragging && audioElement.duration) {
        setProgress(audioElement.currentTime / audioElement.duration)
      }
    }

    const handleDurationChange = () => {
      setDuration(audioElement.duration || 0)
    }

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration || 0)
    }

    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    audioElement.addEventListener('durationchange', handleDurationChange)
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Инициализация
    if (audioElement.duration) {
      setDuration(audioElement.duration)
      setProgress(audioElement.currentTime / audioElement.duration)
    }

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      audioElement.removeEventListener('durationchange', handleDurationChange)
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [audioElement, isDragging])

  /**
   * Вычисление позиции из события мыши/тача
   */
  const getProgressFromEvent = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current
    if (!svg) {
      return 0
    }

    const rect = svg.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Относительные координаты от центра
    const x = clientX - rect.left - centerX
    const y = clientY - rect.top - centerY

    // Угол в радианах (0 = верх, по часовой стрелке)
    let angle = Math.atan2(x, -y)
    if (angle < 0) {
      angle += 2 * Math.PI
    }

    return angle / (2 * Math.PI)
  }, [])

  /**
   * Seek к позиции
   */
  const seekTo = useCallback(
    (newProgress: number) => {
      if (audioElement && duration > 0) {
        audioElement.currentTime = newProgress * duration
        setProgress(newProgress)
      }
    },
    [audioElement, duration]
  )

  /**
   * Обработчик клика
   */
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const newProgress = getProgressFromEvent(event.clientX, event.clientY)
      seekTo(newProgress)
    },
    [getProgressFromEvent, seekTo]
  )

  /**
   * Обработчик mousedown
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      isDraggingRef.current = true
      setIsDragging(true)
      const newProgress = getProgressFromEvent(event.clientX, event.clientY)
      setProgress(newProgress)
    },
    [getProgressFromEvent]
  )

  /**
   * Глобальные обработчики для drag (используем refs для избежания stale closure)
   */
  useEffect(() => {
    const handleDocumentMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) {
        return
      }
      const svg = svgRef.current
      if (!svg) {
        return
      }

      const rect = svg.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const x = event.clientX - rect.left - centerX
      const y = event.clientY - rect.top - centerY

      let angle = Math.atan2(x, -y)
      if (angle < 0) {
        angle += 2 * Math.PI
      }
      const newProgress = angle / (2 * Math.PI)
      setProgress(newProgress)
    }

    const handleDocumentMouseUp = () => {
      if (!isDraggingRef.current) {
        return
      }
      // Seek к текущей позиции
      if (audioElement && durationRef.current > 0) {
        audioElement.currentTime = progressRef.current * durationRef.current
      }
      isDraggingRef.current = false
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove)
      document.removeEventListener('mouseup', handleDocumentMouseUp)
    }
  }, [audioElement])

  if (!visible || !audioElement) {
    return null
  }

  // SVG параметры
  const size = 100 // viewBox size
  const radius = (size * radiusPercent) / 100
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference * (1 - progress)

  // Пульсация: масштаб и интенсивность свечения
  const pulseScale = pulseEnabled ? 1 + pulseIntensity * 0.02 : 1
  const glowIntensity = pulseEnabled ? pulseIntensity * 10 : 0

  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      width="100%"
      height="100%"
      pointerEvents="none"
      zIndex={10}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="100%"
        style={{
          transform: `scale(${pulseScale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Фильтр для свечения */}
        <defs>
          <filter id="progress-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2 + glowIntensity} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Фоновое кольцо */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          opacity={0.5}
        />

        {/* Кольцо прогресса */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#progress-glow)"
          style={{
            transition: isDragging ? 'none' : 'stroke-dashoffset 0.1s linear',
          }}
        />

        {/* Индикатор текущей позиции */}
        <circle
          cx={size / 2 + radius * Math.sin(progress * 2 * Math.PI)}
          cy={size / 2 - radius * Math.cos(progress * 2 * Math.PI)}
          r={strokeWidth * 1.5}
          fill={progressColor}
          filter="url(#progress-glow)"
          style={{
            opacity: isDragging ? 1 : 0.8,
            transition: 'opacity 0.2s',
          }}
        />
      </svg>
    </Box>
  )
}
