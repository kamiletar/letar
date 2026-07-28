'use client'

import { useEffect, useState } from 'react'
import { createConsentConfig, readConsentState } from './consent-types'

/**
 * Отслеживает согласие пользователя на аналитику (152-ФЗ, personal-data.md §5).
 * Читает состояние из localStorage при монтировании и реактивно обновляется
 * по событию `{appKey}:consent-change`, которое диспатчит `CookieBanner` при сохранении выбора.
 */
export function useAnalyticsConsent(appKey: string, policyVersion?: string): boolean {
  const { storageKey, consentChangeEvent } = createConsentConfig(appKey, policyVersion)
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    setHasConsent(readConsentState(storageKey)?.analytics === true)

    function onConsentChange(e: Event) {
      setHasConsent((e as CustomEvent<{ analytics: boolean }>).detail.analytics === true)
    }

    window.addEventListener(consentChangeEvent, onConsentChange)
    return () => window.removeEventListener(consentChangeEvent, onConsentChange)
  }, [storageKey, consentChangeEvent])

  return hasConsent
}
