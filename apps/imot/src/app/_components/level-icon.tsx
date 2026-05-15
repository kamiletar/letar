'use client'

import type { ImotLevel } from '@/lib/theme'
import { imotColors, imotEmojis, imotIcons } from '@/lib/theme'
import { Box, Icon } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface LevelIconProps {
  /**
   * Тип уровня диагностики
   */
  level: ImotLevel

  /**
   * Размер иконки
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'

  /**
   * Вариант отображения: иконка или emoji
   */
  variant?: 'icon' | 'emoji'

  /**
   * Показывать ли анимацию при наведении
   */
  animated?: boolean

  /**
   * Кастомная иконка (переопределяет стандартную)
   */
  customIcon?: ReactNode
}

/**
 * Размеры иконок
 */
const iconSizes = {
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
}

/**
 * Иконка уровня диагностики ИМОТ с цветовой схемой и анимациями
 */
export function LevelIcon({ level, size = 'md', variant = 'icon', animated = true, customIcon }: LevelIconProps) {
  const levelConfig = imotColors[level]
  const LevelIconComponent = imotIcons[level]

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={levelConfig.primary}
      fontSize={iconSizes[size]}
      transition="all 0.3s ease"
      {...(animated && {
        _hover: {
          transform: 'scale(1.2) rotate(5deg)',
          filter: 'brightness(1.2)',
        },
      })}
    >
      {customIcon ? (
        customIcon
      ) : variant === 'emoji' ? (
        <span style={{ fontSize: iconSizes[size] }}>{imotEmojis[level]}</span>
      ) : (
        <Icon fontSize={iconSizes[size]}>
          <LevelIconComponent />
        </Icon>
      )}
    </Box>
  )
}
