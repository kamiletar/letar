'use client'

import { Box, Text } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { useCallback, useEffect, useRef } from 'react'
import { formatTime } from './format-time'

interface AudioWaveformProps {
  /** Массив пиков из useAudioPeaks — null, пока файл не декодирован */
  peaks: Float32Array | null
  /** Прогресс воспроизведения 0..1 */
  progress: number
  /** X-координата курсора в px относительно контейнера — null, если курсор не наведён */
  hoverX: number | null
  /** Время под курсором в секундах — null, если курсор не наведён */
  hoverTime: number | null
}

/**
 * Waveform-пики поверх seekbar: сыгранная часть — зелёным, оставшаяся — серым.
 * Чисто презентационный компонент — pointer events намеренно отключены (`pointerEvents="none"`),
 * чтобы клики/драг проходили сквозь него к нативному `<input type="range">` под ним; hover-позицию
 * вычисляет родитель по bubbling-событиям самого input и передаёт сюда пропами.
 */
export function AudioWaveform({ peaks, progress, hoverX, hoverTime }: AudioWaveformProps) {
  const { resolvedColorMode } = useColorMode()
  const isLight = resolvedColorMode === 'light'
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.clearRect(0, 0, w, h)

    const playedColor = isLight ? '#047857' : '#00FF41'
    const unplayedColor = isLight ? '#d1d5db' : '#4b5563'
    const barWidth = w / peaks.length
    const progressX = w * progress

    for (let i = 0; i < peaks.length; i++) {
      const amplitude = Math.max(peaks[i], 0.03)
      const barHeight = Math.max(amplitude * h, 2)
      const x = i * barWidth
      const y = (h - barHeight) / 2
      ctx.fillStyle = x < progressX ? playedColor : unplayedColor
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight)
    }
  }, [peaks, progress, isLight])

  useEffect(() => {
    draw()
  }, [draw])

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
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
        draw()
      }
    })

    resizeObserver.observe(canvas.parentElement || canvas)
    return () => resizeObserver.disconnect()
  }, [draw])

  return (
    <Box position="absolute" inset={0} pointerEvents="none">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {hoverX !== null && hoverTime !== null && (
        <Text
          position="absolute"
          bottom="100%"
          left={`${hoverX}px`}
          transform="translateX(-50%)"
          mb={1}
          fontSize="xs"
          fontFamily="mono"
          bg="bg"
          color="fg"
          borderWidth="1px"
          borderColor="border"
          borderRadius="sm"
          px={1}
          whiteSpace="nowrap"
        >
          {formatTime(hoverTime)}
        </Text>
      )}
    </Box>
  )
}
