'use client'

import { IconButton } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { LuContrast } from 'react-icons/lu'

import { useHighContrast } from '@/app/_hooks/use-high-contrast'

/**
 * Кнопка переключения высококонтрастного режима (этап 5.4).
 * Для выставочного планшета: одним тапом усиливает контраст под ярким светом.
 */
export function HighContrastToggle() {
  const { enabled, toggle } = useHighContrast()
  const t = useTranslations('highContrast')
  const label = t('label')

  return (
    <IconButton
      aria-label={label}
      title={label}
      variant={enabled ? 'solid' : 'ghost'}
      colorPalette={enabled ? 'brand' : 'gray'}
      size="sm"
      aria-pressed={enabled}
      onClick={toggle}
    >
      <LuContrast />
    </IconButton>
  )
}
