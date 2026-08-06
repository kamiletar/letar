'use client'

import { useCallback, useMemo } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Цвета для конического градиента (цветовое колесо)
 */
const CONIC_COLORS = [
  '#ff0000', // Красный
  '#ff8800', // Оранжевый
  '#ffff00', // Жёлтый
  '#88ff00', // Лайм
  '#00ff00', // Зелёный
  '#00ff88', // Бирюзовый
  '#00ffff', // Циан
  '#0088ff', // Голубой
  '#0000ff', // Синий
  '#8800ff', // Фиолетовый
  '#ff00ff', // Маджента
  '#ff0088', // Розовый
  '#ff0000', // Возврат к красному
]

type AnimatedConicGradientProps = UseCanvasEffectProps

/**
 * Конический градиент — вращающееся цветовое колесо.
 * Красивый эффект для мандал — градиент идёт по кругу.
 */
export function AnimatedConicGradient(props: AnimatedConicGradientProps) {
  const { gradientDuration = 8000 } = props

  // Мемоизируем gradientDuration для использования в renderFrame
  const durationMs = useMemo(() => gradientDuration, [gradientDuration])

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
      const centerX = size.width / 2
      const centerY = size.height / 2

      // Угол вращения (0 - 2π)
      const timeMs = time * 1000
      const rotation = ((timeMs % durationMs) / durationMs) * Math.PI * 2

      // Создаём конический градиент с вращением
      const gradient = ctx.createConicGradient(rotation, centerX, centerY)

      // Добавляем цвета равномерно по кругу
      const colorCount = CONIC_COLORS.length - 1
      for (let i = 0; i < CONIC_COLORS.length; i++) {
        gradient.addColorStop(i / colorCount, CONIC_COLORS[i])
      }

      // Очищаем и заливаем
      ctx.clearRect(0, 0, size.width, size.height)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size.width, size.height)
    },
    [durationMs],
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
