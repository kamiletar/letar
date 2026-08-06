'use client'

import { useCallback, useMemo } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Цвета для колец тоннеля
 */
const TUNNEL_COLORS = ['#ff0088', '#8800ff', '#0088ff', '#00ff88', '#88ff00', '#ff8800', '#ff0088']

type AnimatedTunnelProps = UseCanvasEffectProps

/**
 * Tunnel — эффект полёта в тоннель.
 * Концентрические кольца, движущиеся к центру.
 */
export function AnimatedTunnel(props: AnimatedTunnelProps) {
  const { gradientDuration = 4000 } = props

  const durationMs = useMemo(() => gradientDuration, [gradientDuration])

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
      const centerX = size.width / 2
      const centerY = size.height / 2
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)

      const ringCount = 12
      const ringSpacing = maxRadius / ringCount

      const timeMs = time * 1000

      // Прогресс движения (0-1), кольца движутся к центру
      const progress = (timeMs % durationMs) / durationMs

      // Очищаем canvas
      ctx.clearRect(0, 0, size.width, size.height)

      // Рисуем кольца от внешнего к внутреннему
      for (let i = ringCount; i >= 0; i--) {
        // Радиус с учётом движения
        const baseRadius = i * ringSpacing
        const animatedRadius = baseRadius - progress * ringSpacing

        // Пропускаем кольца с отрицательным радиусом
        if (animatedRadius <= 0) {
          continue
        }

        const colorIndex = i % (TUNNEL_COLORS.length - 1)
        const color = TUNNEL_COLORS[colorIndex]

        // Толщина кольца уменьшается к центру
        const ringWidth = Math.max(2, (animatedRadius / maxRadius) * ringSpacing * 0.8)

        // Прозрачность увеличивается к центру
        const alpha = 0.3 + (1 - animatedRadius / maxRadius) * 0.5

        ctx.beginPath()
        ctx.arc(centerX, centerY, animatedRadius, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = ringWidth
        ctx.globalAlpha = alpha
        ctx.stroke()
      }

      // Центральное свечение
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.3)
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
      glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)')
      glowGradient.addColorStop(1, 'transparent')

      ctx.globalAlpha = 1
      ctx.fillStyle = glowGradient
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
