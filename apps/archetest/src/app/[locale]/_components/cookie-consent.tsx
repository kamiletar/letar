'use client'

import { getPathname } from '@/i18n/navigation'
import { Box } from '@chakra-ui/react'
import { CookieBanner } from '@letar/ui'
import { useLocale } from 'next-intl'

/** Cookie-баннер Archetest — обёртка над shared @letar/ui CookieBanner, учитывает текущую локаль */
export function CookieConsent() {
  const locale = useLocale()
  const privacyUrl = getPathname({ href: '/privacy', locale })

  // data-print-hide: баннер fixed-позиции иначе печатается поверх результатов (7.6)
  return (
    <Box data-print-hide="">
      <CookieBanner
        appKey="archetest"
        privacyUrl={privacyUrl}
        analyticsLabel="Аналитика (Umami)"
        marketingLabel="Маркетинг (ретаргетинг)"
      />
    </Box>
  )
}
