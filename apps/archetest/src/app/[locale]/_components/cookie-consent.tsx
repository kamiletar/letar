'use client'

import { getPathname } from '@/i18n/navigation'
import { CookieBanner } from '@letar/ui'
import { useLocale } from 'next-intl'

/** Cookie-баннер Archetest — обёртка над shared @letar/ui CookieBanner, учитывает текущую локаль */
export function CookieConsent() {
  const locale = useLocale()
  const privacyUrl = getPathname({ href: '/privacy', locale })

  return (
    <CookieBanner
      appKey="archetest"
      privacyUrl={privacyUrl}
      analyticsLabel="Аналитика (Umami)"
      marketingLabel="Маркетинг (ретаргетинг)"
    />
  )
}
