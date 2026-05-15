'use client'

import { useCallback, useRef } from 'react'
import type { CanvasSize } from '../_hooks/use-canvas-effect'
import { useCanvasEffect, type UseCanvasEffectProps } from '../_hooks/use-canvas-effect'

/**
 * Палитра цветов для плазмы
 */
const PLASMA_PALETTE = [
  [0, 0, 0], // Чёрный
  [0, 0, 128], // Тёмно-синий
  [0, 0, 255], // Синий
  [0, 128, 255], // Голубой
  [0, 255, 255], // Циан
  [0, 255, 128], // Бирюзовый
  [0, 255, 0], // Зелёный
  [128, 255, 0], // Лайм
  [255, 255, 0], // Жёлтый
  [255, 128, 0], // Оранжевый
  [255, 0, 0], // Красный
  [255, 0, 128], // Розовый
  [255, 0, 255], // Маджента
  [128, 0, 255], // Фиолетовый
  [0, 0, 128], // Возврат к тёмно-синему
]

type AnimatedPlasmaProps = UseCanvasEffectProps

/**
 * Интерполяция цвета из палитры
 */
function getColor(value: number): [number, number, number] {
  // Нормализуем значение в диапазон 0-1
  const normalized = (Math.sin(value) + 1) / 2
  const index = normalized * (PLASMA_PALETTE.length - 1)
  const i = Math.floor(index)
  const t = index - i

  const c1 = PLASMA_PALETTE[i]
  const c2 = PLASMA_PALETTE[Math.min(i + 1, PLASMA_PALETTE.length - 1)]

  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

/**
 * Plasma — классический демосценовый эффект.
 * Комбинация синусоидальных волн создаёт гипнотический паттерн.
 */
export function AnimatedPlasma(props: AnimatedPlasmaProps) {
  const imageDataRef = useRef<ImageData | null>(null)

  const onInit = useCallback((ctx: CanvasRenderingContext2D, size: CanvasSize) => {
    imageDataRef.current = ctx.createImageData(size.width, size.height)
  }, [])

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number, size: CanvasSize) => {
    const imageData = imageDataRef.current
    if (!imageData) {
      return
    }
    const data = imageData.data

    // Масштаб паттерна
    const scale = 0.02

    // Заполняем каждый пиксель
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        // Классическая формула плазмы
        const v1 = Math.sin(x * scale + time)
        const v2 = Math.sin(y * scale + time * 0.5)
        const v3 = Math.sin((x + y) * scale + time * 0.7)
        const v4 = Math.sin(Math.sqrt(x * x + y * y) * scale * 0.5 + time * 1.2)

        const value = (v1 + v2 + v3 + v4) * 2

        const [r, g, b] = getColor(value)

        const i = (y * size.width + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [])

  const { canvasRef, size, canvasStyle } = useCanvasEffect(props, {
    sizeMode: 'scaled',
    scale: 0.25,
    onInit,
    renderFrame,
  })

  if (size.width === 0) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={size.width}
      height={size.height}
      style={{
        ...canvasStyle,
        imageRendering: 'pixelated', // Сглаживание при масштабировании
      }}
    />
  )
}
