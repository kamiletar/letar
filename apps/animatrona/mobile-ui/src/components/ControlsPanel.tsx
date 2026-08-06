/**
 * ControlsPanel — панель управления с slide-in анимацией
 *
 * Верхняя и нижняя панели с плавным появлением/скрытием.
 * Поддерживает Safe Area для notch/Dynamic Island.
 * Высокий z-index для работы в fullscreen режиме.
 */

import { Box } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface ControlsPanelProps {
  /** Позиция панели */
  position: 'top' | 'bottom'
  /** Видимость панели */
  visible: boolean
  /** Контент панели */
  children: ReactNode
}

export function ControlsPanel({ position, visible, children }: ControlsPanelProps) {
  const isTop = position === 'top'

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      {...(isTop ? { top: 0 } : { bottom: 0 })}
      // Safe Area поддержка
      pt={isTop ? 'env(safe-area-inset-top, 0px)' : undefined}
      pb={!isTop ? 'env(safe-area-inset-bottom, 0px)' : undefined}
      pl="env(safe-area-inset-left, 0px)"
      pr="env(safe-area-inset-right, 0px)"
      // Анимация
      transform={visible ? 'translateY(0)' : isTop ? 'translateY(-100%)' : 'translateY(100%)'}
      opacity={visible ? 1 : 0}
      transition="transform 0.3s ease-out, opacity 0.2s ease-out"
      pointerEvents={visible ? 'auto' : 'none'}
      // Градиентный фон с большей непрозрачностью
      bgGradient={isTop
        ? 'linear(to-b, black/80, black/40, transparent)'
        : 'linear(to-t, black/80, black/40, transparent)'}
      p={4}
      // Высокий z-index для fullscreen режима
      zIndex={9999}
    >
      {children}
    </Box>
  )
}
