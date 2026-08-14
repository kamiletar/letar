'use client'

import { Box } from '@chakra-ui/react'
import { createConsentConfig } from './consent-types'

export interface CookieSettingsButtonProps {
  /** Ключ приложения — должен совпадать с appKey в CookieBanner */
  appKey: string
  /** Тёмный футер: `fg.muted` даёт недостаточный контраст на тёмном фоне (WCAG AA) */
  inverted?: boolean
}

/** Кнопка для повторного открытия баннера cookie-согласий из футера */
export function CookieSettingsButton({ appKey, inverted = false }: CookieSettingsButtonProps) {
  const config = createConsentConfig(appKey)

  function handleClick() {
    window.dispatchEvent(new Event(config.openSettingsEvent))
  }

  return (
    <Box
      fontSize="sm"
      color={inverted ? 'whiteAlpha.700' : 'fg.muted'}
      _hover={{ color: inverted ? 'white' : 'brand.solid' }}
      cursor="pointer"
      textAlign="left"
      asChild
    >
      <button type="button" onClick={handleClick}>
        Настройки cookie
      </button>
    </Box>
  )
}
