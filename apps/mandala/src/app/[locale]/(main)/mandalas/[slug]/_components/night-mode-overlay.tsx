'use client'

import { Box } from '@chakra-ui/react'

interface NightModeOverlayProps {
  /** Включён ли ночной режим */
  enabled: boolean
  /** Уровень затемнения (0.0 - 1.0) */
  intensity?: number
}

/**
 * Оверлей ночного режима.
 * Приглушает цвета для комфортного просмотра в темноте.
 */
export function NightModeOverlay({ enabled, intensity = 0.3 }: NightModeOverlayProps) {
  if (!enabled) {
    return null
  }

  return (
    <Box
      position="absolute"
      inset={0}
      bg={`rgba(0, 0, 20, ${intensity})`}
      pointerEvents="none"
      zIndex={2}
      transition="opacity 0.5s ease-in-out"
    />
  )
}
