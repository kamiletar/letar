/**
 * PlayerHeader — верхняя панель плеера
 *
 * Содержит:
 * - Левая часть: навигация (кнопка назад, название)
 * - Центр: информация об эпизоде
 * - Правая часть: выбор дорожек
 */

import { Box, HStack } from '@chakra-ui/react'

import type { ReactNode } from 'react'

export interface PlayerHeaderProps {
  /** Контент для левой части */
  headerLeft?: ReactNode
  /** Контент для центра */
  headerCenter?: ReactNode
  /** Контент для правой части */
  headerRight?: ReactNode
  /** Показывать панель */
  isVisible: boolean
}

/**
 * Компонент верхней панели плеера
 */
export function PlayerHeader({ headerLeft, headerCenter, headerRight, isVisible }: PlayerHeaderProps) {
  // Не рендерим если нет контента
  if (!headerLeft && !headerCenter && !headerRight) {
    return null
  }

  return (
    <HStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={10}
      p={4}
      bg="linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)"
      justify="space-between"
      opacity={isVisible ? 1 : 0}
      pointerEvents={isVisible ? 'auto' : 'none'}
      transition="opacity 0.3s"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Левая часть: навигация */}
      <Box>{headerLeft}</Box>

      {/* Центр: информация */}
      <Box>{headerCenter}</Box>

      {/* Правая часть: выбор дорожек */}
      <Box>{headerRight}</Box>
    </HStack>
  )
}
