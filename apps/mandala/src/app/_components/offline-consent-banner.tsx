'use client'

import { OfflineConsentBanner as SharedOfflineConsentBanner } from '@letar/ui'
import { useTranslations } from 'next-intl'

/**
 * Тонкая обёртка над `@letar/ui` OfflineConsentBanner — переводит тексты через next-intl,
 * сама UI-логика баннера вынесена в общую библиотеку (см. `.claude/docs/ui-components.md`).
 */
export function OfflineConsentBanner() {
  const t = useTranslations('offlineBanner')

  return (
    <SharedOfflineConsentBanner
      consentKey="mandala-offline-consent"
      title={t('title')}
      description={t('subtitle')}
      features={[t('worksOffline'), t('mandalaCount'), t('meditationMusic'), t('fullscreenView')]}
      closeLabel={t('close')}
      notNowLabel={t('notNow')}
      enableLabel={t('enableOffline')}
    />
  )
}
