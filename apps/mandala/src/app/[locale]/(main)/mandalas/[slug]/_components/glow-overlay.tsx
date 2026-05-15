'use client'

import { Box } from '@chakra-ui/react'

interface GlowOverlayProps {
  /** Включено ли свечение */
  enabled: boolean
  /** Цвет свечения */
  color?: string
  /** Интенсивность свечения (0-100) */
  intensity?: number
  /** Интенсивность пульсации от аудио (0-1) — модулирует яркость свечения */
  pulseIntensity?: number
}

/**
 * Свечение — мягкий ореол вокруг центра экрана.
 * Создаёт эффект внутреннего свечения мандалы.
 */
export function GlowOverlay({ enabled, color = '#8B5CF6', intensity = 50, pulseIntensity = 0 }: GlowOverlayProps) {
  if (!enabled) {
    return null
  }

  // Преобразуем интенсивность (0-100) в размер свечения и прозрачность
  const glowSize = 30 + (intensity / 100) * 40 // 30-70%
  const baseOpacity = 0.2 + (intensity / 100) * 0.4 // 0.2-0.6

  // Модулируем прозрачность на основе аудио-пульсации (+50% на пике баса)
  const effectiveOpacity = baseOpacity * (1 + pulseIntensity * 0.5)

  // Добавляем прозрачность к цвету
  const colorWithAlpha = `${color}${Math.round(effectiveOpacity * 255)
    .toString(16)
    .padStart(2, '0')}`

  return (
    <Box
      position="absolute"
      inset={0}
      bg={`radial-gradient(circle at center, ${colorWithAlpha} 0%, transparent ${glowSize}%)`}
      pointerEvents="none"
      zIndex={2}
      transition="opacity 0.3s ease-in-out"
      mixBlendMode="screen"
    />
  )
}
