'use client'

import { useCallback } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Цвета северного сияния
 */
const AURORA_COLORS = [
  '#00ff88', // Зелёный
  '#00ffcc', // Бирюзовый
  '#00ccff', // Голубой
  '#0088ff', // Синий
  '#8800ff', // Фиолетовый
  '#ff00ff', // Маджента
  '#00ff88', // Возврат к зелёному
]

type AnimatedAuroraProps = UseCanvasEffectProps

/**
 * Aurora — эффект северного сияния.
 * Волнистые горизонтальные полосы цвета, движущиеся вверх.
 */
export function AnimatedAurora(props: AnimatedAuroraProps) {
  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
    // Очищаем canvas
    ctx.clearRect(0, 0, size.width, size.height)

    // Рисуем волнистые полосы
    const bandCount = 6
    const bandHeight = size.height / 3

    for (let i = 0; i < bandCount; i++) {
      const colorIndex = i % (AURORA_COLORS.length - 1)
      const nextColorIndex = (colorIndex + 1) % (AURORA_COLORS.length - 1)

      // Базовая позиция Y с движением вверх
      const baseY = size.height - (i * bandHeight) / 2 - ((time * 30) % size.height)

      // Создаём путь с волнами
      ctx.beginPath()
      ctx.moveTo(0, size.height)

      for (let x = 0; x <= size.width; x += 10) {
        // Волнистое смещение по Y
        const waveOffset = Math.sin((x / size.width) * Math.PI * 3 + time * 0.5 + i) * 50
          + Math.sin((x / size.width) * Math.PI * 5 + time * 0.8 + i * 2) * 30

        const y = baseY + waveOffset
        ctx.lineTo(x, y)
      }

      ctx.lineTo(size.width, size.height)
      ctx.closePath()

      // Градиент для полосы
      const gradient = ctx.createLinearGradient(0, baseY - bandHeight, 0, baseY + bandHeight)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.3, AURORA_COLORS[colorIndex] + '80')
      gradient.addColorStop(0.5, AURORA_COLORS[nextColorIndex] + 'cc')
      gradient.addColorStop(0.7, AURORA_COLORS[colorIndex] + '80')
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.fill()
    }
  }, [])

  const { canvasRef, size, canvasStyle } = useCanvasEffect(props, {
    sizeMode: 'fullscreen',
    renderFrame,
  })

  if (size.width === 0) {
    return null
  }

  return <canvas ref={canvasRef} width={size.width} height={size.height} style={canvasStyle} />
}
