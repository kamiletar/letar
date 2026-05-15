'use client'

import { Box } from '@chakra-ui/react'

interface VignetteOverlayProps {
  /** Включена ли виньетка */
  enabled: boolean
  /** Интенсивность затемнения (0-100) */
  intensity?: number
  /** Интенсивность пульсации от аудио (0-1) — модулирует затемнение */
  pulseIntensity?: number
}

/**
 * Виньетка — затемнение по краям экрана.
 * Создаёт эффект фокусировки на центре мандалы.
 */
export function VignetteOverlay({ enabled, intensity = 30, pulseIntensity = 0 }: VignetteOverlayProps) {
  if (!enabled) {
    return null
  }

  // Преобразуем интенсивность (0-100) в прозрачность (0-0.8)
  const baseOpacity = (intensity / 100) * 0.8

  // Модулируем прозрачность на основе аудио-пульсации (+30% на пике баса)
  const effectiveOpacity = baseOpacity * (1 + pulseIntensity * 0.3)

  return (
    <Box
      position="absolute"
      inset={0}
      bg={`radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, ${effectiveOpacity}) 100%)`}
      pointerEvents="none"
      zIndex={4}
      transition="opacity 0.3s ease-in-out"
    />
  )
}
