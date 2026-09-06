import { defineSlotRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

/**
 * Menu slot recipe с тактильной обратной связью.
 * Глубина нажатия item — общая шкала @letar/ui (`pressScale.lg`).
 */
export const menuRecipe = defineSlotRecipe({
  slots: [
    'root',
    'trigger',
    'content',
    'item',
    'itemText',
    'itemCommand',
    'separator',
    'group',
    'groupLabel',
    'indicator',
    'itemIndicator',
  ],
  base: {
    item: {
      // Базовые стили для всех Menu.Item
      transition: 'background 0.15s ease-out',
      cursor: 'pointer',
      _hover: {
        bg: 'bg.subtle',
      },
      // Отключаем hover для disabled элементов
      _disabled: {
        cursor: 'not-allowed',
        opacity: 0.5,
        _hover: {
          bg: 'transparent',
        },
      },
    },
  },
  variants: {
    variant: {
      subtle: {
        item: {
          _active: {
            bg: 'bg.muted',
            transform: pressScale.lg,
          },
        },
      },
    },
  },
})
