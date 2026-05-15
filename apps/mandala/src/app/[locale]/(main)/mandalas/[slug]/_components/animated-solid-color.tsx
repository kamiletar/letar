'use client'

import { useCallback, useMemo } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Цвета для сплошного эффекта (как на главной странице)
 */
const SOLID_COLORS = [
  '#00bbff', // Светло-голубой
  '#05b2ff',
  '#043dff', // Синий
  '#ff1797', // Розовый
  '#e7ff00', // Жёлтый
  '#00ffaa', // Бирюзовый
  '#21ff1b', // Зелёный
  '#ffffff', // Белый
  '#ea5a51', // Красный
  '#00bbff', // Возврат к началу
]

type AnimatedSolidColorProps = UseCanvasEffectProps

/**
 * Линейная интерполяция между двумя цветами
 */
function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)

  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)

  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)

  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Компонент сплошного анимированного цвета.
 * Альтернатива AnimatedRadialGradient — вместо градиента заливает весь экран одним цветом,
 * который плавно меняется.
 */
export function AnimatedSolidColor(props: AnimatedSolidColorProps) {
  const { gradientDuration = 22000 } = props // Как на главной странице

  const durationMs = useMemo(() => gradientDuration, [gradientDuration])

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
      const colorsCount = SOLID_COLORS.length - 1 // -1 т.к. последний = первому
      const timeMs = time * 1000

      // Вычисляем прогресс (0-1) в рамках полного цикла
      const progress = (timeMs % durationMs) / durationMs

      // Определяем между какими цветами находимся
      const totalProgress = progress * colorsCount
      const colorIndex = Math.floor(totalProgress)
      const localProgress = totalProgress - colorIndex

      const startColor = SOLID_COLORS[colorIndex]
      const endColor = SOLID_COLORS[colorIndex + 1] || SOLID_COLORS[0]

      // Интерполируем цвет
      const currentColor = lerpColor(startColor, endColor, localProgress)

      // Заливаем весь canvas
      ctx.fillStyle = currentColor
      ctx.fillRect(0, 0, size.width, size.height)
    },
    [durationMs]
  )

  const { canvasRef, size, canvasStyle } = useCanvasEffect(props, {
    sizeMode: 'fullscreen',
    renderFrame,
  })

  if (size.width === 0) {
    return null
  }

  return <canvas ref={canvasRef} width={size.width} height={size.height} style={canvasStyle} />
}
