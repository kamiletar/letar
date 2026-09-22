import { defineRecipe } from '@chakra-ui/react'
import { pressScale } from '@letar/ui'

/**
 * Button recipe с тактильной обратной связью через :active стили
 *
 * Все кнопки имеют:
 * - transform: scale() при нажатии (размер зависит от size)
 * - Плавные переходы 0.15s ease-out
 * - Отключение эффекта для disabled состояния
 *
 * ⚠️ `xs`/`sm` — raw `scale(0.9)`, глубже самого мелкого шага `pressScale` (`2xs` = `scale(0.94)`).
 * Не переведено на шкалу: это не подпадает ни под одно из двух задокументированных исключений
 * JSDoc `pressScale` (не icon-поверхность, не рост), но и не совпадает с шагом шкалы — решение,
 * заводить ли третье исключение или это недосведённый hardcode, за владельцем.
 */
export const buttonRecipe = defineRecipe({
  base: {
    transition: 'all 0.15s ease-out',
    _active: {
      transform: pressScale.xs,
    },
    _disabled: {
      _active: {
        transform: 'none',
      },
    },
  },
  variants: {
    size: {
      xs: {
        _active: {
          transform: 'scale(0.9)',
        },
      },
      sm: {
        _active: {
          transform: 'scale(0.9)',
        },
      },
      md: {
        _active: {
          transform: pressScale.xs,
        },
      },
      lg: {
        _active: {
          transform: pressScale.md,
        },
      },
      xl: {
        _active: {
          transform: pressScale.lg,
        },
      },
    },
  },
})
