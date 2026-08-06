'use client'

import { useCallback, useMemo } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Цвета для эффектов
 */
const EFFECT_COLORS = [
  '#ffd96b',
  '#00baff',
  '#043eff',
  '#ff1897',
  '#e7ff00',
  '#00ffa9',
  '#20ff1d',
  '#FFFFFF',
  '#ff1d18',
  '#00bbff',
  '#00ff02',
  '#eec6ff',
  '#64ffff',
]

type AnimatedRadialGradientProps = UseCanvasEffectProps

/**
 * Радиальный градиент — пульсирующие цветовые кольца.
 * Эффект расходящихся волн от центра.
 */
export function AnimatedRadialGradient(props: AnimatedRadialGradientProps) {
  const { gradientDuration = 4200 } = props

  const durationMs = useMemo(() => gradientDuration, [gradientDuration])

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
      const center = size.width / 2 // size.width === size.height для centered mode
      const timeMs = time * 1000

      const millisecondNow = timeMs % durationMs
      const percent = (100 / durationMs) * millisecondNow
      const allStepsCount = Math.floor(timeMs / durationMs) + 1
      const colorsCount = EFFECT_COLORS.length
      const step = (allStepsCount % colorsCount) + 1
      const startIndex = step === 1 ? colorsCount - 1 : step - 1
      const startColor = EFFECT_COLORS[startIndex]
      const endIndex = step === colorsCount ? 0 : step
      const endColor = EFFECT_COLORS[endIndex]

      ctx.clearRect(0, 0, size.width, size.height)

      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)

      gradient.addColorStop(0, endColor)
      gradient.addColorStop(percent > 50 ? ((percent - 50) * 2) / 100 : 0, endColor)
      gradient.addColorStop(percent < 50 ? (percent / 100) * 2 : 1, startColor)
      gradient.addColorStop(1, startColor)

      ctx.beginPath()
      ctx.arc(center, center, center, 0, 2 * Math.PI, false)
      ctx.fillStyle = gradient
      ctx.fill()
    },
    [durationMs],
  )

  const { canvasRef, size, canvasStyle } = useCanvasEffect(props, {
    sizeMode: 'centered',
    renderFrame,
  })

  if (size.width === 0) {
    return null
  }

  return <canvas ref={canvasRef} width={size.width} height={size.height} style={canvasStyle} />
}
